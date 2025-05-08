/**
 * News-Enhanced Predictions API Routes
 * 
 * This module provides routes for election predictions enhanced with Jamaican political news data.
 * The system combines historical incident data with real-time news about Jamaican politics
 * to provide more accurate predictions of potential election issues.
 */

import { Router } from 'express';
import { storage } from '../storage';
import { analyzeIncidentPatternsWithGemini } from '../services/google-ai-service';
import { getLatestJamaicanPoliticalNews } from '../services/news-service';
import * as logger from '../utils/logger';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/admin/analytics/news-enhanced-predictions
 * Get election issue predictions enhanced with Jamaican political news data
 * Admin-only endpoint
 */
router.get('/news-enhanced-predictions', ensureAdmin, async (req, res) => {
  try {
    logger.info('Generating news-enhanced predictions');
    
    // Get the station ID if provided
    const stationId = req.query.stationId ? parseInt(req.query.stationId as string) : undefined;
    
    // Fetch reports to analyze - combine submitted and in-progress reports
    const reports = [...await storage.getReportsByStatus('submitted'),
                     ...await storage.getReportsByStatus('in_progress')];
    
    if (reports.length === 0) {
      return res.status(200).json({
        predictions: [],
        newsArticles: [],
        message: 'Insufficient data for analysis. No historical reports found.'
      });
    }
    
    // Enrich reports with station names
    const enrichedReports = await Promise.all(reports.map(async (report) => {
      if (report.stationId) {
        const station = await storage.getPollingStation(report.stationId);
        return {
          ...report,
          stationName: station ? station.name : `Station ${report.stationId}`
        };
      }
      return report;
    }));
    
    // Fetch news data
    const newsArticles = await getLatestJamaicanPoliticalNews(14); // Get news from the past 14 days
    
    if (newsArticles.length === 0) {
      logger.warn('No news articles found for enhanced predictions');
    } else {
      logger.info(`Found ${newsArticles.length} news articles for enhanced predictions`);
    }
    
    // Generate predictions with news data
    const predictions = await analyzeIncidentPatternsWithGemini(
      enrichedReports, 
      stationId,
      newsArticles
    );
    
    // Return predictions and the news articles that informed them
    return res.status(200).json({
      predictions,
      // Only return the most relevant news articles (relevanceScore > 0.3)
      newsArticles: newsArticles
        .filter(article => article.relevanceScore > 0.3)
        .map(article => ({
          title: article.title,
          source: article.source,
          publishedAt: article.publishedAt,
          summary: article.summary,
          url: article.url,
          relevanceScore: article.relevanceScore,
          locations: article.locations
        }))
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error generating news-enhanced predictions:', errorMessage);
    res.status(500).json({ message: 'Failed to generate predictions', error: errorMessage });
  }
});

/**
 * GET /api/admin/news/jamaica
 * Get latest Jamaican political news (without predictions)
 * Admin-only endpoint
 */
router.get('/news/jamaica', ensureAdmin, async (req, res) => {
  try {
    // Number of days to look back
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    
    // Fetch news articles
    const newsArticles = await getLatestJamaicanPoliticalNews(days);
    
    // Filter and format for response
    const formattedArticles = newsArticles
      .filter(article => article.relevanceScore > 0.2) // Only return somewhat relevant articles
      .map(article => ({
        title: article.title,
        source: article.source,
        publishedAt: article.publishedAt,
        summary: article.summary,
        url: article.url,
        relevanceScore: article.relevanceScore,
        locations: article.locations
      }));
    
    return res.status(200).json({
      articles: formattedArticles,
      totalCount: formattedArticles.length,
      searchDays: days
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching Jamaican political news:', errorMessage);
    res.status(500).json({ message: 'Failed to fetch news', error: errorMessage });
  }
});

export default router;