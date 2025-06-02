import { createCanvas, loadImage, Canvas, registerFont, Image } from 'canvas';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import PDFDocument from 'pdfkit';
import { storage } from '../storage';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { User, UserProfile, IdCardTemplate } from '@shared/schema';
import { Readable } from 'stream';
import logger from '../utils/logger';

// Register custom fonts for better typography
try {
  const fs = require('fs');
  const path = require('path');
  const fontPath = path.resolve('./assets/fonts/Roboto-Regular.ttf');

  // Check if font file exists and is readable
  if (fs.existsSync(fontPath)) {
    const stats = fs.statSync(fontPath);
    if (stats.size > 0) {
      registerFont(fontPath, { family: 'Roboto' });
      logger.info('Custom font registered successfully');
    } else {
      throw new Error('Font file is empty');
    }
  } else {
    throw new Error('Font file not found');
  }
} catch (error) {
  logger.warn('Could not register custom fonts, using system defaults.', { error: error.message });
  // Continue without custom fonts - the service will use system defaults
}
try {
  registerFont('./assets/fonts/Roboto-Bold.ttf', { family: 'Roboto', weight: 'bold' });
  registerFont('./assets/fonts/Roboto-Italic.ttf', { family: 'Roboto', style: 'italic' });
} catch (error) {
  logger.warn('Could not register custom fonts, using system defaults.', { error: error instanceof Error ? error : new Error(String(error)) });
}

interface CardElement {
  type: 'text' | 'image' | 'qrcode' | 'barcode';
  x: number;
  y: number;
  width?: number;
  height?: number;
  value?: string;
  fieldName?: string;
  style?: Record<string, string | number>;
}

interface CardTemplate {
  background?: string;
  logo?: string;
  elements: CardElement[];
  dimensions: {
    width: number;
    height: number;
  };
}

interface SecurityFeatures {
  watermark?: string;
  hologram?: string;
  qrEncryption?: boolean;
  otherFeatures?: string[];
}

export class IdCardService {
  /**
   * Generate an ID card for a user
   */
  async generateIdCard(userId: number): Promise<Buffer> {
    try {
      // Fetch user data
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Fetch user profile data
      const profile = await storage.getUserProfile(userId);

      // Fetch active template
      const template = await storage.getActiveIdCardTemplate();
      if (!template) {
        throw new Error('No active ID card template found');
      }

      // Generate the ID card image
      const cardImage = await this.renderIdCard(user, profile, template);

      // Convert to PDF
      const pdfBuffer = await this.generatePDF(cardImage, template);

      return pdfBuffer;
    } catch (error) {
      logger.error('Error generating ID card', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      throw new Error('Failed to generate ID card');
    }
  }

  /**
   * Generate a default template if none exists
   */
  async createDefaultTemplate(): Promise<IdCardTemplate> {
    const existingTemplates = await storage.getAllIdCardTemplates();

    if (existingTemplates.length > 0) {
      return existingTemplates[0];
    }

    // Create a professional modern template 
    const defaultTemplate = {
      name: 'CAFFE Professional Observer ID Card',
      description: 'Advanced observer ID card template with premium design and security features',
      isActive: true,
      templateData: {
        dimensions: {
          width: 1024,
          height: 650
        },
        background: '', // Will be populated with gradient or image
        elements: [
          // Header with gradient text effect
          {
            type: 'text',
            x: 512,
            y: 70,
            value: 'OFFICIAL OBSERVER',
            style: {
              font: 'bold 54px Roboto',
              textAlign: 'center',
              fillStyle: '#4F46E5', // Modern indigo color
              shadowColor: 'rgba(79, 70, 229, 0.5)',
              shadowBlur: 10,
              shadowOffsetX: 2,
              shadowOffsetY: 2
            }
          },
          // Subheader
          {
            type: 'text',
            x: 512,
            y: 120,
            value: 'CITIZENS ACTION FOR FREE AND FAIR ELECTIONS',
            style: {
              font: 'bold 18px Roboto',
              textAlign: 'center',
              fillStyle: '#6D28D9' // Purple color
            }
          },
          // Election Date
          {
            type: 'text',
            x: 512,
            y: 150,
            value: 'GENERAL ELECTION - DECEMBER 2025',
            style: {
              font: '16px Roboto',
              textAlign: 'center',
              fillStyle: '#4B5563' // Gray color
            }
          },
          // Observer Name Label
          {
            type: 'text',
            x: 650,
            y: 200,
            value: 'OBSERVER NAME',
            style: {
              font: 'bold 14px Roboto',
              textAlign: 'left',
              fillStyle: '#6D28D9'
            }
          },
          // Observer Name Value (dynamic)
          {
            type: 'text',
            x: 650,
            y: 225,
            fieldName: 'fullName',
            style: {
              font: 'bold 22px Roboto',
              textAlign: 'left',
              fillStyle: '#1F2937'
            }
          },
          // Observer ID Label
          {
            type: 'text',
            x: 650,
            y: 265,
            value: 'ID NUMBER',
            style: {
              font: 'bold 14px Roboto',
              textAlign: 'left',
              fillStyle: '#6D28D9'
            }
          },
          // Observer ID Value (dynamic)
          {
            type: 'text',
            x: 650,
            y: 290,
            fieldName: 'observerId',
            style: {
              font: 'bold 22px Roboto',
              textAlign: 'left',
              fillStyle: '#1F2937'
            }
          },
          // Expiration Label
          {
            type: 'text',
            x: 650,
            y: 330,
            value: 'VALID UNTIL',
            style: {
              font: 'bold 14px Roboto',
              textAlign: 'left',
              fillStyle: '#6D28D9'
            }
          },
          // Expiration Date
          {
            type: 'text',
            x: 650,
            y: 355,
            value: 'December 31, 2025',
            style: {
              font: 'bold 20px Roboto',
              textAlign: 'left',
              fillStyle: '#1F2937'
            }
          },
          // Modern photo frame with shadow effect
          {
            type: 'text', // Using text to draw a frame
            x: 240,
            y: 225,
            value: '',
            style: {
              shadowColor: 'rgba(0, 0, 0, 0.3)',
              shadowBlur: 15,
              shadowOffsetX: 5,
              shadowOffsetY: 5
            }
          },
          // Observer Photo with rounded corners (placeholder)
          {
            type: 'image',
            x: 230,
            y: 200,
            width: 200,
            height: 250,
            fieldName: 'profilePhotoUrl'
          },
          // Observer Role Title with gradient background
          {
            type: 'text',
            x: 330,
            y: 480,
            value: 'CERTIFIED ELECTION OBSERVER',
            style: {
              font: 'bold 20px Roboto',
              textAlign: 'center',
              fillStyle: '#FFFFFF',
              backgroundColor: '#4F46E5',
              borderRadius: '10px',
              padding: '10px 20px'
            }
          },
          // Security hologram indicator
          {
            type: 'text',
            x: 330,
            y: 530,
            value: '✓ SECURITY HOLOGRAM',
            style: {
              font: 'bold 14px Roboto',
              textAlign: 'center',
              fillStyle: '#10B981' // Green color
            }
          },
          // Advanced QR code with observer data
          {
            type: 'qrcode',
            x: 830,
            y: 500,
            width: 150,
            height: 150,
            fieldName: 'qrData'
          },
          // Verification text
          {
            type: 'text',
            x: 830,
            y: 600,
            value: 'SCAN TO VERIFY',
            style: {
              font: 'bold 14px Roboto',
              textAlign: 'center',
              fillStyle: '#4B5563'
            }
          },
          // Barcode with observer ID
          {
            type: 'barcode',
            x: 750,
            y: 420,
            width: 220,
            height: 50,
            fieldName: 'observerId'
          },
          // Regional Office
          {
            type: 'text',
            x: 230,
            y: 560,
            value: 'ISSUED BY KINGSTON REGIONAL OFFICE',
            style: {
              font: '14px Roboto',
              textAlign: 'left',
              fillStyle: '#4B5563'
            }
          },
          // Contact info
          {
            type: 'text',
            x: 230,
            y: 585,
            value: 'TEL: 876-320-3603 | EMAIL: info@caffejamaica.com',
            style: {
              font: '14px Roboto',
              textAlign: 'left',
              fillStyle: '#4B5563'
            }
          },
          // Website
          {
            type: 'text',
            x: 230,
            y: 610,
            value: 'www.caffejamaica.com',
            style: {
              font: 'bold 14px Roboto',
              textAlign: 'left',
              fillStyle: '#4F46E5',
              textDecoration: 'underline'
            }
          },
          // Signature line
          {
            type: 'text',
            x: 512,
            y: 550,
            value: '_______________________________',
            style: {
              font: '16px Roboto',
              textAlign: 'center',
              fillStyle: '#000000'
            }
          },
          // Signature text
          {
            type: 'text',
            x: 512,
            y: 575,
            value: 'AUTHORIZED SIGNATURE',
            style: {
              font: 'bold 12px Roboto',
              textAlign: 'center',
              fillStyle: '#4B5563'
            }
          },
          // Official badge with glow effect
          {
            type: 'text',
            x: 880,
            y: 80,
            value: 'OFFICIAL',
            style: {
              font: 'bold 18px Roboto',
              textAlign: 'center',
              fillStyle: '#FFFFFF',
              backgroundColor: '#DC2626', // Red color
              borderRadius: '5px',
              padding: '5px 10px',
              shadowColor: 'rgba(220, 38, 38, 0.5)',
              shadowBlur: 15
            }
          }
        ]
      },
      securityFeatures: {
        watermark: 'CAFFE OFFICIAL',
        qrEncryption: true,
        otherFeatures: [
          'holographic overlay',
          'microprinting',
          'uv-reactive ink',
          'digital signature verification'
        ]
      }
    };

    return storage.createIdCardTemplate(defaultTemplate);
  }

  /**
   * Render an ID card based on a template and user data
   */
  private async renderIdCard(
    user: User, 
    profile: UserProfile | undefined, 
    template: IdCardTemplate
  ): Promise<Buffer> {
    const templateData = template.templateData as unknown as CardTemplate;
    const securityFeatures = template.securityFeatures as unknown as SecurityFeatures;

    // Create canvas with template dimensions
    const canvas = createCanvas(
      templateData.dimensions.width,
      templateData.dimensions.height
    );
    const ctx = canvas.getContext('2d');

    // Draw background if available
    if (templateData.background) {
      try {
        const backgroundImage = await loadImage(templateData.background);
        ctx.drawImage(
          backgroundImage, 
          0, 
          0, 
          templateData.dimensions.width, 
          templateData.dimensions.height
        );
      } catch (error) {
        // Use a gradient background if image fails to load
        const gradient = ctx.createLinearGradient(0, 0, templateData.dimensions.width, 0);
        gradient.addColorStop(0, '#6e2dc1');
        gradient.addColorStop(1, '#ffffff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, templateData.dimensions.width, templateData.dimensions.height);
      }
    } else {
      // Default background
      const gradient = ctx.createLinearGradient(0, 0, templateData.dimensions.width, 0);
      gradient.addColorStop(0, '#6e2dc1');
      gradient.addColorStop(1, '#ffffff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, templateData.dimensions.width, templateData.dimensions.height);
    }

    // Apply watermark if configured
    if (securityFeatures.watermark) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.font = '80px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.translate(templateData.dimensions.width / 2, templateData.dimensions.height / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(securityFeatures.watermark, 0, 0);
      ctx.restore();
    }

    // Draw logo if available
    if (templateData.logo) {
      try {
        const logoImage = await loadImage(templateData.logo);
        ctx.drawImage(logoImage, 50, 50, 180, 180);
      } catch (error) {
        logger.error('Error loading logo image for ID card template', { templateName: template.name, logoUrl: templateData.logo, error: error instanceof Error ? error : new Error(String(error)) });
      }
    }

    // Draw all elements from template
    for (const element of templateData.elements) {
      await this.drawElement(ctx, element, user, profile, canvas);
    }

    // Return the image as a buffer
    return canvas.toBuffer('image/png');
  }

  /**
   * Draw a single element on the ID card
   */
  private async drawElement(
    ctx: CanvasRenderingContext2D, 
    element: CardElement, 
    user: User, 
    profile: UserProfile | undefined,
    canvas: Canvas
  ): Promise<void> {
    // Get the value for this element (either static or from user data)
    const value = this.resolveFieldValue(element, user, profile);

    // Apply any custom styles
    if (element.style) {
      Object.entries(element.style).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          (ctx as any)[key] = value;
        }
      });
    }

    switch (element.type) {
      case 'text':
        // Set default text styles if not provided
        if (!element.style?.font) ctx.font = '16px Arial';
        if (!element.style?.fillStyle) ctx.fillStyle = '#000000';
        if (!element.style?.textAlign) {
          ctx.textAlign = 'left';
        } else {
          (ctx as any).textAlign = element.style.textAlign;
        }

        ctx.fillText(value || '', element.x, element.y);
        break;

      case 'image':
        try {
          if (value) {
            const image = await loadImage(value);
            ctx.drawImage(
              image, 
              element.x, 
              element.y, 
              element.width || 100, 
              element.height || 100
            );
          } else {
            // Draw a placeholder
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(
              element.x, 
              element.y, 
              element.width || 100, 
              element.height || 100
            );
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'center';
            ctx.font = '14px Arial';
            ctx.fillText(
              'Photo', 
              element.x + (element.width || 100) / 2, 
              element.y + (element.height || 100) / 2
            );
          }
        } catch (error) {
          logger.error('Error loading image for ID card element', { userId: user.id, fieldName: element.fieldName, imageUrl: value, error: error instanceof Error ? error : new Error(String(error)) });
          // Draw a placeholder
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(
            element.x, 
            element.y, 
            element.width || 100, 
            element.height || 100
          );
        }
        break;

      case 'qrcode':
        try {
          const qrSize = element.width || 150;
          const qrCodeUrl = await QRCode.toDataURL(value || 'No data', {
            width: qrSize,
            margin: 1
          });
          const qrImage = await loadImage(qrCodeUrl);
          ctx.drawImage(qrImage, element.x - qrSize/2, element.y - qrSize/2, qrSize, qrSize);
        } catch (error) {
          logger.error('Error generating QR code for ID card', { userId: user.id, qrData: value, error: error instanceof Error ? error : new Error(String(error)) });
        }
        break;

      case 'barcode':
        try {
          // Create a temporary canvas for the barcode
          const barcodeCanvas = createCanvas(
            element.width || 200, 
            element.height || 80
          );

          // Generate barcode
          JsBarcode(barcodeCanvas, value || 'N/A', {
            format: 'CODE128',
            width: 2,
            height: element.height ? element.height - 20 : 60,
            displayValue: true,
            fontSize: 14
          });

          // Draw on main canvas
          ctx.drawImage(
            barcodeCanvas, 
            element.x - (element.width || 200) / 2, 
            element.y - (element.height || 80) / 2, 
            element.width || 200, 
            element.height || 80
          );
        } catch (error) {
          logger.error('Error generating barcode for ID card', { userId: user.id, barcodeData: value, error: error instanceof Error ? error : new Error(String(error)) });
        }
        break;
    }
  }

  /**
   * Resolve the value for a field from user data
   */
  private resolveFieldValue(
    element: CardElement, 
    user: User, 
    profile: UserProfile | undefined
  ): string {
    // If there's a static value, use that
    if (element.value) {
      return element.value;
    }

    // If there's a field name to look up, get the value from user or profile
    if (element.fieldName) {
      if (element.fieldName === 'qrData') {
        // Special case: Generate QR data with user and profile info
        const qrData = {
          id: user.id,
          observerId: user.observerId,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
          timestamp: Date.now()
        };
        return JSON.stringify(qrData);
      }

      // Look for the field in user object
      if (element.fieldName in user) {
        return (user as any)[element.fieldName] || '';
      }

      // Look for the field in profile object if it exists
      if (profile && element.fieldName in profile) {
        return (profile as any)[element.fieldName] || '';
      }

      // Special case: full name
      if (element.fieldName === 'fullName') {
        return `${user.firstName} ${user.lastName}`;
      }
    }

    return '';
  }

  /**
   * Generate a PDF document from the ID card image
   */
  private async generatePDF(cardImage: Buffer, template: IdCardTemplate): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const templateData = template.templateData as unknown as CardTemplate;

        // Create a PDF document
        const doc = new PDFDocument({
          size: [templateData.dimensions.width, templateData.dimensions.height],
          margin: 0
        });

        // Buffer to store PDF data
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Add the card image
        doc.image(cardImage, 0, 0, {
          width: templateData.dimensions.width,
          height: templateData.dimensions.height
        });

        // Add metadata
        doc.info.Title = `Observer ID Card - ${template.name}`;
        doc.info.Author = 'CAFFE Election Observer Platform';

        // Add security features
        const securityFeatures = template.securityFeatures as unknown as SecurityFeatures;
        if (securityFeatures.otherFeatures && securityFeatures.otherFeatures.length > 0) {
          doc.info.Keywords = securityFeatures.otherFeatures.join(', ');
        }

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert a PDF buffer to a readable stream
   */
  bufferToStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  /**
   * Generate a SHA-256 hash for data verification
   */
  generateVerificationHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const idCardService = new IdCardService();
// Register fonts for PDF generation
try {
  const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
  if (fs.existsSync(fontsDir)) {
    const arialPath = path.join(fontsDir, 'Arial.ttf');
    const arialBoldPath = path.join(fontsDir, 'Arial-Bold.ttf');

    if (fs.existsSync(arialPath)) {
      registerFont(arialPath, { family: 'Arial' });
    }
    if (fs.existsSync(arialBoldPath)) {
      registerFont(arialBoldPath, { family: 'Arial-Bold' });
    }
  } else {
    console.info('[INFO] Fonts directory not found, using system default fonts');
  }
} catch (error) {
  console.warn('[WARN] Could not register custom fonts, using system defaults.', { error });
}