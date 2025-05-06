import { Router } from 'express';
import { aiAnalyticsService } from '../services/ai-analytics-service';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Schema for date range validation
 */
const dateRangeSchema = z.object({
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val))
});

/**
 * Schema for report analysis request
 */
const reportAnalysisSchema = z.object({
  content: z.string().min(10, "Report content must be at least 10 characters")
});

/**
 * Schema for station prediction request
 */
const stationPredictionSchema = z.object({
  stationId: z.number().optional()
});

/**
 * GET /api/analytics/dashboard
 * Get the analytics dashboard data
 */
router.get('/dashboard', requireAuth(['admin']), async (req, res) => {
  try {
    // Parse date range from query params if provided
    let timeRange;
    if (req.query.startDate && req.query.endDate) {
      const result = dateRangeSchema.safeParse({
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
      
      if (result.success) {
        timeRange = {
          start: result.data.startDate,
          end: result.data.endDate
        };
      }
    }
    
    const analyticsData = await aiAnalyticsService.getDashboardAnalytics(timeRange);
    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics dashboard data:', error);
    res.status(500).json({ 
      message: 'Failed to fetch analytics data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analytics/analyze-report
 * Analyze a report using AI
 */
router.post('/analyze-report', requireAuth(), async (req, res) => {
  try {
    const result = reportAnalysisSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: result.error.format() 
      });
    }
    
    const analysis = await aiAnalyticsService.analyzeReport(result.data.content);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing report:', error);
    res.status(500).json({ 
      message: 'Failed to analyze report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analytics/predict-issues
 * Predict potential issues
 */
router.post('/predict-issues', requireAuth(['admin']), async (req, res) => {
  try {
    const result = stationPredictionSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: result.error.format() 
      });
    }
    
    const predictions = await aiAnalyticsService.predictPotentialIssues(result.data.stationId);
    res.json(predictions);
  } catch (error) {
    console.error('Error predicting issues:', error);
    res.status(500).json({ 
      message: 'Failed to predict potential issues',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analytics/generate-report
 * Generate a comprehensive report
 */
router.post('/generate-report', requireAuth(['admin']), async (req, res) => {
  try {
    const result = dateRangeSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid date range',
        errors: result.error.format() 
      });
    }
    
    const report = await aiAnalyticsService.generateComprehensiveReport(
      result.data.startDate,
      result.data.endDate
    );
    
    res.json({ report });
  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    res.status(500).json({ 
      message: 'Failed to generate report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;