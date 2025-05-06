import { Router } from 'express';
import { storage } from '../storage';
import { bulkUserImportSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { requireAuth, requireAdmin } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Get all user import logs (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const logs = await storage.getAllUserImportLogs();
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching user import logs:', error);
    res.status(500).json({ message: 'Failed to fetch user import logs' });
  }
});

// Get specific user import log (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
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
router.post('/bulk', requireAdmin, async (req, res) => {
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

export default router;