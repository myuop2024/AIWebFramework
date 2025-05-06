import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { imageProcessingService } from '../services/image-processing-service';

// Create router
const router = Router();

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Create temporary directory for original uploads
    const tempDir = path.join(uploadDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Create multer instance
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Only accept images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      return cb(error as any, false);
    }
    cb(null, true);
  }
});

// Helper function to ensure processed upload directory exists
function ensureProcessedDirExists() {
  const processedDir = path.join(__dirname, '../../uploads/processed');
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }
  return processedDir;
}

/**
 * Process profile photo endpoint
 * Accepts an image file, applies AI processing, and returns the processed image URL
 */
router.post('/process-profile-photo', upload.single('profilePhoto'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Get the uploaded file
    const originalFilePath = req.file.path;
    const originalFileBuffer = fs.readFileSync(originalFilePath);
    
    // Process the image using our AI service
    const processedImageBuffer = await imageProcessingService.processProfilePhoto(
      originalFileBuffer
    );
    
    // Save the processed image
    const processedDir = ensureProcessedDirExists();
    const processedFilename = imageProcessingService.generateFilename(req.file.originalname);
    const processedFilePath = path.join(processedDir, processedFilename);
    
    fs.writeFileSync(processedFilePath, processedImageBuffer);
    
    // Clean up the original file to save space
    fs.unlinkSync(originalFilePath);
    
    // Generate URL for client
    const processedFileUrl = `/uploads/processed/${processedFilename}`;
    
    // Return success response with the new image URL
    res.status(200).json({
      message: 'Profile photo processed successfully',
      originalSize: originalFileBuffer.length,
      processedSize: processedImageBuffer.length,
      reductionPercent: Math.round((1 - processedImageBuffer.length / originalFileBuffer.length) * 100),
      url: processedFileUrl
    });
  } catch (error) {
    console.error('Error processing profile photo:', error);
    res.status(500).json({ message: 'Error processing image', error: error.message });
  }
});

/**
 * Enhanced processing for ID card photos (higher quality)
 */
router.post('/process-id-photo', upload.single('idPhoto'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Get the uploaded file
    const originalFilePath = req.file.path;
    const originalFileBuffer = fs.readFileSync(originalFilePath);
    
    // First apply standard processing
    let processedImageBuffer = await imageProcessingService.processProfilePhoto(
      originalFileBuffer,
      300, // ID photo width
      400  // ID photo height
    );
    
    // Then apply AI enhancement for higher quality
    processedImageBuffer = await imageProcessingService.applyAIEnhancement(processedImageBuffer);
    
    // Save the processed image
    const processedDir = ensureProcessedDirExists();
    const processedFilename = imageProcessingService.generateFilename(req.file.originalname);
    const processedFilePath = path.join(processedDir, processedFilename);
    
    fs.writeFileSync(processedFilePath, processedImageBuffer);
    
    // Clean up the original file
    fs.unlinkSync(originalFilePath);
    
    // Generate URL for client
    const processedFileUrl = `/uploads/processed/${processedFilename}`;
    
    // Return success response
    res.status(200).json({
      message: 'ID photo processed successfully',
      url: processedFileUrl
    });
  } catch (error) {
    console.error('Error processing ID photo:', error);
    res.status(500).json({ message: 'Error processing image', error: error.message });
  }
});

/**
 * Upscale low-resolution images
 */
router.post('/upscale-image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Get the uploaded file
    const originalFilePath = req.file.path;
    const originalFileBuffer = fs.readFileSync(originalFilePath);
    
    // Apply AI upscaling
    const upscaledImageBuffer = await imageProcessingService.upscaleImage(originalFileBuffer);
    
    // Save the processed image
    const processedDir = ensureProcessedDirExists();
    const processedFilename = imageProcessingService.generateFilename(req.file.originalname);
    const processedFilePath = path.join(processedDir, processedFilename);
    
    fs.writeFileSync(processedFilePath, upscaledImageBuffer);
    
    // Clean up the original file
    fs.unlinkSync(originalFilePath);
    
    // Generate URL for client
    const processedFileUrl = `/uploads/processed/${processedFilename}`;
    
    // Return success response
    res.status(200).json({
      message: 'Image upscaled successfully',
      url: processedFileUrl
    });
  } catch (error) {
    console.error('Error upscaling image:', error);
    res.status(500).json({ message: 'Error processing image', error: error.message });
  }
});

export default router;