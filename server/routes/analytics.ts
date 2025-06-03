import { Router } from 'express';
import { aiAnalyticsService } from '../services/ai-analytics-service';
import { ensureAuthenticated, ensureAdmin, hasPermission } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Get analytics dashboard data
router.get('/dashboard', ensureAuthenticated, hasPermission('analytics:view-dashboard'), async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const data = await aiAnalyticsService.getDashboardData(startDate, endDate);
    return res.json(data);
  } catch (error) {
    logger.error('Error fetching analytics dashboard data:', error);
    return res.status(500).json({ message: 'Failed to fetch analytics data' });
  }
});

// Predict potential issues
router.post('/predict-issues', ensureAuthenticated, hasPermission('analytics:predict-issues'), async (req, res) => {
  try {
    const { stationId } = req.body;
    const predictions = await aiAnalyticsService.predictIssues(stationId);
    return res.json(predictions);
  } catch (error) {
    logger.error('Error predicting issues:', error);
    return res.status(500).json({ message: 'Failed to predict issues' });
  }
});

// Generate comprehensive report
router.post('/generate-report', ensureAuthenticated, hasPermission('analytics:generate-report'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const report = await aiAnalyticsService.generateComprehensiveReport(
      new Date(startDate), 
      new Date(endDate)
    );
    
    return res.json({ report });
  } catch (error) {
    logger.error('Error generating report:', error);
    return res.status(500).json({ message: 'Failed to generate report' });
  }
});

export default router;