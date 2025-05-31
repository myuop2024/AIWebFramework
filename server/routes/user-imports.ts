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
import xlsx from 'xlsx';
import axios from 'axios';

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
    // Accept CSV and Excel files
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv', '.xlsx', '.xls'
    ];
    if (
      allowed.includes(file.mimetype) ||
      allowed.includes(ext)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV or Excel files are allowed'));
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
    logger.error('Error fetching user import logs:', error);
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
    logger.error('Error fetching user import log:', error);
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
    
    // Get user ID from session or passport user
    let importedBy = 0;
    if (req.session && req.session.userId) {
      importedBy = parseInt(req.session.userId.toString());
    } else if (req.user && (req.user as any).id) {
      importedBy = parseInt((req.user as any).id.toString());
    }

    // Create the import log
    const importLog = await storage.createUserImportLog({
      sourceType: 'manual', // Corrected from 'source' to 'sourceType'
      importedBy: importedBy,
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
    logger.error('Error in bulk user import:', error);
    res.status(500).json({ message: 'Failed to import users' });
  }
});

// Process CSV or Excel file upload and use AI to enhance the data
router.post('/csv', ensureAuthenticated, ensureAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    let records;
    if (ext === '.xlsx' || ext === '.xls') {
      // Parse Excel file
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      records = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      // Parse CSV as before
      const { parse } = await import('csv-parse/sync');
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    }
    // Call Python microservice for AI cleaning/enrichment
    let aiResult;
    try {
      const aiResponse = await axios.post('http://localhost:8000/clean_enrich', { records });
      aiResult = aiResponse.data;
    } catch (err) {
      logger.error('Python AI microservice failed, falling back to Google AI:', err);
      // Fallback: use existing Google AI logic (processCSVFile)
      aiResult = await processCSVFile(req.file.path, records);
    }
    // Get user ID from session or passport user
    let importedBy = 0;
    if (req.session && req.session.userId) {
      importedBy = parseInt(req.session.userId.toString());
    } else if (req.user && (req.user as any).id) {
      importedBy = parseInt((req.user as any).id.toString());
    }

    // Create an import log
    const importLog = await storage.createUserImportLog({
      sourceType: ext === '.csv' ? 'csv' : 'excel',
      importedBy: importedBy,
      totalRecords: aiResult.data.length + aiResult.errorRows.length,
      successCount: 0,
      failureCount: 0,
      status: 'analyzed',
      filename: req.file.originalname,
      options: {
        defaultRole: req.body.defaultRole || 'observer',
        verificationStatus: req.body.verificationStatus || 'pending'
      }
    });
    // Return the processed data
    res.status(200).json({
      importId: importLog.id,
      data: aiResult.data,
      errorRows: aiResult.errorRows,
      enhancementStats: aiResult.enhancementStats,
      duplicateWarnings: aiResult.duplicateWarnings,
      status: 'ready_for_import'
    });
  } catch (error) {
    logger.error('Error processing file in /csv route:', error);
    res.status(500).json({ message: 'Failed to process file: ' + (error instanceof Error ? error.message : String(error)) });
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
      defaultRole: options?.defaultRole || (importLog.options as any)?.defaultRole,
      verificationStatus: options?.verificationStatus || (importLog.options as any)?.verificationStatus
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
    logger.error('Error confirming CSV import in /csv/confirm/:id route:', error);
    res.status(500).json({ message: 'Failed to import users: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

export default router;