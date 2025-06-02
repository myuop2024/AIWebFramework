import { HfInference } from '@huggingface/inference';
import { db } from '../db'; 
import { reports, users, pollingStations } from '@shared/schema';
import { eq, and, or, sql, desc, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import type { Report } from '@shared/schema';
import { analyzeIncidentPatternsWithGemini, IncidentPrediction } from './google-ai-service';
import logger from '../utils/logger';

// Initialize Hugging Face client with API token
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Models to use for different analytics tasks
const MODELS = {
  textClassification: 'distilbert-base-uncased-finetuned-sst-2-english',
  textGeneration: 'gpt2',
  zeroShotClassification: 'facebook/bart-large-mnli',
  summarization: 'facebook/bart-large-cnn',
  questionAnswering: 'deepset/roberta-base-squad2',
};

// Categories for reports classification
const REPORT_CATEGORIES = [
  'voter intimidation',
  'ballot issues',
  'polling station logistics',
  'voter eligibility disputes',
  'counting irregularities',
  'technology issues',
  'accessibility problems',
  'observer rights violation',
  'violence',
  'general issues'
];

export interface AnalyticsInsight {
  insight: string;
  confidence: number;
  category: string;
  relatedReportIds: number[];
}

export interface AnalyticsTrend {
  category: string;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
}

export interface AnalyticsReportStats {
  totalReports: number;
  pendingReports: number;
  reviewedReports: number;
  criticalReports: number;
}

export interface LocationReport {
  locationName: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface AnalyticsDashboardData {
  reportStats: AnalyticsReportStats;
  recentTrends: AnalyticsTrend[];
  aiInsights: AnalyticsInsight[];
  reportsByLocation: LocationReport[];
  topIssueCategories: CategoryStats[];
}

export interface PredictedIssue {
  issueType: string;
  probability: number;
  suggestedAction: string;
}

export class AIAnalyticsService {
  // Main dashboard analytics data
  async getDashboardData(startDate?: Date, endDate?: Date): Promise<AnalyticsDashboardData> {
    try {
      // Apply date filters if provided
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      // Get report statistics
      const reportStats = await this.getReportStats(dateFilter);
      
      // Get top issue categories
      const topIssueCategories = await this.getTopIssueCategories(dateFilter);
      
      // Get location-based report data
      const reportsByLocation = await this.getReportsByLocation(dateFilter);
      
      // Get trend data over time periods
      const recentTrends = await this.getRecentTrends(dateFilter);
      
      // Generate AI insights from report content
      const aiInsights = await this.generateAIInsights(dateFilter);
            
      return {
        reportStats,
        recentTrends,
        aiInsights,
        reportsByLocation,
        topIssueCategories,
      };
    } catch (error) {
      logger.error('Error generating analytics dashboard data', { error: error instanceof Error ? error : new Error(String(error)), startDate, endDate });
      throw new Error('Failed to generate analytics data');
    }
  }
  
  // Build date range filter for queries
  private buildDateFilter(startDate?: Date, endDate?: Date) {
    if (startDate && endDate) {
      return and(
        sql`${reports.createdAt} >= ${startDate}`,
        sql`${reports.createdAt} <= ${endDate}`
      );
    }
    
    if (startDate) {
      return sql`${reports.createdAt} >= ${startDate}`;
    }
    
    if (endDate) {
      return sql`${reports.createdAt} <= ${endDate}`;
    }
    
    return undefined;
  }
  
  // Get overall report statistics
  private async getReportStats(dateFilter?: any): Promise<AnalyticsReportStats> {
    try {
      // Get total reports
      const totalReportsQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(dateFilter || sql`1=1`);
      
      // Get pending reports
      const pendingReportsQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(dateFilter ? 
          and(eq(reports.status, 'pending'), dateFilter) : 
          eq(reports.status, 'pending')
        );
      
      // Get reviewed reports
      const reviewedReportsQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(dateFilter ? 
          and(eq(reports.status, 'reviewed'), dateFilter) : 
          eq(reports.status, 'reviewed')
        );
      
      // Get critical reports
      const criticalReportsQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(dateFilter ? 
          and(eq(reports.severity, 'critical'), dateFilter) : 
          eq(reports.severity, 'critical')
        );
      
      const totalReports = totalReportsQuery[0]?.count || 0;
      const pendingReports = pendingReportsQuery[0]?.count || 0;
      const reviewedReports = reviewedReportsQuery[0]?.count || 0;
      const criticalReports = criticalReportsQuery[0]?.count || 0;
      
      return {
        totalReports,
        pendingReports,
        reviewedReports,
        criticalReports,
      };
    } catch (error) {
      console.error('Error fetching report stats:', error);
      return {
        totalReports: 0,
        pendingReports: 0,
        reviewedReports: 0,
        criticalReports: 0
      };
    }
  }
  
  // Get report data grouped by location
  private async getReportsByLocation(dateFilter?: any): Promise<LocationReport[]> {
    try {
      // Get reports grouped by polling station
      const reportsByStationQuery = await db
        .select({
          stationId: reports.pollingStationId,
          count: sql<number>`count(*)`,
        })
        .from(reports)
        .where(dateFilter || sql`1=1`)
        .groupBy(reports.pollingStationId)
        .orderBy(sql`count(*) desc`)
        .limit(10);
      
      // Get station names and enrich data
      const locationReports: LocationReport[] = [];
      
      for (const reportGroup of reportsByStationQuery) {
        if (!reportGroup.stationId) continue;
        
        const station = await db
          .select({
            name: pollingStations.name,
          })
          .from(pollingStations)
          .where(eq(pollingStations.id, reportGroup.stationId))
          .limit(1);
        
        // Calculate severity based on count thresholds
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (reportGroup.count > 10) {
          severity = 'high';
        } else if (reportGroup.count > 5) {
          severity = 'medium';
        }
        
        if (station[0]) {
          locationReports.push({
            locationName: station[0].name || `Station ID: ${reportGroup.stationId}`,
            count: reportGroup.count,
            severity,
          });
        }
      }
      
      return locationReports;
    } catch (error) {
      logger.error('Error fetching reports by location', { error: error instanceof Error ? error : new Error(String(error)), dateFilter });
      return [];
    }
  }
  
  // Get top issue categories from reports
  private async getTopIssueCategories(dateFilter?: any): Promise<CategoryStats[]> {
    try {
      // Get reports grouped by category
      const categoryCounts: Record<string, number> = {};
      const totalReportsQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(dateFilter || sql`1=1`);
      
      const totalReports = totalReportsQuery[0]?.count || 0;
      
      if (totalReports === 0) {
        return [];
      }
      
      // Get reports with category information
      const reportData = await db
        .select({
          id: reports.id,
          content: reports.content,
          category: reports.category,
        })
        .from(reports)
        .where(dateFilter || sql`1=1`);
      
      // Count reports by category
      for (const report of reportData) {
        const category = report.category || await this.classifyReportContent(report);
        if (category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      }
      
      // Convert to array and calculate percentages
      const result = Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalReports) * 100),
      }));
      
      // Sort by count descending
      return result.sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error('Error fetching top issue categories', { error: error instanceof Error ? error : new Error(String(error)), dateFilter });
      return [];
    }
  }
  
  // Analyze trends over time
  private async getRecentTrends(dateFilter?: any): Promise<AnalyticsTrend[]> {
    try {
      // Get current period data
      const currentPeriodReports = await db
        .select({
          id: reports.id,
          content: reports.content,
          category: reports.category,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(dateFilter || sql`1=1`);
      
      // Calculate previous period dates
      const now = new Date();
      const currentPeriodStart = new Date();
      currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);
      
      const previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
      
      const previousPeriodStart = new Date(previousPeriodEnd);
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
      
      // Get previous period data
      const previousPeriodReports = await db
        .select({
          id: reports.id,
          content: reports.content,
          category: reports.category,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(
          and(
            gte(reports.createdAt, previousPeriodStart),
            lte(reports.createdAt, previousPeriodEnd)
          )
        );
      
      // Categorize reports for both periods
      const currentPeriodCategories: Record<string, number> = {};
      const previousPeriodCategories: Record<string, number> = {};
      
      // Process current period
      for (const report of currentPeriodReports) {
        const category = report.category || await this.classifyReportContent(report);
        if (category) {
          currentPeriodCategories[category] = (currentPeriodCategories[category] || 0) + 1;
        }
      }
      
      // Process previous period
      for (const report of previousPeriodReports) {
        const category = report.category || await this.classifyReportContent(report);
        if (category) {
          previousPeriodCategories[category] = (previousPeriodCategories[category] || 0) + 1;
        }
      }
      
      // Calculate trends
      const trends: AnalyticsTrend[] = [];
      
      // Process all categories from current period
      for (const category of Object.keys(currentPeriodCategories)) {
        const currentCount = currentPeriodCategories[category] || 0;
        const previousCount = previousPeriodCategories[category] || 0;
        
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        let percentChange = 0;
        
        if (previousCount > 0) {
          percentChange = Math.round(((currentCount - previousCount) / previousCount) * 100);
          if (percentChange > 5) {
            trend = 'increasing';
          } else if (percentChange < -5) {
            trend = 'decreasing';
          }
        } else if (currentCount > 0) {
          trend = 'increasing';
          percentChange = 100; // New category
        }
        
        trends.push({
          category,
          count: currentCount,
          trend,
          percentChange,
        });
      }
      
      // Sort by count and then by percent change
      return trends
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return Math.abs(b.percentChange) - Math.abs(a.percentChange);
        })
        .slice(0, 10);
    } catch (error) {
      logger.error('Error calculating trends', { error: error instanceof Error ? error : new Error(String(error)), dateFilter });
      return [];
    }
  }
  
  // Cache for AI insights to prevent repeated calculations
  private static insightsCache = new Map<string, { data: AnalyticsInsight[], timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Generate AI insights from report data
  private async generateAIInsights(dateFilter?: any): Promise<AnalyticsInsight[]> {
    try {
      // Create cache key based on date filter
      const cacheKey = dateFilter ? JSON.stringify(dateFilter) : 'all';
      const cached = AIAnalyticsService.insightsCache.get(cacheKey);
      
      // Return cached data if still valid
      if (cached && Date.now() - cached.timestamp < AIAnalyticsService.CACHE_DURATION) {
        return cached.data;
      }

      // Get reports for analysis
      const reportData = await db
        .select({
          id: reports.id,
          content: reports.content,
          description: reports.description,
          category: reports.category,
          severity: reports.severity,
          status: reports.status,
        })
        .from(reports)
        .where(dateFilter || sql`1=1`)
        .orderBy(desc(reports.createdAt))
        .limit(100);
      
      if (reportData.length === 0) {
        return [];
      }
      
      // Prepare corpus for analysis
      const reportCorpus = reportData.map(report => {
        const content = typeof report.content === 'string' 
          ? report.content 
          : JSON.stringify(report.content);
          
        const description = report.description || '';
        
        return {
          id: report.id,
          text: `${description} ${content}`.trim(),
          category: report.category,
          severity: report.severity,
          status: report.status,
        };
      });
      
      // Group reports by category for pattern detection
      const reportsByCategory: Record<string, typeof reportCorpus> = {};
      
      for (const report of reportCorpus) {
        if (!report.category) continue;
        
        if (!reportsByCategory[report.category]) {
          reportsByCategory[report.category] = [];
        }
        
        reportsByCategory[report.category].push(report);
      }
      
      // Generate insights
      const insights: AnalyticsInsight[] = [];
      
      // Category-based insights
      for (const [category, categoryReports] of Object.entries(reportsByCategory)) {
        if (categoryReports.length < 3) continue;
        
        // For categories with enough reports, identify patterns
        const combinedText = categoryReports
          .map(r => r.text)
          .join(' ');
          
        // Use AI to extract patterns and generate insights
        try {
          const insight = await this.generateCategoryInsight(category, combinedText, categoryReports);
          if (insight) {
            insights.push(insight);
          }
        } catch (err) {
          logger.error(`Error generating insight for category ${category}`, { category, error: err instanceof Error ? err : new Error(String(err)) });
        }
      }
      
      // Location-based insights
      try {
        const locationInsights = await this.generateLocationBasedInsights(reportCorpus);
        insights.push(...locationInsights);
      } catch (err) {
        logger.error('Error generating location-based insights', { error: err instanceof Error ? err : new Error(String(err)) });
      }
      
      // Time-based insights
      try {
        const timeInsights = await this.generateTimeBasedInsights(reportCorpus);
        insights.push(...timeInsights);
      } catch (err) {
        logger.error('Error generating time-based insights', { error: err instanceof Error ? err : new Error(String(err)) });
      }
      
      // Cache the results
      AIAnalyticsService.insightsCache.set(cacheKey, {
        data: insights,
        timestamp: Date.now()
      });

      // Clean up old cache entries (keep only last 10)
      if (AIAnalyticsService.insightsCache.size > 10) {
        const entries = Array.from(AIAnalyticsService.insightsCache.entries());
        const oldestKey = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
        AIAnalyticsService.insightsCache.delete(oldestKey);
      }

      return insights;
    } catch (error) {
      logger.error('Error generating AI insights', { error: error instanceof Error ? error : new Error(String(error)), dateFilter });
      return [];
    }
  }
  
  // Generate category-specific insights
  private async generateCategoryInsight(
    category: string, 
    text: string, 
    reports: Array<{ id: number, text: string, category?: string, severity?: string, status?: string }>
  ): Promise<AnalyticsInsight | null> {
    try {
      // Generate prompt for the summarization model
      const prompt = `
        Analyze the following election observer reports about "${category}" issues:
        ---
        ${text.slice(0, 1000)} ${text.length > 1000 ? '...' : ''}
        ---
        Identify key patterns or insights that election administrators should know about.
        Focus on actionable information that could improve election integrity.
      `;
      
      // Generate insight using Hugging Face's summarization model
      const result = await hf.summarization({
        model: MODELS.summarization,
        inputs: prompt,
        parameters: {
          max_length: 100,
          min_length: 30,
        }
      });
      
      if (!result || !result.summary_text) {
        return null;
      }
      
      // Extract related report IDs
      const relatedReportIds = reports.map(r => r.id).slice(0, 5);
      
      // Calculate confidence based on number of reports and their severity
      const criticalReports = reports.filter(r => r.severity === 'critical').length;
      const confidence = Math.min(0.5 + (reports.length / 20) + (criticalReports / reports.length) * 0.3, 0.95);
      
      return {
        insight: result.summary_text,
        confidence,
        category,
        relatedReportIds,
      };
    } catch (error) {
      logger.error(`Error generating insight for category ${category}`, { category, error: error instanceof Error ? error : new Error(String(error)) });
      return null;
    }
  }
  
  // Generate insights based on polling station patterns
  private async generateLocationBasedInsights(
    reports: Array<{ id: number, text: string, category?: string, severity?: string, status?: string }>
  ): Promise<AnalyticsInsight[]> {
    // This is a simplified implementation that would be expanded with actual location data
    return [];
  }
  
  // Generate insights based on temporal patterns
  private async generateTimeBasedInsights(
    reports: Array<{ id: number, text: string, category?: string, severity?: string, status?: string }>
  ): Promise<AnalyticsInsight[]> {
    // This is a simplified implementation that would be expanded with temporal analysis
    return [];
  }
  
  // Classify report content to determine category
  private async classifyReportContent(report: { content?: any, id?: number }): Promise<string> {
    try {
      if (!report.content) return 'general issues';
      
      // Parse content if it's JSON
      let textContent = '';
      if (typeof report.content === 'string') {
        textContent = report.content;
      } else {
        try {
          // Extract text fields from JSON content
          const contentObj = report.content;
          textContent = Object.values(contentObj)
            .filter(value => typeof value === 'string')
            .join(' ');
        } catch (err) {
          textContent = JSON.stringify(report.content);
        }
      }
      
      if (!textContent || textContent.length < 10) {
        return 'general issues';
      }
      
      // Use zero-shot classification to categorize the report
      const classification = await hf.zeroShotClassification({
        model: MODELS.zeroShotClassification,
        inputs: textContent.slice(0, 1000), // Limit length for performance
        parameters: {
          candidate_labels: REPORT_CATEGORIES,
        }
      });
      
      if (classification && classification.labels && classification.labels.length > 0) {
        return classification.labels[0];
      }
      
      return 'general issues';
    } catch (error) {
      logger.error('Error classifying report content', { reportId: report?.id, error: error instanceof Error ? error : new Error(String(error)) });
      return 'general issues';
    }
  }
  
  // Predict potential issues for a specific polling station
  async predictIssues(stationId?: number): Promise<PredictedIssue[]> {
    try {
      // Get historical data for the station
      let stationReports = [];
      
      if (stationId) {
        // Get station-specific reports
        stationReports = await db
          .select({
            id: reports.id,
            content: reports.content,
            description: reports.description,
            category: reports.category,
            severity: reports.severity,
            status: reports.status,
            createdAt: reports.createdAt,
            pollingStationId: reports.pollingStationId,
          })
          .from(reports)
          .where(sql`${reports.pollingStationId} = ${stationId}`)
          .orderBy(desc(reports.createdAt));
          
        // Get station name for better context
        if (stationReports.length > 0) {
          const stationData = await db
            .select({
              name: pollingStations.name,
            })
            .from(pollingStations)
            .where(eq(pollingStations.id, stationId))
            .limit(1);
            
          if (stationData.length > 0) {
            // Add station name to all reports
            stationReports = stationReports.map(report => ({
              ...report,
              stationName: stationData[0].name
            }));
          }
        }
      } else {
        // Get system-wide reports for general predictions
        stationReports = await db
          .select({
            id: reports.id,
            content: reports.content,
            description: reports.description,
            category: reports.category,
            severity: reports.severity,
            status: reports.status,
            createdAt: reports.createdAt,
            pollingStationId: reports.pollingStationId,
          })
          .from(reports)
          .orderBy(desc(reports.createdAt))
          .limit(100);
          
        // Enrich with station names
        const stationIds = [...new Set(stationReports
          .map(r => r.pollingStationId)
          .filter(id => id !== null && id !== undefined))];
          
        if (stationIds.length > 0) {
          // Use a fallback query that handles empty arrays gracefully
          const stationIdList = stationIds.join(',');
          const stationNamesQuery = stationIdList ? 
            sql`${pollingStations.id} IN (${stationIdList})` : 
            sql`1=0`; // This ensures the query runs even with empty arrays
          
          const stationNames = await db
            .select({
              id: pollingStations.id,
              name: pollingStations.name,
            })
            .from(pollingStations)
            .where(stationNamesQuery);
            
          const stationMap = new Map(stationNames.map(s => [s.id, s.name]));
          
          stationReports = stationReports.map(report => ({
            ...report,
            stationName: report.pollingStationId ? 
              stationMap.get(report.pollingStationId) || `Station ${report.pollingStationId}` : 
              'Unknown station'
          }));
        }
      }
      
      // If no reports are found, return generic predictions
      if (!stationReports || stationReports.length === 0) {
        logger.info('No reports found for issue prediction, using generic predictions', { stationId });
        return this.getLegacyGenericPredictions();
      }
      
      try {
        logger.info(`Using Google Gemini for pattern analysis with ${stationReports.length} reports`, { stationId, reportCount: stationReports.length });
        // Use Google's Gemini model for advanced predictions with more context and reasoning
        const enhancedPredictions = await analyzeIncidentPatternsWithGemini(stationReports, stationId);
        
        // Convert the IncidentPrediction type to PredictedIssue type for backward compatibility
        return enhancedPredictions.map(prediction => ({
          issueType: prediction.issueType,
          probability: prediction.probability,
          suggestedAction: `${prediction.suggestedAction} ${prediction.estimatedImpact === 'high' ? '(HIGH PRIORITY)' : ''}`
        }));
      } catch (aiError) {
        logger.error('Error using Gemini for predictions, falling back to traditional analysis', { stationId, error: aiError instanceof Error ? aiError : new Error(String(aiError)) });
        
        // Fall back to our simpler analysis approach
        return this.generateFallbackPredictions(stationReports);
      }
    } catch (error) {
      logger.error('Error predicting issues', { stationId, error: error instanceof Error ? error : new Error(String(error)) });
      return this.getLegacyGenericPredictions();
    }
  }
  
  // Generate fallback predictions using simpler pattern analysis
  private async generateFallbackPredictions(stationReports: any[]): Promise<PredictedIssue[]> {
    try {
      logger.info('Using fallback prediction algorithm', { reportCount: stationReports.length });
      // Analyze patterns in reports
      const categoryCounts: Record<string, number> = {};
      const severityCounts: Record<string, number> = {};
      
      for (const report of stationReports) {
        const category = report.category || await this.classifyReportContent(report);
        if (category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
        
        if (report.severity) {
          severityCounts[report.severity] = (severityCounts[report.severity] || 0) + 1;
        }
      }
      
      // Find top categories
      const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);
      
      // Calculate severity trend
      const hasCritical = (severityCounts['critical'] || 0) > 0;
      const hasHigh = (severityCounts['high'] || 0) > 0;
      
      const predictions: PredictedIssue[] = [];
      
      // Generate predictions for top categories
      for (const category of sortedCategories) {
        const frequency = categoryCounts[category] / stationReports.length;
        const hasCriticalInCategory = stationReports.some(
          r => r.category === category && r.severity === 'critical'
        );
        
        let probability = frequency;
        if (hasCriticalInCategory) probability += 0.2;
        if (hasHigh) probability += 0.1;
        
        // Cap probability at 0.95
        probability = Math.min(probability, 0.95);
        
        const prediction: PredictedIssue = {
          issueType: `${category.charAt(0).toUpperCase() + category.slice(1)}`,
          probability,
          suggestedAction: this.getSuggestedAction(category, probability),
        };
        
        predictions.push(prediction);
      }
      
      // If we don't have enough predictions, add generic ones
      if (predictions.length < 3) {
        const genericPredictions = this.getLegacyGenericPredictions()
          .filter(p => !sortedCategories.includes(p.issueType.toLowerCase()));
        
        predictions.push(...genericPredictions.slice(0, 3 - predictions.length));
      }
      
      return predictions.sort((a, b) => b.probability - a.probability);
    } catch (error) {
      logger.error('Error in fallback prediction mechanism', { error: error instanceof Error ? error : new Error(String(error)), reportCount: stationReports.length });
      return this.getLegacyGenericPredictions();
    }
  }
  
  // Generate legacy generic predictions (for backward compatibility)
  private getLegacyGenericPredictions(): PredictedIssue[] {
    return [
      {
        issueType: 'Voter verification delays',
        probability: 0.7,
        suggestedAction: 'Ensure adequate staffing for voter ID verification and have backup procedures ready for high-volume periods.',
      },
      {
        issueType: 'Ballot shortages',
        probability: 0.5,
        suggestedAction: 'Maintain higher ballot reserves and establish quick-response distribution system for emergency ballot deliveries.',
      },
      {
        issueType: 'Technology failures',
        probability: 0.4,
        suggestedAction: 'Test all electronic systems 24 hours before election day and have paper backup systems ready to deploy.',
      },
    ];
  }
  
  // Get suggested action based on issue type
  private getSuggestedAction(category: string, probability: number): string {
    const actions: Record<string, string> = {
      'voter intimidation': 'Increase security presence and train poll workers on de-escalation techniques. Establish clear reporting protocols.',
      'ballot issues': 'Verify ballot inventory and distribution processes. Ensure backup ballots are available and proper handling procedures are followed.',
      'polling station logistics': 'Review station layout and staffing levels. Ensure adequate resources are allocated based on expected turnout.',
      'voter eligibility disputes': 'Provide additional training on voter ID requirements and provisional ballot procedures. Have up-to-date voter rolls available.',
      'counting irregularities': 'Implement double-verification procedures and ensure transparent counting processes with observer access.',
      'technology issues': 'Test all systems prior to election day and have technical support staff on standby. Prepare paper backups for all electronic processes.',
      'accessibility problems': 'Audit polling station for ADA compliance and provide additional accommodations for voters with disabilities.',
      'observer rights violation': 'Retrain polling staff on observer rights and establish clear protocols for resolving disputes with observers.',
      'violence': 'Coordinate with law enforcement for increased presence and develop emergency response procedures for polling stations.',
      'general issues': 'Conduct comprehensive staff training and develop detailed contingency plans for common issues.',
    };
    
    return actions[category] || 'Monitor the situation closely and ensure staff are prepared to address potential issues promptly.';
  }
  
  // Generate a comprehensive report for a specific time period
  async generateComprehensiveReport(startDate: Date, endDate: Date): Promise<string> {
    try {
      // Get analytics data for the time period
      const analytics = await this.getDashboardData(startDate, endDate);
      
      // Format date range
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      };
      
      const dateRange = `${formatDate(startDate)} to ${formatDate(endDate)}`;
      
      // Build report sections
      const reportSections = [];
      
      // Introduction
      reportSections.push(`# Election Observation Report\n**Period: ${dateRange}**\n`);
      reportSections.push(`## Executive Summary\nThis report analyzes ${analytics.reportStats.totalReports} observation reports submitted during the reporting period. ${analytics.reportStats.criticalReports} critical issues were identified, representing ${Math.round((analytics.reportStats.criticalReports / analytics.reportStats.totalReports) * 100)}% of all reports.\n`);
      
      // Key statistics
      reportSections.push(`## Key Statistics\n- Total Reports: ${analytics.reportStats.totalReports}\n- Critical Issues: ${analytics.reportStats.criticalReports}\n- Reports Reviewed: ${analytics.reportStats.reviewedReports}\n- Pending Review: ${analytics.reportStats.pendingReports}\n`);
      
      // Top issue categories
      if (analytics.topIssueCategories.length > 0) {
        reportSections.push(`## Top Issue Categories\n`);
        analytics.topIssueCategories.forEach((category, index) => {
          reportSections.push(`${index + 1}. **${category.category}**: ${category.count} reports (${category.percentage}%)`);
        });
        reportSections.push('');
      }
      
      // Critical locations
      if (analytics.reportsByLocation.length > 0) {
        reportSections.push(`## Locations of Concern\n`);
        analytics.reportsByLocation
          .filter(loc => loc.severity === 'high')
          .forEach((location, index) => {
            reportSections.push(`${index + 1}. **${location.locationName}**: ${location.count} reports (High Severity)`);
          });
        reportSections.push('');
      }
      
      // Trends
      if (analytics.recentTrends.length > 0) {
        reportSections.push(`## Significant Trends\n`);
        analytics.recentTrends
          .filter(trend => trend.trend !== 'stable')
          .forEach((trend, index) => {
            const direction = trend.trend === 'increasing' ? 'Increase' : 'Decrease';
            reportSections.push(`${index + 1}. **${trend.category}**: ${direction} of ${Math.abs(trend.percentChange)}% (${trend.count} reports)`);
          });
        reportSections.push('');
      }
      
      // AI insights
      if (analytics.aiInsights.length > 0) {
        reportSections.push(`## AI-Generated Insights\n`);
        analytics.aiInsights.forEach((insight, index) => {
          reportSections.push(`${index + 1}. **${insight.category}** (${Math.round(insight.confidence * 100)}% confidence):\n   ${insight.insight}\n`);
        });
      }
      
      // Recommendations
      reportSections.push(`## Recommendations\n`);
      
      // Generate recommendations based on issues
      const recommendations = [];
      
      if (analytics.reportStats.criticalReports > 0) {
        recommendations.push('1. **Immediate Review**: Conduct thorough review of all critical issues and develop mitigation strategies for high-severity locations.');
      }
      
      if (analytics.topIssueCategories.length > 0) {
        const topCategory = analytics.topIssueCategories[0];
        recommendations.push(`2. **${topCategory.category}**: Develop targeted interventions to address the most common issue category.`);
      }
      
      if (analytics.recentTrends.filter(t => t.trend === 'increasing').length > 0) {
        const increasingTrend = analytics.recentTrends.find(t => t.trend === 'increasing');
        if (increasingTrend) {
          recommendations.push(`3. **Trend Monitoring**: Closely monitor the increasing trend in ${increasingTrend.category} issues.`);
        }
      }
      
      recommendations.push('4. **Training Enhancement**: Provide additional training to observers on proper documentation and reporting procedures.');
      recommendations.push('5. **Stakeholder Communication**: Share key findings with relevant election stakeholders to improve processes.');
      
      reportSections.push(recommendations.join('\n\n'));
      
      // Conclusion
      reportSections.push(`\n## Conclusion\nThe data collected during this reporting period highlights both strengths and challenges in the election process. Continued vigilance and proactive measures are recommended to ensure the integrity and transparency of the election.`);
      
      return reportSections.join('\n\n');
    } catch (error) {
      logger.error('Error generating comprehensive report', { error: error instanceof Error ? error : new Error(String(error)), startDate, endDate });
      return 'Error generating report. Please try again later.';
    }
  }
}

export const aiAnalyticsService = new AIAnalyticsService();