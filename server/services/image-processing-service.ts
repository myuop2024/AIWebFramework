import { HfInference } from '@huggingface/inference';
import { Canvas, Image, createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Initialize Hugging Face with API key
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Config for image processing
const IMAGE_CONFIG = {
  profilePhotoSize: {
    width: 400,
    height: 400
  },
  idCardPhotoSize: {
    width: 300,
    height: 400
  },
  quality: 0.9 // JPEG quality
};

// Models for AI image processing
const MODELS = {
  // Smart portrait cropping model - focuses on faces
  smartCropping: 'facebookresearch/detr-resnet-50',
  // Image enhancement model
  imageEnhancement: 'stabilityai/stable-diffusion-img2img',
  // Image upscaling for low-res images
  upscaling: 'nightmareai/real-esrgan'
};

/**
 * AI-powered image processing service for profile photos
 */
export class ImageProcessingService {
  /**
   * Process a profile photo using AI to crop, resize, and enhance
   * @param imageBuffer Original image buffer
   * @param targetWidth Target width
   * @param targetHeight Target height
   * @returns Processed image buffer
   */
  async processProfilePhoto(
    imageBuffer: Buffer,
    targetWidth = IMAGE_CONFIG.profilePhotoSize.width,
    targetHeight = IMAGE_CONFIG.profilePhotoSize.height
  ): Promise<Buffer> {
    try {
      // Load image
      const inputImage = await this.loadImage(imageBuffer);

      // Step 1: Detect faces to determine smart crop area
      const faceData = await this.detectFaces(imageBuffer);
      
      // Step 2: Crop image intelligently based on face detection
      const croppedCanvas = this.smartCropImage(inputImage, faceData, targetWidth, targetHeight);
      
      // Step 3: Apply basic enhancements (contrast, sharpness)
      const enhancedCanvas = await this.enhanceImage(croppedCanvas);
      
      // Convert to buffer and return
      return this.canvasToBuffer(enhancedCanvas, 'image/jpeg', IMAGE_CONFIG.quality);
    } catch (error) {
      console.error('Error processing profile photo:', error);
      // Fallback to basic resize if AI processing fails
      return this.basicResizeImage(imageBuffer, targetWidth, targetHeight);
    }
  }

  /**
   * Detect faces in an image using Hugging Face's object detection model
   */
  private async detectFaces(imageBuffer: Buffer): Promise<any> {
    try {
      // Convert buffer to base64 for the API
      const base64Image = imageBuffer.toString('base64');
      
      // Use object detection model to detect faces
      const result = await hf.objectDetection({
        data: Buffer.from(base64Image, 'base64'),
        model: MODELS.smartCropping,
      });
      
      // Filter results to only include face detections
      const faceDetections = result.filter(obj => 
        obj.label === 'person' && obj.score > 0.9
      );
      
      return faceDetections;
    } catch (error) {
      console.error('Face detection error:', error);
      // Return empty array to fall back to center crop
      return [];
    }
  }

  /**
   * Intelligently crop an image based on face detection
   */
  private smartCropImage(
    image: Image, 
    faceData: any[], 
    targetWidth: number, 
    targetHeight: number
  ): Canvas {
    const canvas = createCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    
    // Original image dimensions
    const { width: imgWidth, height: imgHeight } = image;
    
    // If no faces detected, fall back to center crop
    if (faceData.length === 0) {
      // Center crop logic
      const aspectRatio = targetWidth / targetHeight;
      const imgAspectRatio = imgWidth / imgHeight;
      
      let sw, sh, sx, sy;
      
      if (imgAspectRatio > aspectRatio) {
        // Image is wider than target aspect ratio, crop sides
        sh = imgHeight;
        sw = imgHeight * aspectRatio;
        sy = 0;
        sx = (imgWidth - sw) / 2;
      } else {
        // Image is taller than target aspect ratio, crop top/bottom
        sw = imgWidth;
        sh = imgWidth / aspectRatio;
        sx = 0;
        sy = (imgHeight - sh) / 2;
      }
      
      // Draw center-cropped image
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      return canvas;
    }
    
    // Get the bounding box of the detected face
    const face = faceData[0];
    let [x, y, boxWidth, boxHeight] = face.box;
    
    // Add padding around the face (50% on each side)
    const padX = boxWidth * 0.5;
    const padY = boxHeight * 0.75; // More padding for top/bottom
    
    x = Math.max(0, x - padX);
    y = Math.max(0, y - padY);
    boxWidth = Math.min(imgWidth - x, boxWidth + padX * 2);
    boxHeight = Math.min(imgHeight - y, boxHeight + padY * 2);
    
    // Adjust to maintain target aspect ratio
    const targetAspectRatio = targetWidth / targetHeight;
    const boxAspectRatio = boxWidth / boxHeight;
    
    if (boxAspectRatio > targetAspectRatio) {
      // Face box is wider than target aspect ratio
      const newBoxWidth = boxHeight * targetAspectRatio;
      x = x + (boxWidth - newBoxWidth) / 2;
      boxWidth = newBoxWidth;
    } else {
      // Face box is taller than target aspect ratio
      const newBoxHeight = boxWidth / targetAspectRatio;
      y = y + (boxHeight - newBoxHeight) / 2;
      boxHeight = newBoxHeight;
    }
    
    // Draw the cropped image
    ctx.drawImage(image, x, y, boxWidth, boxHeight, 0, 0, targetWidth, targetHeight);
    return canvas;
  }

  /**
   * Apply basic image enhancements
   */
  private async enhanceImage(canvas: Canvas): Promise<Canvas> {
    try {
      // For performance reasons, we use local enhancements instead of API for basic profiles
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simple contrast adjustment
      const factor = 1.1; // Contrast factor
      const intercept = 128 * (1 - factor);
      
      for (let i = 0; i < data.length; i += 4) {
        // Adjust RGB channels
        for (let j = 0; j < 3; j++) {
          data[i + j] = factor * data[i + j] + intercept;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      return canvas;
    } catch (error) {
      console.error('Error enhancing image:', error);
      return canvas; // Return original canvas on error
    }
  }

  /**
   * For high-quality processing, use AI enhancement (more resource intensive)
   * Use this for ID card photos or when quality is critical
   */
  async applyAIEnhancement(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Convert buffer to base64 for the API
      const base64Image = imageBuffer.toString('base64');
      
      // Call the image enhancement model
      const result = await hf.imageToImage({
        model: MODELS.imageEnhancement,
        inputs: Buffer.from(base64Image, 'base64'),
        parameters: {
          prompt: "a professional, clear, high-quality portrait photo with good lighting",
          negative_prompt: "blurry, dark, distorted, noisy",
          guidance_scale: 7.5
        }
      });
      
      // Convert result to buffer
      return Buffer.from(await result.arrayBuffer());
    } catch (error) {
      console.error('AI enhancement error:', error);
      // Return original image on error
      return imageBuffer;
    }
  }

  /**
   * Apply AI upscaling to low-resolution images
   */
  async upscaleImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Check if image is low-resolution and needs upscaling
      const image = await this.loadImage(imageBuffer);
      if (image.width >= 400 && image.height >= 400) {
        // Image is already high resolution
        return imageBuffer;
      }
      
      // Convert buffer to base64 for the API
      const base64Image = imageBuffer.toString('base64');
      
      // Call the upscaling model
      const result = await hf.imageToImage({
        model: MODELS.upscaling,
        inputs: Buffer.from(base64Image, 'base64'),
      });
      
      // Convert result to buffer
      return Buffer.from(await result.arrayBuffer());
    } catch (error) {
      console.error('Upscaling error:', error);
      // Return original image on error
      return imageBuffer;
    }
  }

  /**
   * Basic image resize as fallback when AI processing fails
   */
  private async basicResizeImage(
    imageBuffer: Buffer,
    targetWidth: number,
    targetHeight: number
  ): Promise<Buffer> {
    try {
      const image = await this.loadImage(imageBuffer);
      const canvas = createCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      
      // Calculate crop dimensions to preserve aspect ratio
      const aspectRatio = targetWidth / targetHeight;
      const imgAspectRatio = image.width / image.height;
      
      let sw, sh, sx, sy;
      
      if (imgAspectRatio > aspectRatio) {
        // Image is wider than target aspect ratio
        sh = image.height;
        sw = image.height * aspectRatio;
        sy = 0;
        sx = (image.width - sw) / 2;
      } else {
        // Image is taller than target aspect ratio
        sw = image.width;
        sh = image.width / aspectRatio;
        sx = 0;
        sy = (image.height - sh) / 2;
      }
      
      // Draw resized image
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      
      // Convert to buffer
      return this.canvasToBuffer(canvas, 'image/jpeg', IMAGE_CONFIG.quality);
    } catch (error) {
      console.error('Basic resize error:', error);
      // Return original image on error
      return imageBuffer;
    }
  }

  /**
   * Load image from buffer
   */
  private async loadImage(buffer: Buffer): Promise<Image> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = buffer;
    });
  }

  /**
   * Convert canvas to buffer
   */
  private canvasToBuffer(canvas: Canvas, mimeType = 'image/jpeg', quality = 0.9): Buffer {
    return canvas.toBuffer(mimeType, { quality });
  }

  /**
   * Generate a unique filename for the processed image
   */
  generateFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `processed_${timestamp}_${randomString}${ext}`;
  }
}

// Export singleton instance
export const imageProcessingService = new ImageProcessingService();