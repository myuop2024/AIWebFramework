import { Router } from 'express';
import { db } from '../db';
import { users, userProfiles, assignments, reports, pollingStations, type User, type InsertUser } from '@shared/schema';
import { eq, desc, and, sql, like } from 'drizzle-orm';
import * as logger from '../utils/logger';

const router = Router();

// GET /api/users/profile - Get current user profile (for dashboard)
router.get('/profile', async (req, res) => {
  try {
    // Get user ID from session or passport user
    let userId: string | null = null;

    if (req.session && req.session.userId) {
      userId = req.session.userId.toString();
    } else if (req.user && (req.user as any).id) {
      userId = (req.user as any).id.toString();
    } else {
      logger.warn('No user ID in session for /api/users/profile');
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userProfile = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        observerId: users.observerId,
        phoneNumber: users.phoneNumber,
        role: users.role,
        verificationStatus: users.verificationStatus,
        trainingStatus: users.trainingStatus,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        // Profile details
        address: userProfiles.address,
        city: userProfiles.city,
        state: userProfiles.state,
        country: userProfiles.country
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, parseInt(userId)))
      .limit(1);
    
    if (userProfile.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user statistics
    const assignmentStats = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status = 'active')`,
        completed: sql<number>`count(*) filter (where status = 'completed')`
      })
      .from(assignments)
      .where(eq(assignments.userId, userId));
    
    const reportStats = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        approved: sql<number>`count(*) filter (where status = 'approved')`,
        submitted: sql<number>`count(*) filter (where status = 'submitted')`
      })
      .from(reports)
      .where(eq(reports.userId, userId));
    
    const profile = {
      ...userProfile[0],
      assignments: assignmentStats[0]?.total || 0,
      activeAssignments: assignmentStats[0]?.active || 0,
      completedAssignments: assignmentStats[0]?.completed || 0,
      totalReports: reportStats[0]?.total || 0,
      pendingReports: reportStats[0]?.pending || 0,
      approvedReports: reportStats[0]?.approved || 0,
      submittedReports: reportStats[0]?.submitted || 0
    };
    
    res.json(profile);
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /api/users - Get all users with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const verificationStatus = req.query.verificationStatus as string;
    const trainingStatus = req.query.trainingStatus as string;
    const search = req.query.search as string;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (role) {
      conditions.push(eq(users.role, role));
    }
    
    if (verificationStatus) {
      conditions.push(eq(users.verificationStatus, verificationStatus));
    }
    
    if (trainingStatus) {
      conditions.push(eq(users.trainingStatus, trainingStatus));
    }
    
    if (search) {
      conditions.push(
        sql`(${users.firstName} ILIKE ${`%${search}%`} OR ${users.lastName} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`} OR ${users.username} ILIKE ${`%${search}%`})`
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get users with profile info
    const usersList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        observerId: users.observerId,
        phoneNumber: users.phoneNumber,
        role: users.role,
        verificationStatus: users.verificationStatus,
        trainingStatus: users.trainingStatus,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        city: userProfiles.city,
        state: userProfiles.state
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      users: usersList,
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
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/stats - Get user statistics
router.get('/stats', async (req, res) => {
  try {
    // Get role counts
    const roleStats = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.role);
    
    // Get verification status counts
    const verificationStats = await db
      .select({
        verificationStatus: users.verificationStatus,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.verificationStatus);
    
    // Get training status counts
    const trainingStats = await db
      .select({
        trainingStatus: users.trainingStatus,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.trainingStatus);
    
    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const total = totalResult[0]?.count || 0;
    
    res.json({
      total,
      byRole: roleStats,
      byVerificationStatus: verificationStats,
      byTrainingStatus: trainingStats
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        observerId: users.observerId,
        phoneNumber: users.phoneNumber,
        role: users.role,
        verificationStatus: users.verificationStatus,
        trainingStatus: users.trainingStatus,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Profile details
        address: userProfiles.address,
        city: userProfiles.city,
        state: userProfiles.state,
        postOfficeRegion: userProfiles.postOfficeRegion,
        country: userProfiles.country,
        trn: userProfiles.trn,
        idType: userProfiles.idType,
        idNumber: userProfiles.idNumber,
        bankName: userProfiles.bankName,
        bankBranchLocation: userProfiles.bankBranchLocation,
        bankAccount: userProfiles.bankAccount,
        accountType: userProfiles.accountType,
        accountCurrency: userProfiles.accountCurrency,
        profilePhotoUrl: userProfiles.profilePhotoUrl,
        verifiedAt: userProfiles.verifiedAt
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, id))
      .limit(1);
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user[0]);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      firstName, 
      lastName, 
      email, 
      phoneNumber, 
      role, 
      verificationStatus, 
      trainingStatus 
    } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updateData: Partial<InsertUser> = {
      updatedAt: new Date()
    };
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (role !== undefined) updateData.role = role;
    if (verificationStatus !== undefined) updateData.verificationStatus = verificationStatus;
    if (trainingStatus !== undefined) updateData.trainingStatus = trainingStatus;
    
    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    logger.info('User updated:', { id, email });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/users/:id/assignments - Get user assignments
router.get('/:id/assignments', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Build where conditions
    const conditions = [eq(assignments.userId, userId.toString())];
    
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
        stationName: sql<string>`${pollingStations.name}`,
        stationCode: sql<string>`${pollingStations.stationCode}`,
        stationAddress: sql<string>`${pollingStations.address}`
      })
      .from(assignments)
      .leftJoin(pollingStations, eq(assignments.stationId, pollingStations.id))
      .where(whereClause)
      .orderBy(desc(assignments.startDate))
      .limit(limit);
    
    res.json(userAssignments);
  } catch (error) {
    logger.error('Error fetching user assignments:', error);
    res.status(500).json({ error: 'Failed to fetch user assignments' });
  }
});

// GET /api/users/:id/reports - Get user reports
router.get('/:id/reports', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Build where conditions
    const conditions = [eq(reports.userId, userId.toString())];
    
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
        stationName: sql<string>`${pollingStations.name}`,
        stationCode: sql<string>`${pollingStations.stationCode}`
      })
      .from(reports)
      .leftJoin(pollingStations, eq(reports.stationId, pollingStations.id))
      .where(whereClause)
      .orderBy(desc(reports.submittedAt))
      .limit(limit);
    
    res.json(userReports);
  } catch (error) {
    logger.error('Error fetching user reports:', error);
    res.status(500).json({ error: 'Failed to fetch user reports' });
  }
});

// POST /api/users/:id/verify - Verify user
router.post('/:id/verify', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { verificationStatus, verifiedBy } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!verificationStatus) {
      return res.status(400).json({ error: 'Verification status is required' });
    }
    
    // Check if user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const result = await db
      .update(users)
      .set({
        verificationStatus,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    // Update profile verification if approved
    if (verificationStatus === 'verified') {
      await db
        .update(userProfiles)
        .set({
          verificationStatus: 'verified',
          verifiedAt: new Date()
        })
        .where(eq(userProfiles.userId, id));
    }
    
    logger.info('User verification updated:', { id, verificationStatus, verifiedBy });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error updating user verification:', error);
    res.status(500).json({ error: 'Failed to update user verification' });
  }
});

// GET /api/users/search - Search users
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const searchResults = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        observerId: users.observerId,
        role: users.role,
        verificationStatus: users.verificationStatus,
        profileImageUrl: users.profileImageUrl
      })
      .from(users)
      .where(
        sql`(${users.firstName} ILIKE ${`%${query}%`} OR ${users.lastName} ILIKE ${`%${query}%`} OR ${users.email} ILIKE ${`%${query}%`} OR ${users.username} ILIKE ${`%${query}%`} OR ${users.observerId} ILIKE ${`%${query}%`})`
      )
      .limit(limit);
    
    res.json(searchResults);
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;