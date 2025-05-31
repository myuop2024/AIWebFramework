import { Router } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated } from '../middleware/auth';
import { encryptFields, decryptFields } from '../services/encryption-service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getKey } from '../services/encryption-service'; // Added getKey

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
    
    // Encrypt the file in place
    const plaintextBuffer = fs.readFileSync(req.file.path);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    const encryptedBuffer = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const ivString = iv.toString('hex') + ':' + authTag.toString('hex');
    fs.writeFileSync(req.file.path, encryptedBuffer);

    // Create the attachment record with encryption metadata
    const attachmentData = {
      reportId,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: encryptedBuffer.length, // Use encrypted size
      file_encryption_iv: ivString,
      is_file_encrypted: true,
      // ocrText, encryptionIv (for ocr), is_ocr_text_encrypted are not set here
    };

    const attachment = await storage.createReportAttachment(attachmentData);
    
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
    
    const attachmentsFromDb = await storage.getAttachmentsByReportId(reportId);
    // Decrypt ocrText if present
    const userRole = (req.user as any)?.role;
    const decryptedAttachments = attachmentsFromDb.map(att =>
      decryptFields(att, userRole, "encryptionIv", "is_ocr_text_encrypted")
    );
    res.status(200).json(decryptedAttachments);
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

    if (attachment.is_file_encrypted && attachment.file_encryption_iv) {
      try {
        const encryptedBuffer = fs.readFileSync(attachment.filePath);
        const [ivHex, authTagHex] = attachment.file_encryption_iv.split(':');

        if (!ivHex || !authTagHex) {
          throw new Error('Invalid stored IV format for file decryption.');
        }

        const ivBuffer = Buffer.from(ivHex, 'hex');
        const authTagBuffer = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), ivBuffer);
        decipher.setAuthTag(authTagBuffer);

        const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
        res.send(decryptedBuffer);
      } catch (decryptionError) {
        console.error('Error decrypting attachment file:', decryptionError);
        return res.status(500).json({ message: 'Failed to decrypt attachment file.' });
      }
    } else {
      // File is not encrypted or IV is missing, stream directly (legacy or error case)
      const fileStream = fs.createReadStream(attachment.filePath);
      fileStream.pipe(res);
    }
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
    let ocrUpdateData = {
      ocrProcessed: true,
      ocrText: 'Sample OCR text extracted from image. This would be actual extracted text in production.',
      // Ensure IV and flag fields are initialized if not already on the attachment object from DB
      encryptionIv: attachment.encryptionIv || null,
      is_ocr_text_encrypted: attachment.is_ocr_text_encrypted || false,
    };

    // Encrypt ocrText
    ocrUpdateData = encryptFields(
      ocrUpdateData,
      ["ocrText"],
      "encryptionIv", // Using existing encryptionIv field as per subtask note
      "is_ocr_text_encrypted"
    );

    const updatedAttachmentFromDb = await storage.updateReportAttachment(attachmentId, {
      ocrProcessed: ocrUpdateData.ocrProcessed,
      ocrText: ocrUpdateData.ocrText,
      encryptionIv: ocrUpdateData.encryptionIv, // Save the IV
      is_ocr_text_encrypted: ocrUpdateData.is_ocr_text_encrypted, // Save the flag
    });

    // Decrypt for response
    const decryptedAttachment = decryptFields(
      updatedAttachmentFromDb, (req.user as any)?.role, "encryptionIv", "is_ocr_text_encrypted"
    );
    
    res.status(200).json(decryptedAttachment);
  } catch (error: unknown) {
    console.error('Error processing OCR for attachment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to process OCR', error: errorMessage });
  }
});

export default router;