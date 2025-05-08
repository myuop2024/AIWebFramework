import { Router } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Configure multer for report attachment uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'reports');
      
      // Ensure the directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename to prevent overwrites
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `report-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept common image formats and documents
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, and Word documents are allowed.'));
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  }
});

const router = Router();

// Upload attachment for a report
router.post('/', ensureAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const reportId = parseInt(req.body.reportId);
    
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }
    
    // Get the report to ensure it exists and belongs to the user
    const report = await storage.getReport(reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    if (report.userId !== req.user!.id) {
      return res.status(403).json({ message: 'You do not have permission to add attachments to this report' });
    }
    
    // Create the attachment record
    const attachment = await storage.createReportAttachment({
      reportId,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
    });
    
    res.status(201).json(attachment);
  } catch (error: unknown) {
    console.error('Error uploading report attachment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to upload attachment', error: errorMessage });
  }
});

// Get all attachments for a report
router.get('/report/:reportId', ensureAuthenticated, async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }
    
    // Get the report to ensure it exists and belongs to the user
    const report = await storage.getReport(reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Allow admins to access any report's attachments
    if (report.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to view this report\'s attachments' });
    }
    
    const attachments = await storage.getAttachmentsByReportId(reportId);
    res.status(200).json(attachments);
  } catch (error: unknown) {
    console.error('Error fetching report attachments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to get attachments', error: errorMessage });
  }
});

// Delete an attachment
router.delete('/:attachmentId', ensureAuthenticated, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    
    if (isNaN(attachmentId)) {
      return res.status(400).json({ message: 'Invalid attachment ID' });
    }
    
    // Get the attachment to check permissions
    const attachment = await storage.getReportAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Get the report to check ownership
    const report = await storage.getReport(attachment.reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Associated report not found' });
    }
    
    // Allow admins to delete any attachment
    if (report.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete this attachment' });
    }
    
    // Delete the file from the filesystem
    try {
      fs.unlinkSync(attachment.filePath);
    } catch (fileError) {
      console.warn('Error deleting attachment file:', fileError);
      // Continue even if file deletion fails (might have been moved/deleted)
    }
    
    // Remove from database
    const success = await storage.deleteReportAttachment(attachmentId);
    
    if (success) {
      res.status(200).json({ message: 'Attachment deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete attachment from database' });
    }
  } catch (error: unknown) {
    console.error('Error deleting report attachment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to delete attachment', error: errorMessage });
  }
});

// Download an attachment
router.get('/:attachmentId', ensureAuthenticated, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    
    if (isNaN(attachmentId)) {
      return res.status(400).json({ message: 'Invalid attachment ID' });
    }
    
    // Get the attachment
    const attachment = await storage.getReportAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Get the report to check permissions
    const report = await storage.getReport(attachment.reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Associated report not found' });
    }
    
    // Allow admins to download any attachment
    if (report.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to access this attachment' });
    }
    
    // Check if file exists
    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ message: 'Attachment file not found on server' });
    }
    
    // Send the file
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.setHeader('Content-Type', attachment.fileType);
    
    const fileStream = fs.createReadStream(attachment.filePath);
    fileStream.pipe(res);
  } catch (error: unknown) {
    console.error('Error downloading report attachment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to download attachment', error: errorMessage });
  }
});

// Process OCR on an attachment
router.post('/:attachmentId/ocr', ensureAuthenticated, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    
    if (isNaN(attachmentId)) {
      return res.status(400).json({ message: 'Invalid attachment ID' });
    }
    
    // Get the attachment
    const attachment = await storage.getReportAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Check if this is an image file
    if (!attachment.fileType.startsWith('image/')) {
      return res.status(400).json({ message: 'OCR is only supported for image files' });
    }
    
    // In a real implementation, we would process the image with Tesseract.js or another OCR engine
    // For now, we'll simulate OCR by adding a placeholder value
    const updatedAttachment = await storage.updateReportAttachment(attachmentId, {
      ocrProcessed: true,
      ocrText: 'Sample OCR text extracted from image. This would be actual extracted text in production.'
    });
    
    res.status(200).json(updatedAttachment);
  } catch (error: unknown) {
    console.error('Error processing OCR for attachment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to process OCR', error: errorMessage });
  }
});

export default router;