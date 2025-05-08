import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth';
import { db } from '../db';
import { eq, and, gte, count, sql } from 'drizzle-orm';
import {
  users,
  reports,
  pollingStations,
  assignments,
} from '@shared/schema';
import { analyzeIncidentPatternsWithGemini } from '../services/google-ai-service';
import { getLatestJamaicanPoliticalNews } from '../services/news-service';
import * as logger from '../utils/logger';

const router = Router();

// Middleware chain is already imported from auth.ts, no need to redefine it here
// The ensureAuthenticated and ensureAdmin middleware are already defined and imported

// Get analytics summary
router.get('/summary', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const timeRangeParam = req.query.timeRange as string || '7d';
    
    // Calculate the start date based on the time range
    const getStartDate = (timeRange: string): Date => {
      const now = new Date();
      switch (timeRange) {
        case '1d':
          now.setDate(now.getDate() - 1);
          break;
        case '7d':
          now.setDate(now.getDate() - 7);
          break;
        case '30d':
          now.setDate(now.getDate() - 30);
          break;
        case '90d':
          now.setDate(now.getDate() - 90);
          break;
        case 'all':
          now.setFullYear(2000); // Set to a date far in the past
          break;
        default:
          now.setDate(now.getDate() - 7); // Default to 7 days
      }
      return now;
    };
    
    const startDate = getStartDate(timeRangeParam);
    
    // Get total user count
    const userCount = await storage.getTotalUserCount();
    
    // Get active observer count
    const activeObservers = await storage.getActiveObserverCount();
    
    // Get report counts
    const reportCountByStatus = await storage.getReportCountByStatus();
    const resolvedCount = reportCountByStatus['resolved'] || 0;
    const totalReportCount = Object.values(reportCountByStatus).reduce((acc, count) => acc + count, 0);
    const resolvedIssuesRate = totalReportCount > 0 ? Math.round((resolvedCount / totalReportCount) * 100) : 0;
    
    // Get assignment counts
    const completedAssignments = await db
      .select({ count: count() })
      .from(assignments)
      .where(
        and(
          eq(assignments.status, 'completed'),
          sql`${assignments.startDate} >= ${startDate.toISOString()}`
        )
      ).then(result => result[0]?.count || 0);
    
    const pendingAssignments = await db
      .select({ count: count() })
      .from(assignments)
      .where(
        and(
          eq(assignments.status, 'scheduled'),
          sql`${assignments.startDate} >= ${startDate.toISOString()}`
        )
      ).then(result => result[0]?.count || 0);
    
    // Get stations with issues
    const stationsWithIssues = await storage.getStationsWithIssueReports();
    
    // Get critical issues count
    const criticalIssues = await db
      .select({ count: count() })
      .from(reports)
      .where(
        and(
          sql`${reports.content}->>'severity' = 'critical'`,
          sql`${reports.submittedAt} >= ${startDate.toISOString()}`
        )
      ).then(result => result[0]?.count || 0);
    
    const summary = {
      userCount,
      activeObservers,
      reportCount: totalReportCount,
      completedAssignments,
      pendingAssignments,
      stationsWithIssues: stationsWithIssues.length,
      criticalIssues,
      resolvedIssuesRate
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get user statistics
router.get('/users', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const timeRangeParam = req.query.timeRange as string || '7d';
    
    // Calculate the start date based on the time range
    const getStartDate = (timeRange: string): Date => {
      const now = new Date();
      switch (timeRange) {
        case '1d':
          now.setDate(now.getDate() - 1);
          break;
        case '7d':
          now.setDate(now.getDate() - 7);
          break;
        case '30d':
          now.setDate(now.getDate() - 30);
          break;
        case '90d':
          now.setDate(now.getDate() - 90);
          break;
        case 'all':
          now.setFullYear(2000); // Set to a date far in the past
          break;
        default:
          now.setDate(now.getDate() - 7); // Default to 7 days
      }
      return now;
    };
    
    const startDate = getStartDate(timeRangeParam);
    
    // Get user count by role
    const userCountByRole = await storage.getUserCountByRole();
    
    // Format the data for the frontend
    const roleColors = {
      admin: '#4F46E5',
      supervisor: '#8B5CF6',
      observer: '#10B981',
      coordinator: '#EC4899',
      staff: '#F59E0B',
      guest: '#6B7280',
    };
    
    const userStats = Object.entries(userCountByRole).map(([role, count]) => ({
      role,
      count,
      color: roleColors[role as keyof typeof roleColors] || '#6B7280',
    }));
    
    res.json(userStats);
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Get report type statistics
router.get('/reports/types', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const timeRangeParam = req.query.timeRange as string || '7d';
    
    // Calculate the start date based on the time range
    const getStartDate = (timeRange: string): Date => {
      const now = new Date();
      switch (timeRange) {
        case '1d':
          now.setDate(now.getDate() - 1);
          break;
        case '7d':
          now.setDate(now.getDate() - 7);
          break;
        case '30d':
          now.setDate(now.getDate() - 30);
          break;
        case '90d':
          now.setDate(now.getDate() - 90);
          break;
        case 'all':
          now.setFullYear(2000); // Set to a date far in the past
          break;
        default:
          now.setDate(now.getDate() - 7); // Default to 7 days
      }
      return now;
    };
    
    const startDate = getStartDate(timeRangeParam);
    
    // Get report count by type
    const reportCountByType = await storage.getReportCountByType();
    
    // Format the data for the frontend
    const typeColors = {
      incident: '#EF4444',
      observation: '#3B82F6',
      process: '#10B981',
      security: '#F59E0B',
      infrastructure: '#8B5CF6',
      other: '#6B7280',
    };
    
    const reportTypeStats = Object.entries(reportCountByType).map(([type, count]) => ({
      type,
      count,
      color: typeColors[type as keyof typeof typeColors] || '#6B7280',
    }));
    
    res.json(reportTypeStats);
  } catch (error) {
    console.error('Error fetching report type statistics:', error);
    res.status(500).json({ error: 'Failed to fetch report type statistics' });
  }
});

// Get report status statistics
router.get('/reports/status', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const timeRangeParam = req.query.timeRange as string || '7d';
    
    // Calculate the start date based on the time range
    const getStartDate = (timeRange: string): Date => {
      const now = new Date();
      switch (timeRange) {
        case '1d':
          now.setDate(now.getDate() - 1);
          break;
        case '7d':
          now.setDate(now.getDate() - 7);
          break;
        case '30d':
          now.setDate(now.getDate() - 30);
          break;
        case '90d':
          now.setDate(now.getDate() - 90);
          break;
        case 'all':
          now.setFullYear(2000); // Set to a date far in the past
          break;
        default:
          now.setDate(now.getDate() - 7); // Default to 7 days
      }
      return now;
    };
    
    const startDate = getStartDate(timeRangeParam);
    
    // Get report count by status
    const reportCountByStatus = await storage.getReportCountByStatus();
    
    // Format the data for the frontend
    const statusColors = {
      submitted: '#F59E0B',
      in_progress: '#3B82F6',
      resolved: '#10B981',
      flagged: '#EF4444',
      closed: '#6B7280',
    };
    
    const reportStatusStats = Object.entries(reportCountByStatus).map(([status, count]) => ({
      status,
      count,
      color: statusColors[status as keyof typeof statusColors] || '#6B7280',
    }));
    
    res.json(reportStatusStats);
  } catch (error) {
    console.error('Error fetching report status statistics:', error);
    res.status(500).json({ error: 'Failed to fetch report status statistics' });
  }
});

// Get stations with issues
router.get('/stations/issues', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const timeRangeParam = req.query.timeRange as string || '7d';
    
    // Calculate the start date based on the time range
    const getStartDate = (timeRange: string): Date => {
      const now = new Date();
      switch (timeRange) {
        case '1d':
          now.setDate(now.getDate() - 1);
          break;
        case '7d':
          now.setDate(now.getDate() - 7);
          break;
        case '30d':
          now.setDate(now.getDate() - 30);
          break;
        case '90d':
          now.setDate(now.getDate() - 90);
          break;
        case 'all':
          now.setFullYear(2000); // Set to a date far in the past
          break;
        default:
          now.setDate(now.getDate() - 7); // Default to 7 days
      }
      return now;
    };
    
    const startDate = getStartDate(timeRangeParam);
    
    // Get stations with issues
    const stationsWithIssues = await storage.getStationsWithIssueReports();
    
    // For each station, get the number of critical issues and the last reported time
    const enhancedStationData = await Promise.all(
      stationsWithIssues.map(async (station) => {
        // Get critical issue count
        const criticalCount = await db
          .select({ count: count() })
          .from(reports)
          .where(
            and(
              eq(reports.stationId, station.id),
              sql`${reports.content}->>'severity' = 'critical'`,
              sql`${reports.submittedAt} >= ${startDate.toISOString()}`
            )
          ).then(result => result[0]?.count || 0);
        
        // Get the latest report time
        const latestReport = await db
          .select({ submittedAt: reports.submittedAt })
          .from(reports)
          .where(
            and(
              eq(reports.stationId, station.id),
              sql`${reports.submittedAt} >= ${startDate.toISOString()}`
            )
          )
          .orderBy(sql`${reports.submittedAt} DESC`)
          .limit(1)
          .then(result => result[0]);
        
        return {
          id: station.id,
          name: station.name,
          issueCount: station.issueCount,
          criticalCount,
          lastReportedTime: latestReport?.submittedAt || new Date().toISOString()
        };
      })
    );
    
    // Sort by issue count (descending)
    enhancedStationData.sort((a, b) => b.issueCount - a.issueCount);
    
    res.json(enhancedStationData);
  } catch (error) {
    console.error('Error fetching stations with issues:', error);
    res.status(500).json({ error: 'Failed to fetch stations with issues' });
  }
});

// Get daily activity data
router.get('/daily-activity', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const timeRangeParam = req.query.timeRange as string || '7d';
    
    // Calculate the start date based on the time range
    const getStartDate = (timeRange: string): Date => {
      const now = new Date();
      switch (timeRange) {
        case '1d':
          now.setDate(now.getDate() - 1);
          break;
        case '7d':
          now.setDate(now.getDate() - 7);
          break;
        case '30d':
          now.setDate(now.getDate() - 30);
          break;
        case '90d':
          now.setDate(now.getDate() - 90);
          break;
        case 'all':
          now.setFullYear(now.getFullYear() - 1); // Set to 1 year ago
          break;
        default:
          now.setDate(now.getDate() - 7); // Default to 7 days
      }
      return now;
    };
    
    const startDate = getStartDate(timeRangeParam);
    
    // Get the number of days to fetch
    const getDaysCount = (timeRange: string): number => {
      switch (timeRange) {
        case '1d':
          return 1;
        case '7d':
          return 7;
        case '30d':
          return 30;
        case '90d':
          return 90;
        case 'all':
          return 365; // Show up to a year of data
        default:
          return 7; // Default to 7 days
      }
    };
    
    const daysCount = getDaysCount(timeRangeParam);
    
    // Generate daily activity data
    const dailyActivity = [];
    
    for (let i = 0; i < daysCount; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - (daysCount - 1 - i));
      
      const dateString = currentDate.toISOString().split('T')[0];
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Get new users for the day
      const newUsers = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            sql`${users.createdAt} >= ${dateString}`,
            sql`${users.createdAt} < ${nextDate.toISOString()}`
          )
        ).then(result => result[0]?.count || 0);
      
      // Get new reports for the day
      const newReports = await db
        .select({ count: count() })
        .from(reports)
        .where(
          and(
            sql`${reports.submittedAt} >= ${dateString}`,
            sql`${reports.submittedAt} < ${nextDate.toISOString()}`
          )
        ).then(result => result[0]?.count || 0);
      
      // Get active observers for the day (those with assignments)
      const activeObservers = await db
        .select({ count: sql`COUNT(DISTINCT ${assignments.userId})` })
        .from(assignments)
        .where(
          and(
            sql`${assignments.startDate} >= ${dateString}`,
            sql`${assignments.startDate} < ${nextDate.toISOString()}`
          )
        ).then(result => Number(result[0]?.count) || 0);
      
      dailyActivity.push({
        date: dateString,
        newUsers,
        newReports,
        activeObservers
      });
    }
    
    res.json(dailyActivity);
  } catch (error) {
    console.error('Error fetching daily activity data:', error);
    res.status(500).json({ error: 'Failed to fetch daily activity data' });
  }
});

// Get incident predictions with news integration
router.get('/incident-predictions', ensureAdmin, async (req: Request, res: Response) => {
  try {
    logger.info('Admin requested incident predictions with Jamaican news integration');
    
    // Get polling station ID if provided
    const stationId = req.query.stationId ? parseInt(req.query.stationId as string) : undefined;
    
    // Fetch all relevant reports from storage
    const reports = await storage.getReportsByStatus('submitted')
      .concat(await storage.getReportsByStatus('in_progress'));
    
    if (reports.length === 0) {
      return res.status(200).json({
        predictions: [],
        newsArticles: [],
        message: 'Insufficient data for analysis. No active reports found.'
      });
    }
    
    // Enrich reports with station names for better context in predictions
    const enrichedReports = await Promise.all(reports.map(async (report) => {
      if (report.pollingStationId) {
        const station = await storage.getPollingStation(report.pollingStationId);
        return {
          ...report,
          stationName: station ? station.name : `Station ${report.pollingStationId}`
        };
      }
      return report;
    }));
    
    // Fetch recent news about Jamaican politics (last 14 days)
    const newsArticles = await getLatestJamaicanPoliticalNews(14);
    
    if (newsArticles.length === 0) {
      logger.warn('No news articles found for enhanced predictions');
    } else {
      logger.info(`Found ${newsArticles.length} news articles for enhanced predictions`);
    }
    
    // Generate predictions using Google Gemini with news integration
    const predictions = await analyzeIncidentPatternsWithGemini(
      enrichedReports,
      stationId,
      newsArticles
    );
    
    // Return both predictions and the news articles that informed them
    return res.status(200).json({
      predictions,
      // Only return the most relevant news articles (relevanceScore > 0.3)
      newsArticles: newsArticles
        .filter(article => article.relevanceScore > 0.3)
        .slice(0, 10) // Limit to 10 articles
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
    logger.error('Error generating incident predictions with news integration:', errorMessage);
    res.status(500).json({ 
      message: 'Failed to generate predictions', 
      error: errorMessage 
    });
  }
});

// Get latest Jamaican political news
router.get('/news/jamaica', ensureAdmin, async (req: Request, res: Response) => {
  try {
    // Get days parameter (default to 7 days)
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
        keywords: article.keywords,
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
    res.status(500).json({ 
      message: 'Failed to fetch news', 
      error: errorMessage 
    });
  }
});

export default router;