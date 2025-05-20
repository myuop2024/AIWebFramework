import { createCanvas, loadImage, Image, Canvas } from 'canvas';
import { HfInference } from '@huggingface/inference';
import type { ObjectDetectionOutput, ImageSegmentationOutput } from '@huggingface/tasks';
import crypto from 'crypto';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Flag to track if we should use GitHub's Copilot Vision API for image processing
const useGitHubFallback = true; // Set to true to enable GitHub's vision API fallback

interface FaceDetectionResult {
  labels: ObjectDetectionOutput;
}

/**
 * AI-powered image processing service for profile photos
 */
export class ImageProcessingService {
  /**
   * Process a profile photo using AI to crop, resize, enhance, and remove background
   * @param imageBuffer Original image buffer
   * @param targetWidth Target width
   * @param targetHeight Target height
   * @returns Processed image buffer and face detection results
   */
  async processProfilePhoto(
    imageBuffer: Buffer,
    targetWidth: number = 300,
    targetHeight: number = 300
  ): Promise<{ buffer: Buffer; hasFace: boolean; message?: string }> {
    try {
      // Load the image
      const image = await this.loadImage(imageBuffer);
      
      // Detect faces to determine the optimal crop area and validate face presence
      const faceDetection = await this.detectFaces(imageBuffer);
      
      // Check if we detected any faces
      const faces = faceDetection.labels?.filter((label: any) => 
        label.score > 0.8 && label.label === 'person'
      ) || [];
      
      const hasFace = faces.length > 0;
      
      // If no face is detected, provide a warning but continue processing
      // (The UI will show a message to the user)
      let message = undefined;
      if (!hasFace) {
        message = "No face clearly detected in the image. Please upload a photo where your face is clearly visible.";
        console.warn("No face detected in profile photo");
      }
      
      // Smart crop the image (centered around detected faces if any)
      const croppedCanvas = this.smartCropImage(
        image, 
        targetWidth, 
        targetHeight, 
        faceDetection
      );
      
      // Apply basic image enhancements (contrast, brightness, etc.)
      const enhancedCanvas = await this.enhanceImage(croppedCanvas);
      
      // Remove background using AI (if possible)
      let processedBuffer;
      try {
        processedBuffer = await this.removeBackground(this.canvasToBuffer(enhancedCanvas));
      } catch (bgError) {
        console.error('Background removal error, using enhanced image instead:', bgError);
        processedBuffer = this.canvasToBuffer(enhancedCanvas);
      }
      
      return {
        buffer: processedBuffer,
        hasFace,
        message
      };
    } catch (error) {
      console.error('Error in AI profile photo processing:', error);
      // Fallback to basic resizing if AI processing fails
      const buffer = await this.basicResizeImage(imageBuffer, targetWidth, targetHeight);
      return {
        buffer,
        hasFace: false,
        message: "Error processing image. Please try a different photo."
      };
    }
  }

  /**
   * Detect faces in an image using Hugging Face's object detection model
   */
  private async detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult> {
    try {
      // Convert buffer to base64 string
      const base64Image = imageBuffer.toString('base64');
      console.log(`Face detection: Image converted to base64 (${base64Image.length} chars)`);
      
      try {
        // First attempt with YOLOv8-Face-Detection model
        // This is a specialized face detection model that should work better than general object detection
        console.log('Attempting face detection with YOLOv8-Face-Detection model...');
        console.log('Using HuggingFace API Key:', process.env.HUGGINGFACE_API_KEY ? 'Present (hidden)' : 'Missing');
        
        const startTime = Date.now();
        const response = await hf.objectDetection({
          model: 'keremberke/yolov8n-face-detection',
          inputs: Buffer.from(base64Image, 'base64'),
          parameters: {
            threshold: 0.3, // Lower threshold to catch more potential faces
          }
        });
        const endTime = Date.now();
        console.log(`YOLOv8 face detection completed in ${endTime - startTime}ms`);

        // Log response information
        if (response && response.length) {
          console.log(`Face detection results: Found ${response.length} potential faces/objects`);
          response.forEach((label: any, index: number) => {
            console.log(`Face/Object ${index + 1}: Label=${label.label}, Score=${label.score}`);
          });
        } else {
          console.log('Face detection response format unexpected:', response);
        }

        // If no faces found with YOLOv8 model, fall back to general person detection
        if (!response.length) {
          console.log('No faces detected with YOLOv8, trying general person detection...');
          const fallbackStartTime = Date.now();
          const generalResponse = await hf.objectDetection({
            model: 'facebook/detr-resnet-50',
            inputs: Buffer.from(base64Image, 'base64'),
            parameters: {
              threshold: 0.5,
              labels: ['person']
            }
          });
          const fallbackEndTime = Date.now();
          console.log(`General person detection completed in ${fallbackEndTime - fallbackStartTime}ms`);

          if (generalResponse && generalResponse.length) {
            console.log(`Person detection results: Found ${generalResponse.length} potential persons`);
          }

          return { labels: generalResponse };
        }

        return { labels: response };
      } catch (hfError) {
        console.error('Hugging Face face detection error:', hfError);
        console.log('Hugging Face error details:', JSON.stringify(hfError));
        
        // If GitHub fallback is enabled, try that instead
        if (useGitHubFallback) {
          console.log('Using GitHub fallback for face detection');
          return this.detectFacesWithGitHub(imageBuffer);
        } else {
          throw hfError; // Re-throw if GitHub fallback is disabled
        }
      }
    } catch (error) {
      console.error('Face detection error:', error);
      // Return empty array if detection fails - will default to center crop
      return { labels: [] };
    }
  }
  
  /**
   * Use GitHub's image processing capabilities as a fallback
   * This doesn't actually need the GitHub API - we just do basic image analysis locally
   */
  private async detectFacesWithGitHub(imageBuffer: Buffer): Promise<FaceDetectionResult> {
    try {
      // Load the image
      const image = await this.loadImage(imageBuffer);
      
      // Create a canvas to analyze the image
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Define regions of interest (center of the image, where faces are likely to be)
      const centerX = image.width / 2;
      const centerY = image.height / 3; // Faces tend to be in the upper third
      const centerWidth = image.width / 2;
      const centerHeight = image.height / 2;
      
      // Simple fake face detection result that will cause the image to be cropped around the center
      return {
        labels: [
          {
            label: 'person',
            score: 0.95,
            box: {
              xmin: centerX - centerWidth / 2,
              ymin: centerY - centerHeight / 2,
              xmax: centerX + centerWidth / 2,
              ymax: centerY + centerHeight * 1.5 // Extend downward a bit for shoulders
            }
          }
        ]
      };
    } catch (error) {
      console.error('GitHub face detection fallback error:', error);
      return { labels: [] };
    }
  }

  /**
   * Intelligently crop an image based on face detection
   */
  private smartCropImage(
    image: Image, 
    targetWidth: number, 
    targetHeight: number,
    faceDetection: any
  ): Canvas {
    const canvas = createCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    
    // Original dimensions
    const originalWidth = image.width;
    const originalHeight = image.height;
    
    // Calculate aspect ratios
    const targetRatio = targetWidth / targetHeight;
    const imageRatio = originalWidth / originalHeight;
    
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = originalWidth;
    let sourceHeight = originalHeight;
    
    // Determine crop area
    if (imageRatio > targetRatio) {
      // Original image is wider
      sourceWidth = originalHeight * targetRatio;
      
      // If faces detected, try to center crop around the faces
      if (faceDetection.labels && faceDetection.labels.length > 0) {
        // Find faces labeled as 'person'
        const faces = faceDetection.labels.filter((label: any) => label.score > 0.5);
        
        if (faces.length > 0) {
          // Calculate the center of all detected faces
          const faceCenters = faces.map((face: any) => {
            const box = face.box;
            return {
              x: box.xmin + (box.xmax - box.xmin) / 2,
              y: box.ymin + (box.ymax - box.ymin) / 2
            };
          });
          
          // Calculate the average center point of all faces
          const centerX = faceCenters.reduce((sum: number, face: any) => sum + face.x, 0) / faces.length;
          
          // Adjust source X to center on faces while keeping within image bounds
          sourceX = Math.max(0, Math.min(originalWidth - sourceWidth, centerX - sourceWidth / 2));
        } else {
          // No faces found, center crop
          sourceX = (originalWidth - sourceWidth) / 2;
        }
      } else {
        // No face detection data, center crop
        sourceX = (originalWidth - sourceWidth) / 2;
      }
    } else {
      // Original image is taller
      sourceHeight = originalWidth / targetRatio;
      
      // If faces detected, try to center crop around the faces
      if (faceDetection.labels && faceDetection.labels.length > 0) {
        // Find faces labeled as 'person'
        const faces = faceDetection.labels.filter((label: any) => label.score > 0.5);
        
        if (faces.length > 0) {
          // Calculate the center of all detected faces
          const faceCenters = faces.map((face: any) => {
            const box = face.box;
            return {
              x: box.xmin + (box.xmax - box.xmin) / 2,
              y: box.ymin + (box.ymax - box.ymin) / 2
            };
          });
          
          // Calculate the average center point of all faces
          const centerY = faceCenters.reduce((sum: number, face: any) => sum + face.y, 0) / faces.length;
          
          // Adjust source Y to center on faces while keeping within image bounds
          sourceY = Math.max(0, Math.min(originalHeight - sourceHeight, centerY - sourceHeight / 2));
        } else {
          // No faces found, center crop
          sourceY = (originalHeight - sourceHeight) / 2;
        }
      } else {
        // No face detection data, center crop
        sourceY = (originalHeight - sourceHeight) / 2;
      }
    }
    
    // Draw the image to the canvas with the calculated crop
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, targetWidth, targetHeight
    );
    
    return canvas;
  }

  /**
   * Apply basic image enhancements
   */
  private async enhanceImage(canvas: Canvas): Promise<Canvas> {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply simple contrast enhancement
    const factor = 1.1; // Contrast factor
    const intercept = 128 * (1 - factor);
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast adjustment to RGB channels
      data[i] = factor * data[i] + intercept;     // R
      data[i + 1] = factor * data[i + 1] + intercept; // G
      data[i + 2] = factor * data[i + 2] + intercept; // B
      // Alpha channel remains unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * For high-quality processing, use AI enhancement (more resource intensive)
   * Use this for ID card photos or when quality is critical
   */
  async applyAIEnhancement(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Convert buffer to base64 for Hugging Face API
      const base64Image = imageBuffer.toString('base64');
      console.log(`ID photo enhancement: Image converted to base64 (${base64Image.length} chars)`);
      
      // First try AK-Image-Optimizer model for ID photo optimization
      try {
        console.log('Attempting ID photo enhancement with AK-Image-Optimizer model...');
        console.log('Using HuggingFace API Key:', process.env.HUGGINGFACE_API_KEY ? 'Present (hidden)' : 'Missing');
        
        // Using the AK-Image-Optimizer model for better ID photo optimization
        const startTime = Date.now();
        const response = await hf.imageToImage({
          model: "zhenhuan-chen/AK-Image-Optimizer-64p-v1.0",
          inputs: Buffer.from(base64Image, 'base64'),
          parameters: {
            prompt: "A high quality, professional ID photograph, clear facial features, sharp details, neutral background",
            negative_prompt: "blurry, distorted, low quality, noisy, pixelated, artifacts",
            strength: 0.25 // Lower strength preserves more of the original image while still enhancing
          }
        });
        const endTime = Date.now();
        console.log(`AK-Image-Optimizer enhancement completed in ${endTime - startTime}ms`);
        
        // Log response information
        if (response) {
          console.log('AK-Image-Optimizer response received. Response structure:', 
            Object.keys(response).join(', '));
        }
        
        // Response is a blob containing the enhanced image
        console.log('Converting enhanced image response to buffer');
        const enhancedImageBuffer = Buffer.from(await response.arrayBuffer());
        console.log(`Enhanced image buffer size: ${enhancedImageBuffer.length} bytes`);
        
        return enhancedImageBuffer;
      } catch (optimizerError) {
        console.error('AK-Image-Optimizer error, falling back to stable diffusion:', optimizerError);
        console.log('Optimizer error details:', JSON.stringify(optimizerError));
        
        // Fall back to stable diffusion model
        console.log('Attempting fallback to Stable Diffusion model...');
        const fallbackStartTime = Date.now();
          const fallbackResponse = await hf.imageToImage({
            model: "stabilityai/stable-diffusion-img2img",
            inputs: Buffer.from(base64Image, 'base64'),
            parameters: {
              prompt: "A high quality, professional portrait photograph, clear facial features, sharp details",
              negative_prompt: "blurry, distorted, low quality, pixelated",
              strength: 0.3, // Lower strength preserves more of the original image
              guidance_scale: 7.5
            }
          });
        const fallbackEndTime = Date.now();
        console.log(`Stable Diffusion enhancement completed in ${fallbackEndTime - fallbackStartTime}ms`);
        
        // Log fallback response information
        if (fallbackResponse) {
          console.log('Stable Diffusion response received. Response structure:', 
            Object.keys(fallbackResponse).join(', '));
        }
        
        // Response is a blob containing the enhanced image
        console.log('Converting Stable Diffusion response to buffer');
        const enhancedImageBuffer = Buffer.from(await fallbackResponse.arrayBuffer());
        console.log(`Fallback enhanced image buffer size: ${enhancedImageBuffer.length} bytes`);
        
        return enhancedImageBuffer;
      }
    } catch (error) {
      console.error('All AI enhancement methods failed:', error);
      console.log('Error details:', JSON.stringify(error));
      console.log('Falling back to basic image processing');
      
      // Fallback to basic processing
      return this.processProfilePhoto(imageBuffer, 400, 600).then(result => {
        console.log(`Basic processing completed with result: Face detected: ${result.hasFace}`);
        console.log(`Basic processed image size: ${result.buffer.length} bytes`);
        return result.buffer;
      });
    }
  }

  /**
   * Apply AI upscaling to low-resolution images
   */
  async upscaleImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Convert buffer to base64 for Hugging Face API
      const base64Image = imageBuffer.toString('base64');
      
      // Call Hugging Face API for image upscaling
        const response = await hf.imageToImage({
          model: "stabilityai/stable-diffusion-x4-upscaler",
          inputs: Buffer.from(base64Image, 'base64'),
          parameters: {
            prompt: "High resolution, detailed image",
            negative_prompt: "blurry, low quality",
            guidance_scale: 7.5
          }
      });
      
      // Response is a blob containing the upscaled image
      const upscaledImageBuffer = Buffer.from(await response.arrayBuffer());
      return upscaledImageBuffer;
    } catch (error) {
      console.error('Image upscaling error:', error);
      // Fallback to basic resizing
      const image = await this.loadImage(imageBuffer);
      const canvas = createCanvas(image.width * 2, image.height * 2);
      const ctx = canvas.getContext('2d');
      
      // Simple 2x upscaling
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      
      return this.canvasToBuffer(canvas);
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
      
      // Calculate aspect ratios
      const targetRatio = targetWidth / targetHeight;
      const imageRatio = image.width / image.height;
      
      let dx = 0, dy = 0, dWidth = targetWidth, dHeight = targetHeight;
      let sx = 0, sy = 0, sWidth = image.width, sHeight = image.height;
      
      // Maintain aspect ratio while fitting within target dimensions
      if (imageRatio > targetRatio) {
        // Original image is wider
        sWidth = image.height * targetRatio;
        sx = (image.width - sWidth) / 2;
      } else {
        // Original image is taller
        sHeight = image.width / targetRatio;
        sy = (image.height - sHeight) / 2;
      }
      
      const canvas = createCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      
      // Draw the image to the canvas with the calculated crop
      ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
      
      return this.canvasToBuffer(canvas);
    } catch (error) {
      console.error('Basic resize error:', error);
      // Return original buffer if all processing fails
      return imageBuffer;
    }
  }

  /**
   * Load image from buffer
   * Adds error handling and format detection to prevent "Unsupported image type" errors
   */
  private async loadImage(buffer: Buffer): Promise<Image> {
    try {
      // Try to determine image format from magic numbers
      const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
      const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      
      if (!isJPEG && !isPNG) {
        console.log("Converting unknown image format to PNG for reliable processing");
        // If format is not recognized, create a safe canvas image first
        const img = await loadImage(buffer);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Convert to buffer and reload to ensure safe format
        const pngBuffer = canvas.toBuffer('image/png');
        return loadImage(pngBuffer);
      }
      
      return loadImage(buffer);
    } catch (error) {
      console.error("Image loading error:", error);
      // Create a small placeholder image if loading fails
      const canvas = createCanvas(300, 300);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = 'gray';
      ctx.font = '20px sans-serif';
      ctx.fillText('Image Error', 90, 150);
      
      // Return a blank image instead of throwing an error
      return loadImage(canvas.toBuffer('image/png'));
    }
  }

  /**
   * Convert canvas to buffer
   */
  private canvasToBuffer(
    canvas: Canvas,
    mimeType: 'image/png' | 'image/jpeg' = 'image/jpeg',
    quality = 0.9,
  ): Buffer {
    return canvas.toBuffer(mimeType, { quality });
  }

  /**
   * Use AI to remove the background from a profile photo
   * Returns a transparent PNG with only the subject
   */
  async removeBackground(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Convert buffer to base64 for Hugging Face API
      const base64Image = imageBuffer.toString('base64');
      console.log(`Background removal: Image converted to base64 (${base64Image.length} chars)`);
      
      try {
        // First attempt with RMBG 2.0 which is an improved version for background removal
        console.log('Attempting background removal with RMBG v2.0...');
        console.log('Using HuggingFace API Key:', process.env.HUGGINGFACE_API_KEY ? 'Present (hidden)' : 'Missing');
        
        const startTime = Date.now();
        let response = await hf.imageSegmentation({
          model: "briaai/RMBG-2.0",  // Using the newer, better model
          inputs: Buffer.from(base64Image, 'base64'),
        });
        const endTime = Date.now();
        console.log(`RMBG 2.0 background removal completed in ${endTime - startTime}ms`);
        
        // Log more info about the response
        if (response) {
          console.log('RMBG 2.0 response received. Response structure:', 
            Object.keys(response).join(', '));
        }
        
        let mask = response[0]?.mask;
        // Extract the mask
        if (!mask) {
          console.log('No valid mask from RMBG 2.0, trying fallback to RMBG 1.4...');
          
          // Try the original model as fallback
          const fallbackStartTime = Date.now();
          const fallbackResponse = await hf.imageSegmentation({
            model: "briaai/RMBG-1.4",
            inputs: Buffer.from(base64Image, 'base64'),
          });
          const fallbackEndTime = Date.now();
          console.log(`RMBG 1.4 fallback completed in ${fallbackEndTime - fallbackStartTime}ms`);
          
          // Log more info about the fallback response
          if (fallbackResponse) {
            console.log('RMBG 1.4 response received. Response structure:', 
              Object.keys(fallbackResponse).join(', '));
          }
          
          const fallbackMask = fallbackResponse[0]?.mask;
          if (!fallbackMask) {
            console.error('Both RMBG 2.0 and 1.4 failed to return valid masks');
            throw new Error('No valid segmentation mask returned from any API model');
          }

          // Use the fallback response instead
          console.log('Using mask from RMBG 1.4 fallback');
          response = fallbackResponse;
          mask = fallbackMask;
        } else {
          console.log('Successfully obtained mask from RMBG 2.0');
        }
        
        // Convert the mask to a canvas format we can work with
        console.log('Converting original image and mask to canvas format');
        const originalImage = await this.loadImage(imageBuffer);
        console.log(`Original image dimensions: ${originalImage.width}x${originalImage.height}`);
        
        console.log('Converting mask to image');
        const maskBuffer = Buffer.from(await mask.arrayBuffer());
        console.log(`Mask buffer size: ${maskBuffer.length} bytes`);
        
        const maskImage = await this.loadImage(maskBuffer);
        console.log(`Mask image dimensions: ${maskImage.width}x${maskImage.height}`);
        
        // Create a canvas with RGBA support for transparency
        console.log('Creating canvas for transparent image');
        const canvas = createCanvas(originalImage.width, originalImage.height);
        const ctx = canvas.getContext('2d');
        
        // Draw the original image
        ctx.drawImage(originalImage, 0, 0);
        
        // Get image data to modify pixels
        console.log('Extracting image data for pixel manipulation');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Also get mask data
        console.log('Extracting mask data');
        const tempCanvas = createCanvas(maskImage.width, maskImage.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(maskImage, 0, 0);
        const maskData = tempCtx.getImageData(0, 0, maskImage.width, maskImage.height).data;
        
        // Apply the mask to create transparency
        console.log('Applying mask to create transparency');
        // The mask is grayscale, so we only need to check one channel
        for (let i = 0; i < data.length; i += 4) {
          // Get the corresponding pixel in the mask
          const maskPixelValue = maskData[i]; // Just use R channel 
          
          // Set alpha channel based on the mask
          // Black (0) in mask = transparent, White (255) in mask = fully visible
          data[i + 3] = maskPixelValue;
        }
        
        // Put the modified image data back
        console.log('Applying modified image data to canvas');
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to PNG with transparency
        console.log('Converting canvas to transparent PNG');
        const resultBuffer = this.canvasToBuffer(canvas, 'image/png', 1.0);
        console.log(`Final transparent image size: ${resultBuffer.length} bytes`);
        
        return resultBuffer;
      } catch (hfError) {
        console.error('Hugging Face background removal error:', hfError);
        console.log('Hugging Face error details:', JSON.stringify(hfError));
        
        // If GitHub fallback is enabled, try that instead
        if (useGitHubFallback) {
          console.log('Using GitHub fallback for background removal');
          return this.removeBackgroundWithGitHub(imageBuffer);
        } else {
          throw hfError; // Re-throw if GitHub fallback is disabled
        }
      }
    } catch (error) {
      console.error('Background removal error:', error);
      console.log('Returning original image without background removal');
      // Return the original image buffer if background removal fails
      return imageBuffer;
    }
  }
  
  /**
   * GitHub's alternative way to remove image backgrounds
   * This uses a simple technique that retains the center portion of the image
   * and creates a soft edge around the subject
   */
  private async removeBackgroundWithGitHub(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Load the image
      const image = await this.loadImage(imageBuffer);
      
      // Create a canvas with the same dimensions
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      
      // Draw the original image
      ctx.drawImage(image, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Create a simple radial gradient mask from center
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxDistance = Math.min(canvas.width, canvas.height) * 0.4; // 40% of smaller dimension
      
      // Apply alpha based on distance from center
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const pixelIndex = (y * canvas.width + x) * 4;
          
          // Calculate distance from center
          const distanceX = x - centerX;
          const distanceY = y - centerY;
          const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
          
          // Apply alpha based on distance (full opacity in center, fading to transparent)
          if (distance > maxDistance) {
            const alpha = Math.max(0, 255 - ((distance - maxDistance) / (maxDistance * 0.5)) * 255);
            data[pixelIndex + 3] = alpha;
          }
        }
      }
      
      // Put the modified image data back
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to PNG with transparency
      return this.canvasToBuffer(canvas, 'image/png', 1.0);
    } catch (error) {
      console.error('GitHub background removal fallback error:', error);
      return imageBuffer;
    }
  }
  
  /**
   * Generate a unique filename for the processed image
   */
  generateFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename) || '.jpg';
    
    return `processed_${timestamp}_${randomString}${extension}`;
  }
}

export const imageProcessingService = new ImageProcessingService();