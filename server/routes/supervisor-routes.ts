import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated, ensureSupervisor, hasPermission } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

/**
 * Get all observers assigned to the supervisor's team
 */
router.get('/api/supervisor/team', ensureAuthenticated, hasPermission('supervisor-tasks:view-team'), async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would fetch only observers assigned to this supervisor
    // For demo purposes, we'll return all observers with role 'observer'
    const allUsers = await storage.getAllUsers();
    const observers = allUsers.filter(user => 
      user.role === 'observer' || user.role === 'roving_observer'
    ).map(observer => {
      // Add data for the UI
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
  } catch (err) {
    const error = err as Error;
    logger.error('Error in GET /api/supervisor/team:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Get pending reports that need supervisor approval
 */
router.get('/api/supervisor/pending-reports', ensureAuthenticated, hasPermission('supervisor-tasks:view-pending-reports'), async (req: Request, res: Response) => {
  try {
    // In a real implementation, we would fetch real data from the database
    // For demo purposes, generate sample pending reports
    const reports = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      reporterId: Math.floor(Math.random() * 10) + 1,
      reporterName: `Observer ${Math.floor(Math.random() * 10) + 1}`,
      stationId: Math.floor(Math.random() * 20) + 1,
      stationName: `Polling Station ${Math.floor(Math.random() * 20) + 1}`,
      type: ['Incident', 'Problem', 'Concern', 'Security Issue', 'Accessibility Issue'][Math.floor(Math.random() * 5)],
      title: `Report ${i + 1}: ${['Voter intimidation reported', 'Long queues forming', 'Equipment malfunction', 'Security concern', 'Missing supplies'][Math.floor(Math.random() * 5)]}`,
      content: `Detailed report content for report ${i + 1}. This includes information about the issue observed at the polling station and its potential impact on the voting process.`,
      priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as 'low' | 'medium' | 'high' | 'critical',
      status: 'pending',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 3)).toISOString(),
      attachments: Math.floor(Math.random() * 3)
    }));

    res.status(200).json(reports);
  } catch (err) {
    const error = err as Error;
    logger.error('Error in GET /api/supervisor/pending-reports:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Get all assignments managed by this supervisor
 */
router.get('/api/supervisor/assignments', ensureAuthenticated, hasPermission('supervisor-tasks:view-assignments'), async (req: Request, res: Response) => {
  try {
    // In a real implementation, we would fetch from the database
    // For now, return sample assignments
    const assignments = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      userId: Math.floor(Math.random() * 10) + 1,
      stationId: Math.floor(Math.random() * 20) + 1,
      stationName: `Polling Station ${Math.floor(Math.random() * 20) + 1}`,
      observerName: `Observer ${Math.floor(Math.random() * 10) + 1}`,
      startDate: new Date(Date.now() + Math.floor(Math.random() * 86400000 * 7)).toISOString(),
      endDate: new Date(Date.now() + Math.floor(Math.random() * 86400000 * 7) + 28800000).toISOString(), // +8 hours from start
      status: ['pending', 'active', 'completed', 'cancelled'][Math.floor(Math.random() * 4)] as 'pending' | 'active' | 'completed' | 'cancelled',
      observerStatus: ['active', 'training', 'on_assignment'][Math.floor(Math.random() * 3)]
    }));

    res.status(200).json(assignments);
  } catch (err) {
    const error = err as Error;
    logger.error('Error in GET /api/supervisor/assignments:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Create new assignment for an observer
 */
router.post('/api/assignments', ensureAuthenticated, hasPermission('supervisor-tasks:create-assignment'), async (req: Request, res: Response) => {
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
      stationId: stationId, // Use stationId instead of pollingStationId
      startDate: new Date(startTime), // Use startDate instead of startTime
      endDate: new Date(endTime), // Use endDate instead of endTime
      status: 'pending'
      // createdBy is not in the assignment schema, so removed it
    });

    res.status(201).json(assignment);
  } catch (err) {
    const error = err as Error;
    logger.error('Error in POST /api/assignments:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Cancel an assignment
 */
router.patch('/api/assignments/:id/cancel', ensureAuthenticated, hasPermission('supervisor-tasks:cancel-assignment'), async (req: Request, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.id);
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    // In a real implementation, we would update the assignment in the database
    // For now, return a mock response
    const updatedAssignment = {
      id: assignmentId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: req.session.userId
    };

    res.status(200).json(updatedAssignment);
  } catch (err) {
    const error = err as Error;
    logger.error('Error in PATCH /api/assignments/:id/cancel:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Approve a report
 */
router.patch('/api/reports/:id/approve', ensureAuthenticated, hasPermission('supervisor-tasks:approve-report'), async (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    // In a real implementation, we would update the report in the database
    // For now, return a mock response
    const updatedReport = {
      id: reportId,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: req.session.userId
    };

    res.status(200).json(updatedReport);
  } catch (err) {
    const error = err as Error;
    logger.error('Error in PATCH /api/reports/:id/approve:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Reject a report
 */
router.patch('/api/reports/:id/reject', ensureAuthenticated, hasPermission('supervisor-tasks:reject-report'), async (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const { feedback } = req.body;
    
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    if (!feedback) {
      return res.status(400).json({ message: 'Feedback is required for rejecting a report' });
    }

    // In a real implementation, we would update the report in the database
    // For now, return a mock response
    const updatedReport = {
      id: reportId,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: req.session.userId,
      feedback
    };

    res.status(200).json(updatedReport);
  } catch (err) {
    const error = err as Error;
    logger.error('Error in PATCH /api/reports/:id/reject:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Request update for a report
 */
router.patch('/api/reports/:id/request-update', ensureAuthenticated, hasPermission('supervisor-tasks:request-report-update'), async (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const { feedback } = req.body;
    
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    if (!feedback) {
      return res.status(400).json({ message: 'Feedback is required when requesting an update' });
    }

    // In a real implementation, we would update the report in the database
    // For now, return a mock response
    const updatedReport = {
      id: reportId,
      status: 'requires_update',
      updateRequestedAt: new Date().toISOString(),
      updateRequestedBy: req.session.userId,
      feedback
    };

    res.status(200).json(updatedReport);
  } catch (err) {
    const error = err as Error;
    logger.error('Error in PATCH /api/reports/:id/request-update:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});

export default router;