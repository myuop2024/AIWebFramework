import { Router } from 'express';
import { db } from '../db';
import { assignments, users, pollingStations, type Assignment, type InsertAssignment } from '@shared/schema';
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import * as logger from '../utils/logger';

const router = Router();

// GET /api/assignments - Get all assignments with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const userId = req.query.userId as string;
    const stationId = req.query.stationId as string;
    const role = req.query.role as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (status) {
      conditions.push(eq(assignments.status, status));
    }
    
    if (userId) {
      conditions.push(eq(assignments.userId, userId));
    }
    
    if (stationId) {
      conditions.push(eq(assignments.stationId, parseInt(stationId)));
    }
    
    if (role) {
      conditions.push(eq(assignments.role, role));
    }
    
    if (startDate) {
      conditions.push(gte(assignments.startDate, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(assignments.endDate, new Date(endDate)));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get assignments with user and station info
    const assignmentsList = await db
      .select({
        id: assignments.id,
        userId: assignments.userId,
        stationId: assignments.stationId,
        isPrimary: assignments.isPrimary,
        assignedAt: assignments.assignedAt,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
        status: assignments.status,
        notes: assignments.notes,
        checkInRequired: assignments.checkInRequired,
        lastCheckIn: assignments.lastCheckIn,
        lastCheckOut: assignments.lastCheckOut,
        role: assignments.role,
        priority: assignments.priority,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        userRole: users.role,
        stationName: pollingStations.name,
        stationCode: pollingStations.stationCode,
        stationAddress: pollingStations.address,
        stationCity: pollingStations.city
      })
      .from(assignments)
      .leftJoin(users, eq(assignments.userId, users.id))
      .leftJoin(pollingStations, eq(assignments.stationId, pollingStations.id))
      .where(whereClause)
      .orderBy(desc(assignments.assignedAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      assignments: assignmentsList,
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
    logger.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/assignments/stats - Get assignment statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    let whereClause = undefined;
    if (userId) {
      whereClause = eq(assignments.userId, userId);
    }
    
    // Get status counts
    const statusStats = await db
      .select({
        status: assignments.status,
        count: sql<number>`count(*)`
      })
      .from(assignments)
      .where(whereClause)
      .groupBy(assignments.status);
    
    // Get role counts
    const roleStats = await db
      .select({
        role: assignments.role,
        count: sql<number>`count(*)`
      })
      .from(assignments)
      .where(whereClause)
      .groupBy(assignments.role);
    
    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    
    res.json({
      total,
      byStatus: statusStats,
      byRole: roleStats
    });
  } catch (error) {
    logger.error('Error fetching assignment stats:', error);
    res.status(500).json({ error: 'Failed to fetch assignment stats' });
  }
});

// GET /api/assignments/active - Get active assignments
router.get('/active', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const now = new Date();
    
    let whereClause = and(
      eq(assignments.status, 'active'),
      lte(assignments.startDate, now),
      gte(assignments.endDate, now)
    );
    
    if (userId) {
      whereClause = and(
        whereClause,
        eq(assignments.userId, userId)
      );
    }
    
    const activeAssignments = await db
      .select({
        id: assignments.id,
        userId: assignments.userId,
        stationId: assignments.stationId,
        isPrimary: assignments.isPrimary,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
        role: assignments.role,
        notes: assignments.notes,
        lastCheckIn: assignments.lastCheckIn,
        lastCheckOut: assignments.lastCheckOut,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        stationName: pollingStations.name,
        stationCode: pollingStations.stationCode,
        stationAddress: pollingStations.address
      })
      .from(assignments)
      .leftJoin(users, eq(assignments.userId, users.id))
      .leftJoin(pollingStations, eq(assignments.stationId, pollingStations.id))
      .where(whereClause)
      .orderBy(assignments.priority, assignments.startDate);
    
    res.json(activeAssignments);
  } catch (error) {
    logger.error('Error fetching active assignments:', error);
    res.status(500).json({ error: 'Failed to fetch active assignments' });
  }
});

// GET /api/assignments/:id - Get single assignment
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }
    
    const assignment = await db
      .select({
        id: assignments.id,
        userId: assignments.userId,
        stationId: assignments.stationId,
        isPrimary: assignments.isPrimary,
        assignedAt: assignments.assignedAt,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
        status: assignments.status,
        notes: assignments.notes,
        checkInRequired: assignments.checkInRequired,
        lastCheckIn: assignments.lastCheckIn,
        lastCheckOut: assignments.lastCheckOut,
        role: assignments.role,
        priority: assignments.priority,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        userPhone: users.phoneNumber,
        userRole: users.role,
        stationName: pollingStations.name,
        stationCode: pollingStations.stationCode,
        stationAddress: pollingStations.address,
        stationCity: pollingStations.city,
        stationCoordinates: pollingStations.coordinates,
        stationCapacity: pollingStations.capacity
      })
      .from(assignments)
      .leftJoin(users, eq(assignments.userId, users.id))
      .leftJoin(pollingStations, eq(assignments.stationId, pollingStations.id))
      .where(eq(assignments.id, id))
      .limit(1);
    
    if (assignment.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json(assignment[0]);
  } catch (error) {
    logger.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// POST /api/assignments - Create new assignment
router.post('/', async (req, res) => {
  try {
    const { 
      userId, 
      stationId, 
      isPrimary = false,
      startDate, 
      endDate, 
      notes,
      checkInRequired = true,
      role = 'observer',
      priority = 1
    } = req.body;
    
    if (!userId || !stationId || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'User ID, station ID, start date, and end date are required' 
      });
    }
    
    // Check if station has capacity
    const station = await db
      .select()
      .from(pollingStations)
      .where(eq(pollingStations.id, parseInt(stationId)))
      .limit(1);
    
    if (station.length === 0) {
      return res.status(404).json({ error: 'Polling station not found' });
    }
    
    // Check current assignments for this station in the date range
    const overlappingAssignments = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(and(
        eq(assignments.stationId, parseInt(stationId)),
        eq(assignments.status, 'active'),
        sql`(${assignments.startDate} <= ${new Date(endDate)} AND ${assignments.endDate} >= ${new Date(startDate)})`
      ));
    
    const currentCount = overlappingAssignments[0]?.count || 0;
    
    if (currentCount >= station[0].capacity) {
      return res.status(400).json({ 
        error: `Station is at capacity (${station[0].capacity} observers)` 
      });
    }
    
    const newAssignment: InsertAssignment = {
      userId,
      stationId: parseInt(stationId),
      isPrimary,
      assignedAt: new Date(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'scheduled',
      notes,
      checkInRequired,
      role,
      priority
    };
    
    const result = await db
      .insert(assignments)
      .values(newAssignment)
      .returning();
    
    logger.info('Assignment created:', { id: result[0].id, userId, stationId });
    res.status(201).json(result[0]);
  } catch (error) {
    logger.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// PUT /api/assignments/:id - Update assignment
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      startDate, 
      endDate, 
      status, 
      notes, 
      isPrimary, 
      checkInRequired, 
      role, 
      priority 
    } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }
    
    // Check if assignment exists
    const existing = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const updateData: Partial<InsertAssignment> = {};
    
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (isPrimary !== undefined) updateData.isPrimary = isPrimary;
    if (checkInRequired !== undefined) updateData.checkInRequired = checkInRequired;
    if (role !== undefined) updateData.role = role;
    if (priority !== undefined) updateData.priority = priority;
    
    const result = await db
      .update(assignments)
      .set(updateData)
      .where(eq(assignments.id, id))
      .returning();
    
    logger.info('Assignment updated:', { id, status });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// POST /api/assignments/:id/checkin - Check in to assignment
router.post('/:id/checkin', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }
    
    // Check if assignment exists and is active
    const existing = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    if (existing[0].status !== 'active' && existing[0].status !== 'scheduled') {
      return res.status(400).json({ error: 'Assignment is not active' });
    }
    
    const result = await db
      .update(assignments)
      .set({
        lastCheckIn: new Date(),
        status: 'active'
      })
      .where(eq(assignments.id, id))
      .returning();
    
    logger.info('User checked in to assignment:', { id });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error checking in to assignment:', error);
    res.status(500).json({ error: 'Failed to check in to assignment' });
  }
});

// POST /api/assignments/:id/checkout - Check out from assignment
router.post('/:id/checkout', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }
    
    // Check if assignment exists and user is checked in
    const existing = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    if (!existing[0].lastCheckIn) {
      return res.status(400).json({ error: 'User has not checked in yet' });
    }
    
    const result = await db
      .update(assignments)
      .set({
        lastCheckOut: new Date()
      })
      .where(eq(assignments.id, id))
      .returning();
    
    logger.info('User checked out from assignment:', { id });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error checking out from assignment:', error);
    res.status(500).json({ error: 'Failed to check out from assignment' });
  }
});

// DELETE /api/assignments/:id - Delete assignment
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }
    
    // Check if assignment exists
    const existing = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    await db
      .delete(assignments)
      .where(eq(assignments.id, id));
    
    logger.info('Assignment deleted:', { id });
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// GET /api/assignments/user/:userId - Get assignments for specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [eq(assignments.userId, userId)];
    
    if (status) {
      conditions.push(eq(assignments.status, status));
    }
    
    const whereClause = and(...conditions);
    
    const userAssignments = await db
      .select({
        id: assignments.id,
        stationId: assignments.stationId,
        isPrimary: assignments.isPrimary,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
        status: assignments.status,
        role: assignments.role,
        lastCheckIn: assignments.lastCheckIn,
        lastCheckOut: assignments.lastCheckOut,
        stationName: pollingStations.name,
        stationCode: pollingStations.stationCode,
        stationAddress: pollingStations.address
      })
      .from(assignments)
      .leftJoin(pollingStations, eq(assignments.stationId, pollingStations.id))
      .where(whereClause)
      .orderBy(desc(assignments.startDate))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      assignments: userAssignments,
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
    logger.error('Error fetching user assignments:', error);
    res.status(500).json({ error: 'Failed to fetch user assignments' });
  }
});

// GET /api/assignments/station/:stationId - Get assignments for specific station
router.get('/station/:stationId', async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    const status = req.query.status as string;
    
    if (isNaN(stationId)) {
      return res.status(400).json({ error: 'Invalid station ID' });
    }
    
    // Build where conditions
    const conditions = [eq(assignments.stationId, stationId)];
    
    if (status) {
      conditions.push(eq(assignments.status, status));
    }
    
    const whereClause = and(...conditions);
    
    const stationAssignments = await db
      .select({
        id: assignments.id,
        userId: assignments.userId,
        isPrimary: assignments.isPrimary,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
        status: assignments.status,
        role: assignments.role,
        lastCheckIn: assignments.lastCheckIn,
        lastCheckOut: assignments.lastCheckOut,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        userPhone: users.phoneNumber
      })
      .from(assignments)
      .leftJoin(users, eq(assignments.userId, users.id))
      .where(whereClause)
      .orderBy(assignments.isPrimary, assignments.startDate);
    
    res.json(stationAssignments);
  } catch (error) {
    logger.error('Error fetching station assignments:', error);
    res.status(500).json({ error: 'Failed to fetch station assignments' });
  }
});

export default router; 