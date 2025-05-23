import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import { imageProcessingService } from '../services/image-processing-service';
import { storage as globalStorage } from '../storage';

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
  // In ESM modules, __dirname is not available, so use the current working directory
  const processedDir = path.join(process.cwd(), 'uploads/processed');
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }
  return processedDir;
}

/**
 * Process profile photo endpoint
 * Accepts an image file, applies AI processing, and returns the processed image URL
 * Optionally updates the user's profile with the processed image
 */
router.post('/process-profile-photo', upload.single('profilePhoto'), async (req: Request, res: Response) => {
  try {
    console.log('Profile photo upload requested');
    if (!req.file) {
      console.log('No file provided in upload request');
      return res.status(400).json({ message: 'No image file provided' });
    }

    console.log(`Received image upload. Original filename: ${req.file.originalname}, Size: ${req.file.size} bytes, Mime type: ${req.file.mimetype}`);

    if (!req.session.userId) {
      console.log('User not authenticated for photo upload');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`Processing profile photo for user ID: ${req.session.userId}`);

    let result;
    try {
      console.log('Starting AI image processing...');
      // Process the image using AI
      result = await imageProcessingService.processProfilePhoto(
        req.file.buffer,
        300, // Standard profile photo width
        300  // Standard profile photo height
      );
      console.log(`AI processing completed. Face detected: ${result.hasFace}, Message: ${result.message || 'No message'}`);
    } catch (aiError) {
      console.error('AI processing error, using original image:', aiError);
      // If AI processing fails, just use the original image
      result = {
        buffer: req.file.buffer,
        hasFace: false,
        message: "AI processing failed. Using original image."
      };
      console.log('Falling back to original image due to AI processing failure');
    }

    // Generate a unique filename and save the processed image
    const filename = imageProcessingService.generateFilename(req.file.originalname);
    const processedDir = ensureProcessedDirExists();
    const filePath = path.join(processedDir, filename);
    
    fs.writeFileSync(filePath, result.buffer);

    // Return the URL path to the processed image
    const imageUrl = `/uploads/processed/${filename}`;
    
    // Get system settings to check if we should automatically update the profile
    // or if admin approval is required for subsequent uploads
    // Use app.locals.storage if available, otherwise use the imported storage as fallback
    const storage = req.app.locals.storage || globalStorage;
    let autoUpdateProfile = true;
    
    try {
      // Check if the user is already verified
      const user = await storage.getUser(req.session.userId);
      
      console.log('Current user:', user);
      console.log('Verification status:', user?.verificationStatus);
      
      if (user && user.verificationStatus === 'verified') {
        // Get the setting for subsequent photo changes
        const photoPolicy = await storage.getSystemSetting('profile_photo_policy');
        
        console.log('User verification status:', user.verificationStatus);
        console.log('Photo policy setting:', photoPolicy);
        console.log('Photo policy value:', photoPolicy?.settingValue);
        console.log('Require approval flag:', photoPolicy?.settingValue?.requireApprovalAfterVerification);
        
        // If no policy exists or it doesn't require approval, we'll auto-update
        if (photoPolicy && photoPolicy.settingValue && photoPolicy.settingValue.requireApprovalAfterVerification) {
          console.log('Approval required for this profile photo');
          autoUpdateProfile = false;
          
          try {
            // Create a pending photo approval entry
            const photoApproval = await storage.createPhotoApproval({
              userId: req.session.userId,
              photoUrl: imageUrl,
              status: 'pending'
            });
            
            console.log(`Created pending photo approval for user ${req.session.userId}:`, photoApproval);
          } catch (approvalError) {
            console.error('Error creating photo approval entry:', approvalError);
          }
        } else {
          console.log('No approval required by policy, auto-updating profile');
        }
      }
      
      // If auto update is allowed, update the user's profile
      if (autoUpdateProfile) {
        // Check if user has a profile
        const profile = await storage.getUserProfile(req.session.userId);
        
        if (profile) {
          // Update existing profile
          await storage.updateUserProfile(req.session.userId, {
            profilePhotoUrl: imageUrl
          });
        } else {
          // Create new profile
          await storage.createUserProfile({
            userId: req.session.userId,
            profilePhotoUrl: imageUrl
          });
        }
      }
    } catch (dbError) {
      console.error('Database error when saving profile photo:', dbError);
      // Continue - we want to return the processed image even if saving fails
    }
    
    res.status(200).json({ 
      message: 'Profile photo processed successfully',
      imageUrl,
      hasFace: result.hasFace,
      warning: result.message,
      autoUpdated: autoUpdateProfile
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
    console.log('ID photo processing requested');
    if (!req.file) {
      console.log('No file provided in ID photo upload request');
      return res.status(400).json({ message: 'No image file provided' });
    }

    console.log(`Received ID photo upload. Original filename: ${req.file.originalname}, Size: ${req.file.size} bytes, Mime type: ${req.file.mimetype}`);
    
    if (!req.session.userId) {
      console.log('User not authenticated for ID photo upload');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    console.log(`Processing ID photo for user ID: ${req.session.userId}`);

    let processedImageBuffer;
    let message = 'ID photo enhanced successfully';
    
    try {
      console.log('Starting AI enhancement for ID photo...');
      // Use higher quality AI enhancement for ID photos
      processedImageBuffer = await imageProcessingService.applyAIEnhancement(req.file.buffer);
      console.log('AI enhancement for ID photo completed successfully');
    } catch (aiError) {
      console.error('AI enhancement error for ID photo, using original image:', aiError);
      // If AI processing fails, just use the original image with basic resizing
      console.log('Falling back to basic processing for ID photo');
      processedImageBuffer = await imageProcessingService.processProfilePhoto(
        req.file.buffer,
        400, // Larger size for ID photos
        600
      ).then(result => result.buffer);
      message = 'ID photo saved with basic processing';
      console.log('Basic processing for ID photo completed');
    }

    // Generate a unique filename and save the processed image
    const filename = imageProcessingService.generateFilename(req.file.originalname);
    const processedDir = ensureProcessedDirExists();
    const filePath = path.join(processedDir, filename);
    
    fs.writeFileSync(filePath, processedImageBuffer);

    // Return the URL path to the processed image
    const imageUrl = `/uploads/processed/${filename}`;
    
    res.status(200).json({ 
      message,
      imageUrl
    });
  } catch (error) {
    console.error('Error enhancing ID photo:', error);
    // Even if all processing fails, try to save the original
    try {
      // Generate a unique filename and save the original image
      const filename = imageProcessingService.generateFilename(req.file.originalname);
      const processedDir = ensureProcessedDirExists();
      const filePath = path.join(processedDir, filename);
      
      fs.writeFileSync(filePath, req.file.buffer);
      
      // Return the URL path to the original image
      const imageUrl = `/uploads/processed/${filename}`;
      
      res.status(200).json({ 
        message: 'Using original image due to processing error',
        imageUrl
      });
    } catch (saveError) {
      console.error('Error saving original ID photo:', saveError);
      res.status(500).json({ message: 'Error enhancing ID photo' });
    }
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

    let upscaledImageBuffer;
    let message = 'Image upscaled successfully';
    
    try {
      // Upscale the low-resolution image
      upscaledImageBuffer = await imageProcessingService.upscaleImage(req.file.buffer);
    } catch (aiError) {
      console.error('AI upscaling error, using simpler method:', aiError);
      // Fallback to basic upscaling
      const image = await imageProcessingService.loadImage(req.file.buffer);
      const canvas = createCanvas(image.width * 2, image.height * 2);
      const ctx = canvas.getContext('2d');
      
      // Simple 2x upscaling
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      
      upscaledImageBuffer = canvas.toBuffer('image/jpeg');
      message = 'Image upscaled using basic resizing';
    }

    // Generate a unique filename and save the processed image
    const filename = imageProcessingService.generateFilename(req.file.originalname);
    const processedDir = ensureProcessedDirExists();
    const filePath = path.join(processedDir, filename);
    
    fs.writeFileSync(filePath, upscaledImageBuffer);

    // Return the URL path to the processed image
    const imageUrl = `/uploads/processed/${filename}`;
    
    res.status(200).json({ 
      message,
      imageUrl
    });
  } catch (error) {
    console.error('Error upscaling image:', error);
    
    try {
      // Even if all fails, save the original
      const filename = imageProcessingService.generateFilename(req.file.originalname);
      const processedDir = ensureProcessedDirExists();
      const filePath = path.join(processedDir, filename);
      
      fs.writeFileSync(filePath, req.file.buffer);
      
      // Return the URL path to the original image
      const imageUrl = `/uploads/processed/${filename}`;
      
      res.status(200).json({ 
        message: 'Using original image (upscaling failed)',
        imageUrl
      });
    } catch (saveError) {
      console.error('Error saving original image:', saveError);
      res.status(500).json({ message: 'Error processing image' });
    }
  }
});

export default router;