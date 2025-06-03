import { Router } from 'express';
import { db } from '../db';
import { errorLogs } from '@shared/schema';
import { eq, and, desc, asc, like, gte, lte, or, isNull, isNotNull, inArray as in_, sql } from 'drizzle-orm';
import { ensureAdmin, ensureAuthenticated, hasPermission } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Ensure all routes in this file require admin privileges
// router.use(ensureAdmin); // Removed global middleware

/**
 * GET /api/admin/error-logs
 * Retrieve error logs with filtering and pagination
 */
router.get('/error-logs', ensureAuthenticated, hasPermission('error-logs:view'), async (req, res) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Limit max records to 100
    const offset = (page - 1) * limit;

    // Parse filter parameters
    const filters: any[] = [];

    // Source filter
    if (req.query.source) {
      filters.push(eq(errorLogs.source, req.query.source as string));
    }

    // Level filter
    if (req.query.level) {
      filters.push(eq(errorLogs.level, req.query.level as string));
    }

    // User ID filter
    if (req.query.userId) {
      filters.push(eq(errorLogs.userId, parseInt(req.query.userId as string)));
    }

    // Resolution status filter
    if (req.query.resolved === 'true') {
      filters.push(isNotNull(errorLogs.resolved));
      filters.push(eq(errorLogs.resolved, true));
    } else if (req.query.resolved === 'false') {
      filters.push(or(
        isNull(errorLogs.resolved),
        eq(errorLogs.resolved, false)
      ));
    }

    // Date range filters
    if (req.query.startDate) {
      filters.push(gte(errorLogs.createdAt, new Date(req.query.startDate as string)));
    }

    if (req.query.endDate) {
      filters.push(lte(errorLogs.createdAt, new Date(req.query.endDate as string)));
    }

    // Search filter (looks in message and stack)
    if (req.query.searchTerm) {
      const searchTerm = `%${req.query.searchTerm}%`;
      filters.push(or(
        like(errorLogs.message, searchTerm),
        like(errorLogs.stack || '', searchTerm),
        like(errorLogs.path || '', searchTerm),
        like(errorLogs.url || '', searchTerm)
      ));
    }

    // Fetch data with filters
    const query = db.select()
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt));

    // Apply filters if any
    if (filters.length > 0) {
      query.where(and(...filters));
    }

    // Apply pagination
    const logs = await query.limit(limit).offset(offset);

    // Get total count for pagination - simplify by using count() directly on the error logs array
    const allLogs = await db.select()
      .from(errorLogs)
      .where(filters.length > 0 ? and(...filters) : undefined);

    const count = allLogs.length;

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching error logs:', error);
    res.status(500).json({ message: 'Failed to retrieve error logs' });
  }
});

/**
 * GET /api/admin/error-logs/:id
 * Retrieve a specific error log by ID
 */
router.get('/error-logs/:id', ensureAuthenticated, hasPermission('error-logs:view'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const [log] = await db.select()
      .from(errorLogs)
      .where(eq(errorLogs.id, id));

    if (!log) {
      return res.status(404).json({ message: 'Error log not found' });
    }

    res.json(log);
  } catch (error) {
    logger.error('Error fetching error log:', error);
    res.status(500).json({ message: 'Failed to retrieve error log' });
  }
});

/**
 * POST /api/admin/error-logs/:id/resolve
 * Mark an error log as resolved
 */
router.post('/error-logs/:id/resolve', ensureAuthenticated, hasPermission('error-logs:resolve'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    // Check if log exists
    const [log] = await db.select()
      .from(errorLogs)
      .where(eq(errorLogs.id, id));

    if (!log) {
      return res.status(404).json({ message: 'Error log not found' });
    }

    // Update the log
    await db.update(errorLogs)
      .set({
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.user?.id,
        resolutionNotes: req.body.notes || ''
      })
      .where(eq(errorLogs.id, id));

    res.json({ message: 'Error log marked as resolved' });
  } catch (error) {
    logger.error('Error resolving error log:', error);
    res.status(500).json({ message: 'Failed to resolve error log' });
  }
});

/**
 * DELETE /api/admin/error-logs/:id
 * Delete an error log
 */
router.delete('/error-logs/:id', ensureAuthenticated, hasPermission('error-logs:delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    await db.delete(errorLogs)
      .where(eq(errorLogs.id, id));

    res.json({ message: 'Error log deleted successfully' });
  } catch (error) {
    logger.error('Error deleting error log:', error);
    res.status(500).json({ message: 'Failed to delete error log' });
  }
});

/**
 * DELETE /api/admin/error-logs
 * Delete multiple error logs matching criteria (bulk delete)
 */
router.delete('/error-logs', ensureAuthenticated, hasPermission('error-logs:delete'), async (req, res) => {
  try {
    const { ids, olderThan, allResolved } = req.body;

    if (!ids && !olderThan && !allResolved) {
      return res.status(400).json({ 
        message: 'At least one filter criteria (ids, olderThan, or allResolved) must be provided' 
      });
    }

    // Build up where conditions
    const conditions = [];

    // Filter by IDs
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
      if (validIds.length > 0) {
        conditions.push(in_(errorLogs.id, validIds));
      }
    }

    // Filter by age
    if (olderThan) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(olderThan));
      conditions.push(lte(errorLogs.createdAt, date));
    }

    // Filter by resolution status
    if (allResolved) {
      conditions.push(eq(errorLogs.resolved, true));
    }

    // Apply all conditions
    if (conditions.length > 0) {
      await db.delete(errorLogs).where(and(...conditions));
    } else {
      // This should not happen due to the earlier check, but just in case
      return res.status(400).json({ message: 'No valid filter criteria provided' });
    }

    res.json({ message: 'Error logs deleted successfully' });
  } catch (error) {
    logger.error('Error bulk deleting error logs:', error);
    res.status(500).json({ message: 'Failed to delete error logs' });
  }
});

export default router;