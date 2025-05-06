import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { imageProcessingService } from '../services/image-processing-service';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Ensure processed images directory exists
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
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Process the image using AI
    const processedImageBuffer = await imageProcessingService.processProfilePhoto(
      req.file.buffer,
      300, // Standard profile photo width
      300  // Standard profile photo height
    );

    // Generate a unique filename and save the processed image
    const filename = imageProcessingService.generateFilename(req.file.originalname);
    const processedDir = ensureProcessedDirExists();
    const filePath = path.join(processedDir, filename);
    
    fs.writeFileSync(filePath, processedImageBuffer);

    // Return the URL path to the processed image
    const imageUrl = `/uploads/processed/${filename}`;
    
    res.status(200).json({ 
      message: 'Profile photo processed successfully',
      imageUrl
    });
  } catch (error) {
    console.error('Error processing profile photo:', error);
    res.status(500).json({ message: 'Error processing profile photo' });
  }
});

/**
 * Enhanced processing for ID card photos (higher quality)
 */
router.post('/process-id-photo', upload.single('idPhoto'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Use higher quality AI enhancement for ID photos
    const processedImageBuffer = await imageProcessingService.applyAIEnhancement(req.file.buffer);

    // Generate a unique filename and save the processed image
    const filename = imageProcessingService.generateFilename(req.file.originalname);
    const processedDir = ensureProcessedDirExists();
    const filePath = path.join(processedDir, filename);
    
    fs.writeFileSync(filePath, processedImageBuffer);

    // Return the URL path to the processed image
    const imageUrl = `/uploads/processed/${filename}`;
    
    res.status(200).json({ 
      message: 'ID photo enhanced successfully',
      imageUrl
    });
  } catch (error) {
    console.error('Error enhancing ID photo:', error);
    res.status(500).json({ message: 'Error enhancing ID photo' });
  }
});

/**
 * Upscale low-resolution images
 */
router.post('/upscale-image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Upscale the low-resolution image
    const upscaledImageBuffer = await imageProcessingService.upscaleImage(req.file.buffer);

    // Generate a unique filename and save the processed image
    const filename = imageProcessingService.generateFilename(req.file.originalname);
    const processedDir = ensureProcessedDirExists();
    const filePath = path.join(processedDir, filename);
    
    fs.writeFileSync(filePath, upscaledImageBuffer);

    // Return the URL path to the processed image
    const imageUrl = `/uploads/processed/${filename}`;
    
    res.status(200).json({ 
      message: 'Image upscaled successfully',
      imageUrl
    });
  } catch (error) {
    console.error('Error upscaling image:', error);
    res.status(500).json({ message: 'Error upscaling image' });
  }
});

export default router;