import { Router } from 'express';
import { storage } from '../storage';
import { insertAchievementSchema, insertUserAchievementSchema, insertLeaderboardSchema } from '@shared/schema';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Get all achievements
router.get('/achievements', ensureAuthenticated, async (req, res) => {
  try {
    const achievements = await storage.getAllAchievements();
    res.json(achievements);
  } catch (error) {
    logger.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get user's achievements
router.get('/user/:userId/achievements', ensureAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const achievements = await storage.getUserAchievements(userId);
    res.json(achievements);
  } catch (error) {
    logger.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
});

// Get user's game profile
router.get('/user/:userId/profile', ensureAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    let profile = await storage.getUserGameProfile(userId);
    
    if (!profile) {
      // Create initial profile if it doesn't exist
      profile = await storage.createUserGameProfile({ userId });
    }
    
    res.json(profile);
  } catch (error) {
    logger.error('Error fetching user game profile:', error);
    res.status(500).json({ error: 'Failed to fetch user game profile' });
  }
});

// Update user activity streak
router.post('/user/:userId/activity', ensureAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const profile = await storage.updateUserStreak(userId);
    res.json(profile);
  } catch (error) {
    logger.error('Error updating user activity:', error);
    res.status(500).json({ error: 'Failed to update user activity' });
  }
});

// Award achievement to user
router.post('/user/:userId/award/:achievementId', ensureAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const achievementId = parseInt(req.params.achievementId);
    
    const awarded = await storage.awardAchievement(userId, achievementId);
    res.json(awarded);
  } catch (error) {
    logger.error('Error awarding achievement:', error);
    res.status(500).json({ error: 'Failed to award achievement' });
  }
});

// Check achievement progress
router.get('/user/:userId/progress/:achievementId', ensureAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const achievementId = parseInt(req.params.achievementId);
    
    const progress = await storage.getAchievementProgress(userId, achievementId);
    res.json(progress || { currentProgress: 0, targetProgress: 1 });
  } catch (error) {
    logger.error('Error fetching achievement progress:', error);
    res.status(500).json({ error: 'Failed to fetch achievement progress' });
  }
});

// Update achievement progress
router.post('/user/:userId/progress/:achievementId', ensureAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const achievementId = parseInt(req.params.achievementId);
    const { progress, progressData } = req.body;
    
    const updated = await storage.updateAchievementProgress(userId, achievementId, progress, progressData);
    
    // Check if achievement should be awarded
    const achievement = await storage.getAchievement(achievementId);
    if (achievement && progress >= updated.targetProgress) {
      const alreadyEarned = await storage.checkAchievementEarned(userId, achievementId);
      if (!alreadyEarned) {
        await storage.awardAchievement(userId, achievementId);
      }
    }
    
    res.json(updated);
  } catch (error) {
    logger.error('Error updating achievement progress:', error);
    res.status(500).json({ error: 'Failed to update achievement progress' });
  }
});

// Get leaderboards
router.get('/leaderboards', ensureAuthenticated, async (req, res) => {
  try {
    const leaderboards = await storage.getActiveLeaderboards();
    res.json(leaderboards);
  } catch (error) {
    logger.error('Error fetching leaderboards:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboards' });
  }
});

// Get leaderboard entries
router.get('/leaderboards/:id/entries', ensureAuthenticated, async (req, res) => {
  try {
    const leaderboardId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 10;
    
    const entries = await storage.getLeaderboardEntries(leaderboardId, limit);
    res.json(entries);
  } catch (error) {
    logger.error('Error fetching leaderboard entries:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard entries' });
  }
});

// Admin routes for managing achievements
router.post('/admin/achievements', ensureAdmin, async (req, res) => {
  try {
    const validatedData = insertAchievementSchema.parse(req.body);
    const achievement = await storage.createAchievement(validatedData);
    res.status(201).json(achievement);
  } catch (error) {
    logger.error('Error creating achievement:', error);
    res.status(500).json({ error: 'Failed to create achievement' });
  }
});

router.put('/admin/achievements/:id', ensureAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const achievement = await storage.updateAchievement(id, req.body);
    res.json(achievement);
  } catch (error) {
    logger.error('Error updating achievement:', error);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

router.delete('/admin/achievements/:id', ensureAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteAchievement(id);
    res.json({ success });
  } catch (error) {
    logger.error('Error deleting achievement:', error);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

router.post('/admin/leaderboards', ensureAdmin, async (req, res) => {
  try {
    const validatedData = insertLeaderboardSchema.parse(req.body);
    const leaderboard = await storage.createLeaderboard(validatedData);
    res.status(201).json(leaderboard);
  } catch (error) {
    logger.error('Error creating leaderboard:', error);
    res.status(500).json({ error: 'Failed to create leaderboard' });
  }
});

export default router;