import express, { Request, Response } from 'express';
import express, { Request, Response } from 'express'; // Ensure Request, Response are imported
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { documentAiService } from '../services/document-ai-service'; // Import the service
import { ensureAuthenticated } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads (memory storage for now)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit for documents
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain', // .txt
      'text/csv', // .csv
      // Potentially add more like 'application/msword' for .doc, 'application/vnd.ms-excel' for .xls etc.
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: PDF, DOCX, TXT, CSV.'));
    }
  }
});

// Ensure uploads/documents directory exists (similar to image-processing)
function ensureDocumentUploadsDirExists() {
  const documentsDir = path.join(process.cwd(), 'uploads/documents');
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }
  return documentsDir;
}

router.post('/process-document', ensureAuthenticated, upload.single('documentFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document file provided.' });
    }

    const aiFeatures = req.body.aiFeatures ? JSON.parse(req.body.aiFeatures) : {};
    // aiFeatures could be an object like: { summarize: true, sentiment: false, extractText: true }

    console.log(`Received document: ${req.file.originalname}, Size: ${req.file.size}, MimeType: ${req.file.mimetype}`);
    console.log(`AI features requested:`, aiFeatures);

    // Call the document AI service
    const result = await documentAiService.processDocument(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      aiFeatures
    );

    if (result.error) {
      // If the service returned a processing error (e.g., text extraction failed)
      return res.status(400).json({ message: "AI processing failed for the document.", details: result.error });
    }

    // Optionally save the original file if needed, or just use processed data.
    // For this example, we won't re-save it here as the service handles buffers.
    // The 'fileUrl' could point to a location if the file is persisted after processing,
    // or this endpoint could return the processed data directly without saving a new file.

    res.status(200).json({
      message: 'Document processed successfully.',
      filename: result.originalFilename,
      mimetype: result.mimetype,
      requestedAiFeatures: aiFeatures,
      processedData: {
        extractedTextLength: result.extractedText?.length, // Example: return length instead of full text
        summary: result.summary,
        sentiment: result.sentiment,
      },
      // Note: Consider if you need to return a URL to a *new* processed file or the original.
      // If the service modifies the file, it might return a new buffer to be saved.
      // For now, we are returning AI insights, not a modified file.
    });

  } catch (error: any) {
    console.error('Error processing document:', error);
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error processing document.', error: error.message });
  }
});

export default router;
