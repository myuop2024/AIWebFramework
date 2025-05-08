import { Router } from 'express';
import { storage } from '../storage';
import { bulkUserImportSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processCSVFile } from '../services/csv-processor';

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
      
      // Ensure the directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `import-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const router = Router();

// Get all user import logs (admin only)
router.get('/', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const logs = await storage.getAllUserImportLogs();
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching user import logs:', error);
    res.status(500).json({ message: 'Failed to fetch user import logs' });
  }
});

// Get specific user import log (admin only)
router.get('/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid import log ID' });
    }
    
    const log = await storage.getUserImportLog(id);
    if (!log) {
      return res.status(404).json({ message: 'User import log not found' });
    }
    
    res.status(200).json(log);
  } catch (error) {
    console.error('Error fetching user import log:', error);
    res.status(500).json({ message: 'Failed to fetch user import log' });
  }
});

// Bulk create users (admin only)
router.post('/bulk', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const result = bulkUserImportSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid user import data', 
        errors: fromZodError(result.error).message 
      });
    }
    
    const { users, options } = result.data;
    
    // Hash passwords if they exist in plain text
    const passwordHash = (pwd: string) => crypto.createHash('sha256').update(pwd).digest('hex');
    
    // Create the import log
    const importLog = await storage.createUserImportLog({
      sourceType: 'manual', // Corrected from 'source' to 'sourceType'
      importedBy: req.session?.userId || 0,
      totalRecords: users.length,
      successCount: 0,
      failureCount: 0,
      status: 'processing',
      filename: `bulk_import_${new Date().toISOString()}`,
      options: {
        defaultRole: options?.defaultRole || 'observer',
        verificationStatus: options?.verificationStatus || 'pending'
      }
    });
    
    // Perform the bulk import
    const importResult = await storage.bulkCreateUsers(users, {
      defaultRole: options?.defaultRole,
      verificationStatus: options?.verificationStatus,
      passwordHash
    });
    
    // Update the import log with results
    await storage.updateUserImportLog(importLog.id, {
      successCount: importResult.success.length,
      failureCount: importResult.failures.length,
      status: 'completed',
      errors: importResult.failures.map(f => ({
        data: {
          username: f.data.username,
          email: f.data.email,
          firstName: f.data.firstName,
          lastName: f.data.lastName
        },
        error: f.error
      }))
    });
    
    res.status(201).json({
      importId: importLog.id,
      totalCount: users.length,
      successCount: importResult.success.length,
      failureCount: importResult.failures.length
    });
  } catch (error) {
    console.error('Error in bulk user import:', error);
    res.status(500).json({ message: 'Failed to import users' });
  }
});

// Process CSV file upload and use Google AI to enhance the data
router.post('/csv', ensureAuthenticated, ensureAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create an import log
    const importLog = await storage.createUserImportLog({
      sourceType: 'csv',
      importedBy: req.session?.userId || 0,
      totalRecords: 0, // Will be updated after processing
      successCount: 0,
      failureCount: 0,
      status: 'processing',
      filename: req.file.originalname,
      options: {
        defaultRole: req.body.defaultRole || 'observer',
        verificationStatus: req.body.verificationStatus || 'pending'
      }
    });

    // Process the CSV file with Google AI
    const processedResult = await processCSVFile(req.file.path);
    
    // Update the import log with processed data counts
    await storage.updateUserImportLog(importLog.id, {
      totalRecords: processedResult.data.length + processedResult.errorRows.length,
      status: 'analyzed'
    });

    // Return the processed data
    res.status(200).json({
      importId: importLog.id,
      data: processedResult.data.map(user => ({ 
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        role: user.role
      })), // Don't send passwords back to client
      errorRows: processedResult.errorRows,
      enhancementStats: processedResult.enhancementStats,
      duplicateWarnings: processedResult.duplicateWarnings,
      status: 'ready_for_import'
    });
  } catch (error) {
    console.error('Error processing CSV file:', error);
    res.status(500).json({ message: 'Failed to process CSV file: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

// Confirm and import processed CSV data
router.post('/csv/confirm/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const importId = parseInt(req.params.id);
    if (isNaN(importId)) {
      return res.status(400).json({ message: 'Invalid import ID' });
    }

    // Get the import log
    const importLog = await storage.getUserImportLog(importId);
    if (!importLog) {
      return res.status(404).json({ message: 'Import log not found' });
    }

    if (importLog.status !== 'analyzed') {
      return res.status(400).json({ message: 'Import is not ready for confirmation' });
    }

    // Validate the data
    const result = bulkUserImportSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid user import data', 
        errors: fromZodError(result.error).message 
      });
    }

    const { users, options } = result.data;

    // Update the import log status
    await storage.updateUserImportLog(importId, {
      status: 'importing',
      totalRecords: users.length
    });

    // Perform the bulk import
    const importResult = await storage.bulkCreateUsers(users, {
      defaultRole: options?.defaultRole || importLog.options?.defaultRole,
      verificationStatus: options?.verificationStatus || importLog.options?.verificationStatus
    });

    // Update the import log with results
    await storage.updateUserImportLog(importId, {
      successCount: importResult.success.length,
      failureCount: importResult.failures.length,
      status: 'completed',
      errors: importResult.failures.map(f => ({
        data: {
          username: f.data.username,
          email: f.data.email,
          firstName: f.data.firstName,
          lastName: f.data.lastName
        },
        error: f.error
      }))
    });

    res.status(201).json({
      importId,
      totalCount: users.length,
      successCount: importResult.success.length,
      failureCount: importResult.failures.length,
      status: 'completed'
    });
  } catch (error) {
    console.error('Error confirming CSV import:', error);
    res.status(500).json({ message: 'Failed to import users: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

export default router;