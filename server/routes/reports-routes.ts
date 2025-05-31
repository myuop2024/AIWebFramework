import { Router } from 'express';
import { db } from '../db';
import { reports, users, pollingStations, formTemplates, type Report, type InsertReport } from '@shared/schema';
import { eq, desc, and, sql, like } from 'drizzle-orm';
import * as logger from '../utils/logger';
import { ensureAuthenticated } from '../middleware/auth';
import { encryptFields, decryptFields } from '../services/encryption-service';

// Define fields for encryption to avoid magic strings
const reportContentFieldsToEncrypt = ["content"];
const reportDescriptionFieldsToEncrypt = ["description"];
const reportFieldsToParseAsObjectOnDecrypt = ["content"]; // Since content is jsonb

const router = Router();

// GET /api/reports - Get all reports with pagination and filtering
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const reportType = req.query.reportType as string;
    const userId = req.query.userId as string;
    const stationId = req.query.stationId as string;
    const search = req.query.search as string;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (status) {
      conditions.push(eq(reports.status, status));
    }
    
    if (reportType) {
      conditions.push(eq(reports.reportType, reportType));
    }
    
    if (userId) {
      conditions.push(eq(reports.userId, userId));
    }
    
    if (stationId) {
      conditions.push(eq(reports.stationId, parseInt(stationId)));
    }
    
    if (search) {
      conditions.push(
        sql`(${reports.reportType} ILIKE ${`%${search}%`} OR ${reports.content}::text ILIKE ${`%${search}%`})`
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get reports with user and station info
    const reportsList = await db
      .select({
        id: reports.id,
        userId: reports.userId,
        stationId: reports.stationId,
        templateId: reports.templateId,
        reportType: reports.reportType,
        content: reports.content,
        status: reports.status,
        submittedAt: reports.submittedAt,
        reviewedAt: reports.reviewedAt,
        reviewedBy: reports.reviewedBy,
        checkinTime: reports.checkinTime,
        checkoutTime: reports.checkoutTime,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        stationName: pollingStations.name,
        stationCode: pollingStations.stationCode
      })
      .from(reports)
      .leftJoin(users, eq(reports.userId, users.id))
      .leftJoin(pollingStations, eq(reports.stationId, pollingStations.id))
      .where(whereClause)
      .orderBy(desc(reports.submittedAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const decryptedReportsList = reportsList.map(report => {
      let tempReport = decryptFields(report, (req.user as any)?.role, "content_iv", "isContentEncrypted", reportFieldsToParseAsObjectOnDecrypt);
      tempReport = decryptFields(tempReport, (req.user as any)?.role, "description_iv", "isDescriptionEncrypted");
      return tempReport;
    });
    
    res.json({
      reports: decryptedReportsList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/stats - Get report statistics
router.get('/stats', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    let whereClause = undefined;
    if (userId) {
      whereClause = eq(reports.userId, userId);
    }
    
    // Get status counts
    const statusStats = await db
      .select({
        status: reports.status,
        count: sql<number>`count(*)`
      })
      .from(reports)
      .where(whereClause)
      .groupBy(reports.status);
    
    // Get type counts
    const typeStats = await db
      .select({
        reportType: reports.reportType,
        count: sql<number>`count(*)`
      })
      .from(reports)
      .where(whereClause)
      .groupBy(reports.reportType);
    
    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    
    res.json({
      total,
      byStatus: statusStats,
      byType: typeStats
    });
  } catch (error) {
    logger.error('Error fetching report stats:', error);
    res.status(500).json({ error: 'Failed to fetch report stats' });
  }
});

// GET /api/reports/types - Get all report types
router.get('/types', ensureAuthenticated, async (req, res) => {
  try {
    const types = await db
      .selectDistinct({ reportType: reports.reportType })
      .from(reports);
    
    res.json(types.map(t => t.reportType));
  } catch (error) {
    logger.error('Error fetching report types:', error);
    res.status(500).json({ error: 'Failed to fetch report types' });
  }
});

// GET /api/reports/:id - Get single report
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }
    
    const report = await db
      .select({
        id: reports.id,
        userId: reports.userId,
        stationId: reports.stationId,
        templateId: reports.templateId,
        reportType: reports.reportType,
        content: reports.content,
        contentHash: reports.contentHash,
        status: reports.status,
        submittedAt: reports.submittedAt,
        reviewedAt: reports.reviewedAt,
        reviewedBy: reports.reviewedBy,
        checkinTime: reports.checkinTime,
        checkoutTime: reports.checkoutTime,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        stationName: pollingStations.name,
        stationCode: pollingStations.stationCode,
        stationAddress: pollingStations.address,
        templateName: formTemplates.name
      })
      .from(reports)
      .leftJoin(users, eq(reports.userId, users.id))
      .leftJoin(pollingStations, eq(reports.stationId, pollingStations.id))
      .leftJoin(formTemplates, eq(reports.templateId, formTemplates.id))
      .where(eq(reports.id, id))
      .limit(1);
    
    if (report.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    let decryptedReport = decryptFields(report[0], (req.user as any)?.role, "content_iv", "isContentEncrypted", reportFieldsToParseAsObjectOnDecrypt);
    decryptedReport = decryptFields(decryptedReport, (req.user as any)?.role, "description_iv", "isDescriptionEncrypted");
    res.json(decryptedReport);
  } catch (error) {
    logger.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST /api/reports - Create new report
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { 
      userId, 
      stationId, 
      templateId, 
      reportType, 
      content, 
      checkinTime, 
      checkoutTime 
    } = req.body;
    
    if (!userId || !stationId || !reportType || !content) {
      return res.status(400).json({ 
        error: 'User ID, station ID, report type, and content are required' 
      });
    }
    
    // Generate content hash for integrity
    const contentHash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex');
    
    const newReport: InsertReport = {
      userId,
      stationId: parseInt(stationId),
      templateId: templateId ? parseInt(templateId) : null,
      reportType,
      content,
      contentHash,
      status: 'submitted',
      submittedAt: new Date(),
      checkinTime: checkinTime ? new Date(checkinTime) : null,
      checkoutTime: checkoutTime ? new Date(checkoutTime) : null
    };

    let dataToInsert = { ...newReport };
    dataToInsert = encryptFields(dataToInsert, reportContentFieldsToEncrypt, "content_iv", "isContentEncrypted");
    dataToInsert = encryptFields(dataToInsert, reportDescriptionFieldsToEncrypt, "description_iv", "isDescriptionEncrypted");
    
    const result = await db
      .insert(reports)
      .values(dataToInsert as InsertReport) // Cast after encryption
      .returning();
    
    logger.info('Report created:', { id: result[0].id, userId, stationId, reportType });

    let decryptedResult = decryptFields(result[0], (req.user as any)?.role, "content_iv", "isContentEncrypted", reportFieldsToParseAsObjectOnDecrypt);
    decryptedResult = decryptFields(decryptedResult, (req.user as any)?.role, "description_iv", "isDescriptionEncrypted");
    res.status(201).json(decryptedResult);
  } catch (error) {
    logger.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// PUT /api/reports/:id - Update report
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content, reportType, status, checkinTime, checkoutTime } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }
    
    // Check if report exists
    const existing = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const updateData: Partial<InsertReport> = {};
    
    if (content !== undefined) {
      updateData.content = content;
      // Update content hash
      updateData.contentHash = require('crypto')
        .createHash('sha256')
        .update(JSON.stringify(content))
        .digest('hex');
    }
    
    if (reportType !== undefined) updateData.reportType = reportType;
    if (status !== undefined) updateData.status = status;
    if (checkinTime !== undefined) updateData.checkinTime = checkinTime ? new Date(checkinTime) : null;
    if (checkoutTime !== undefined) updateData.checkoutTime = checkoutTime ? new Date(checkoutTime) : null;

    let dataToUpdate = { ...updateData };
    dataToUpdate = encryptFields(dataToUpdate, reportContentFieldsToEncrypt, "content_iv", "isContentEncrypted");
    dataToUpdate = encryptFields(dataToUpdate, reportDescriptionFieldsToEncrypt, "description_iv", "isDescriptionEncrypted");
    
    const result = await db
      .update(reports)
      .set(dataToUpdate)
      .where(eq(reports.id, id))
      .returning();
    
    logger.info('Report updated:', { id, status });
    let decryptedResult = decryptFields(result[0], (req.user as any)?.role, "content_iv", "isContentEncrypted", reportFieldsToParseAsObjectOnDecrypt);
    decryptedResult = decryptFields(decryptedResult, (req.user as any)?.role, "description_iv", "isDescriptionEncrypted");
    res.json(decryptedResult);
  } catch (error) {
    logger.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// POST /api/reports/:id/review - Review report
router.post('/:id/review', ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, reviewedBy } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }
    
    if (!status || !reviewedBy) {
      return res.status(400).json({ error: 'Status and reviewer ID are required' });
    }
    
    // Check if report exists
    const existing = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const result = await db
      .update(reports)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date()
      })
      .where(eq(reports.id, id))
      .returning();
    
    logger.info('Report reviewed:', { id, status, reviewedBy });
    let decryptedResult = decryptFields(result[0], (req.user as any)?.role, "content_iv", "isContentEncrypted", reportFieldsToParseAsObjectOnDecrypt);
    decryptedResult = decryptFields(decryptedResult, (req.user as any)?.role, "description_iv", "isDescriptionEncrypted");
    res.json(decryptedResult);
  } catch (error) {
    logger.error('Error reviewing report:', error);
    res.status(500).json({ error: 'Failed to review report' });
  }
});

// DELETE /api/reports/:id - Delete report
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }
    
    // Check if report exists
    const existing = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    await db
      .delete(reports)
      .where(eq(reports.id, id));
    
    logger.info('Report deleted:', { id });
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    logger.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// GET /api/reports/user/:userId - Get reports for specific user
router.get('/user/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [eq(reports.userId, userId)];
    
    if (status) {
      conditions.push(eq(reports.status, status));
    }
    
    const whereClause = and(...conditions);
    
    const userReports = await db
      .select({
        id: reports.id,
        stationId: reports.stationId,
        reportType: reports.reportType,
        status: reports.status,
        submittedAt: reports.submittedAt,
        reviewedAt: reports.reviewedAt,
        stationName: pollingStations.name,
        stationCode: pollingStations.stationCode
      })
      .from(reports)
      .leftJoin(pollingStations, eq(reports.stationId, pollingStations.id))
      .where(whereClause)
      .orderBy(desc(reports.submittedAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const decryptedUserReports = userReports.map(report => {
      let tempReport = decryptFields(report, (req.user as any)?.role, "content_iv", "isContentEncrypted", reportFieldsToParseAsObjectOnDecrypt);
      tempReport = decryptFields(tempReport, (req.user as any)?.role, "description_iv", "isDescriptionEncrypted");
      return tempReport;
    });
    
    res.json({
      reports: decryptedUserReports,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching user reports:', error);
    res.status(500).json({ error: 'Failed to fetch user reports' });
  }
});

export default router;