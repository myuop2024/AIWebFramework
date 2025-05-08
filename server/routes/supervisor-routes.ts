import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated, ensureSupervisor } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

/**
 * Get all observers assigned to the supervisor's team
 */
router.get('/api/supervisor/team', ensureAuthenticated, ensureSupervisor, async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would fetch only observers assigned to this supervisor
    // For demo purposes, we'll return all observers with role 'observer'
    const allUsers = await storage.getAllUsers();
    const observers = allUsers.filter(user => 
      user.role === 'observer' || user.role === 'roving_observer'
    ).map(observer => {
      // Add dummy data for the UI
      return {
        ...observer,
        observerId: observer.observerId || `OBS-${observer.id}`,
        fullName: `${observer.firstName || ''} ${observer.lastName || ''}`.trim() || observer.username,
        status: Math.random() > 0.5 ? 'active' : 'on_assignment',
        completedReports: Math.floor(Math.random() * 10),
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
        trainingCompleted: Math.random() > 0.3, // 70% have completed training
        // No password in response
        password: undefined
      };
    });

    res.status(200).json(observers);
  } catch (error) {
    logger.error('Error in GET /api/supervisor/team:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get pending reports that need supervisor approval
 */
router.get('/api/supervisor/pending-reports', ensureAuthenticated, ensureSupervisor, async (req: Request, res: Response) => {
  try {
    // In a real implementation, fetch reports that need supervisor approval
    // For now, return empty array
    res.status(200).json([]);
  } catch (error) {
    logger.error('Error in GET /api/supervisor/pending-reports:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all assignments managed by this supervisor
 */
router.get('/api/supervisor/assignments', ensureAuthenticated, ensureSupervisor, async (req: Request, res: Response) => {
  try {
    // In a real implementation, fetch assignments for this supervisor's team
    // For now, return empty array
    res.status(200).json([]);
  } catch (error) {
    logger.error('Error in GET /api/supervisor/assignments:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create new assignment for an observer
 */
router.post('/api/assignments', ensureAuthenticated, ensureSupervisor, async (req: Request, res: Response) => {
  try {
    const { observerId, stationId, startTime, endTime } = req.body;
    
    if (!observerId || !stationId || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate observer exists
    const observer = await storage.getUser(observerId);
    if (!observer) {
      return res.status(404).json({ message: 'Observer not found' });
    }

    // Validate station exists
    const station = await storage.getPollingStation(stationId);
    if (!station) {
      return res.status(404).json({ message: 'Polling station not found' });
    }

    // Create assignment
    const assignment = await storage.createAssignment({
      userId: observerId,
      pollingStationId: stationId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'pending',
      createdBy: req.session.userId as number
    });

    res.status(201).json(assignment);
  } catch (error) {
    logger.error('Error in POST /api/assignments:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;