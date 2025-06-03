import express, { Router, Request, Response } from 'express';
import { gamificationService, GamificationAction } from '../services/gamification-service';
import { ensureAuthenticated } from '../middleware/auth';
import { Request } from 'express';
import logger from '../utils/logger';

const router = Router();

// Endpoint to record an action (internal or specific triggers)
// This might be called by other services rather than directly by client in some cases
router.post('/actions', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = req.session?.userId; // Get userId from session
  const { action, actionDetailsId } = req.body as { action: GamificationAction, actionDetailsId?: number };

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  if (!action) {
    return res.status(400).json({ message: 'Action type is required' });
  }

  try {
    await gamificationService.recordAction(userId, action, actionDetailsId);
    res.status(200).json({ message: 'Action recorded successfully' });
  } catch (error) {
    logger.error('Error recording gamification action:', error);
    res.status(500).json({ message: 'Failed to record action' });
  }
});

// Endpoint to get a user's gamification profile (points, badges, rank)
router.get('/profile', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const profile = await gamificationService.getUserProfile(userId);
    res.status(200).json(profile);
  } catch (error) {
    logger.error('Error fetching gamification profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Endpoint to get leaderboards
router.get('/leaderboard/:type', async (req: Request, res: Response) => {
  const type = req.params.type as 'weekly' | 'overall';
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  if (type !== 'weekly' && type !== 'overall') {
    return res.status(400).json({ message: 'Invalid leaderboard type' });
  }

  try {
    const leaderboard = await gamificationService.getLeaderboard(type, limit);
    res.status(200).json(leaderboard);
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

export default router;
