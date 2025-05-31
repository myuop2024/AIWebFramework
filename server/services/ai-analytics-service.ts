import { HfInference } from '@huggingface/inference';
import { db } from '../db'; 
import { reports, users, pollingStations, systemSettings } from '@shared/schema';
import { eq, and, or, sql, desc, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import type { Report } from '@shared/schema';
import { analyzeIncidentPatternsWithGemini, IncidentPrediction } from './google-ai-service';

const HUGGINGFACE_API_KEY_DB_KEY = 'HUGGINGFACE_API_KEY';
let hf: HfInference;

async function getHuggingFaceApiKey(): Promise<string | undefined> {
  try {
    const dbKeySetting = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, HUGGINGFACE_API_KEY_DB_KEY)).limit(1);
    if (dbKeySetting.length > 0 && dbKeySetting[0].settingValue) {
      const apiKeyFromDb = (dbKeySetting[0].settingValue as any)?.apiKey;
      if (apiKeyFromDb && typeof apiKeyFromDb === 'string' && apiKeyFromDb.trim()) {
        console.log("Using Hugging Face API key from database settings.");
        return apiKeyFromDb;
      }
    }
  } catch (error) { console.error("Error fetching Hugging Face API key from database:", error); }
  const apiKeyFromEnv = process.env.HUGGINGFACE_API_KEY;
  if (apiKeyFromEnv && apiKeyFromEnv.trim()) {
    console.log("Using Hugging Face API key from environment variable (Replit Secret).");
    return apiKeyFromEnv;
  }
  console.warn("Hugging Face API key is not configured in database or environment variables.");
  return undefined;
}

let hfInitializedPromise: Promise<void>;
let hfClientInitialized = false;

async function initializeHfClient() {
  if (hfClientInitialized) return;
  const apiKey = await getHuggingFaceApiKey();
  hf = new HfInference(apiKey);
  hfClientInitialized = true;
  console.log("HuggingFace client initialized.");
}

hfInitializedPromise = initializeHfClient().catch(err => {
  console.error("Failed to initialize HuggingFace client during startup:", err);
  if (!hfClientInitialized) {
    hf = new HfInference(undefined);
    hfClientInitialized = true;
  }
});

const MODELS = {
  textClassification: 'siebert/sentiment-roberta-large-english',
  textGeneration: 'meta-llama/Llama-3.1-8B-Instruct',
  zeroShotClassification: 'facebook/bart-large-mnli',
  summarization: 'facebook/bart-large-cnn',
  questionAnswering: 'deepset/roberta-base-squad2',
};

const REPORT_CATEGORIES = ['voter intimidation', 'ballot issues', 'polling station logistics', 'voter eligibility disputes', 'counting irregularities', 'technology issues', 'accessibility problems', 'observer rights violation', 'violence', 'general issues'];

export interface AnalyticsInsight {
  insight: string;
  confidence: number;
  category: string;
  relatedReportIds: number[];
  suggestedAction?: string; // New field for actionable recommendations
}

export interface AnalyticsTrend {
  category: string;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
  explanation?: string;
}

export interface AnalyticsReportStats { totalReports: number; pendingReports: number; reviewedReports: number; criticalReports: number; }
export interface LocationReport { locationName: string; count: number; severity: 'low' | 'medium' | 'high'; }
export interface CategoryStats { category: string; count: number; percentage: number; }

// New interface for Polling Station Hotspots
export interface PollingStationHotspot {
  stationId: number;
  stationName: string;
  criticalReportCount: number;
  issueSummary?: string; // AI-generated summary of issues
}

export interface AnalyticsDashboardData {
  reportStats: AnalyticsReportStats;
  recentTrends: AnalyticsTrend[];
  aiInsights: AnalyticsInsight[];
  reportsByLocation: LocationReport[];
  topIssueCategories: CategoryStats[];
  pollingStationHotspots?: PollingStationHotspot[]; // New field
}
export interface PredictedIssue { issueType: string; probability: number; suggestedAction: string; }

export class AIAnalyticsService {
  private async ensureHfClient(): Promise<void> {
    if (!hfClientInitialized) await hfInitializedPromise;
    if (!hf) throw new Error("HuggingFace client is not available.");
  }

  async getDashboardData(startDate?: Date, endDate?: Date): Promise<AnalyticsDashboardData> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      const reportStats = await this.getReportStats(dateFilter);
      const topIssueCategories = await this.getTopIssueCategories(dateFilter);
      const reportsByLocation = await this.getReportsByLocation(dateFilter);
      const recentTrends = await this.getRecentTrends(dateFilter);
      const aiInsights = await this.generateAIInsights(dateFilter);
      const pollingStationHotspots = await this.getPollingStationHotspotSummaries(dateFilter); // Add this call
            
      return {
        reportStats,
        recentTrends,
        aiInsights,
        reportsByLocation,
        topIssueCategories,
        pollingStationHotspots, // Include in return
      };
    } catch (error) {
      console.error('Error generating analytics dashboard data:', error);
      throw new Error('Failed to generate analytics data');
    }
  }
  
  private buildDateFilter(startDate?: Date, endDate?: Date) {
    if (startDate && endDate) return and(sql`${reports.createdAt} >= ${startDate}`, sql`${reports.createdAt} <= ${endDate}`);
    if (startDate) return sql`${reports.createdAt} >= ${startDate}`;
    if (endDate) return sql`${reports.createdAt} <= ${endDate}`;
    return undefined;
  }
  
  private async getReportStats(dateFilter?: any): Promise<AnalyticsReportStats> {
    try {
      const totalReportsQuery = await db.select({ count: sql<number>`count(*)` }).from(reports).where(dateFilter || sql`1=1`);
      const pendingReportsQuery = await db.select({ count: sql<number>`count(*)` }).from(reports).where(dateFilter ? and(eq(reports.status, 'pending'), dateFilter) : eq(reports.status, 'pending'));
      const reviewedReportsQuery = await db.select({ count: sql<number>`count(*)` }).from(reports).where(dateFilter ? and(eq(reports.status, 'reviewed'), dateFilter) : eq(reports.status, 'reviewed'));
      const criticalReportsQuery = await db.select({ count: sql<number>`count(*)` }).from(reports).where(dateFilter ? and(eq(reports.severity, 'critical'), dateFilter) : eq(reports.severity, 'critical'));
      
      return {
        totalReports: totalReportsQuery[0]?.count || 0,
        pendingReports: pendingReportsQuery[0]?.count || 0,
        reviewedReports: reviewedReportsQuery[0]?.count || 0,
        criticalReports: criticalReportsQuery[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching report stats:', error);
      return { totalReports: 0, pendingReports: 0, reviewedReports: 0, criticalReports: 0 };
    }
  }
  
  private async getReportsByLocation(dateFilter?: any): Promise<LocationReport[]> {
    try {
      const reportsByStationQuery = await db
        .select({ stationId: reports.pollingStationId, count: sql<number>`count(*)` })
        .from(reports).where(dateFilter || sql`1=1`).groupBy(reports.pollingStationId).orderBy(sql`count(*) desc`).limit(10);
      
      const locationReports: LocationReport[] = [];
      for (const reportGroup of reportsByStationQuery) {
        if (!reportGroup.stationId) continue;
        const station = await db.select({ name: pollingStations.name }).from(pollingStations).where(eq(pollingStations.id, reportGroup.stationId)).limit(1);
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (reportGroup.count > 10) severity = 'high';
        else if (reportGroup.count > 5) severity = 'medium';
        if (station[0]) {
          locationReports.push({ locationName: station[0].name || `Station ID: ${reportGroup.stationId}`, count: reportGroup.count, severity });
        }
      }
      return locationReports;
    } catch (error) {
      console.error('Error fetching reports by location:', error);
      return [];
    }
  }
  
  private async getTopIssueCategories(dateFilter?: any): Promise<CategoryStats[]> {
    try {
      const categoryCounts: Record<string, number> = {};
      const totalReportsQuery = await db.select({ count: sql<number>`count(*)` }).from(reports).where(dateFilter || sql`1=1`);
      const totalReports = totalReportsQuery[0]?.count || 0;
      if (totalReports === 0) return [];
      
      const reportData = await db.select({ id: reports.id, content: reports.content, category: reports.category, description: reports.description }).from(reports).where(dateFilter || sql`1=1`);
      for (const report of reportData) {
        const category = report.category || await this.classifyReportContent(report);
        if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
      const result = Object.entries(categoryCounts).map(([category, count]) => ({ category, count, percentage: Math.round((count / totalReports) * 100) }));
      return result.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error fetching top issue categories:', error);
      return [];
    }
  }
  
  private async getRecentTrends(dateFilter?: any): Promise<AnalyticsTrend[]> {
    await this.ensureHfClient();
    try {
      const currentPeriodReports = await db
        .select({ id: reports.id, content: reports.content, description: reports.description, category: reports.category, createdAt: reports.createdAt })
        .from(reports).where(dateFilter || sql`1=1`);
      
      const currentPeriodStart = new Date(); currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);
      const previousPeriodEnd = new Date(currentPeriodStart); previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
      const previousPeriodStart = new Date(previousPeriodEnd); previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
      
      const previousPeriodReports = await db.select({ id: reports.id, content: reports.content, description: reports.description, category: reports.category, createdAt: reports.createdAt }).from(reports).where(and(gte(reports.createdAt, previousPeriodStart), lte(reports.createdAt, previousPeriodEnd)));
      
      const currentPeriodCategories: Record<string, number> = {};
      const previousPeriodCategories: Record<string, number> = {};
      
      for (const report of currentPeriodReports) {
        const category = report.category || await this.classifyReportContent(report);
        if (category) currentPeriodCategories[category] = (currentPeriodCategories[category] || 0) + 1;
      }
      for (const report of previousPeriodReports) {
        const category = report.category || await this.classifyReportContent(report);
        if (category) previousPeriodCategories[category] = (previousPeriodCategories[category] || 0) + 1;
      }
      
      const trends: AnalyticsTrend[] = [];
      for (const category of Object.keys(currentPeriodCategories)) {
        const currentCount = currentPeriodCategories[category] || 0;
        const previousCount = previousPeriodCategories[category] || 0;
        let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
        let percentChange = 0;

        if (previousCount > 0) {
          percentChange = Math.round(((currentCount - previousCount) / previousCount) * 100);
          if (percentChange > 10) trendDirection = 'increasing';
          else if (percentChange < -10) trendDirection = 'decreasing';
        } else if (currentCount > 3) {
          trendDirection = 'increasing';
          percentChange = 100;
        }
        
        let explanation: string | undefined = undefined;
        if (trendDirection === 'increasing' || trendDirection === 'decreasing') {
          const categoryReportsForTrend = currentPeriodReports.filter(r => (r.category || "general issues") === category);
          const reportContentsForExplanation = categoryReportsForTrend
            .map(r => `${r.description || ''} ${typeof r.content === 'string' ? r.content : JSON.stringify(r.content)}`.trim())
            .slice(0, 5);

          if (reportContentsForExplanation.length > 0) {
            try {
              const reportsText = reportContentsForExplanation.join('\n---\n');
              const prompt = `The category "${category}" is showing a ${trendDirection} trend (${percentChange > 0 ? '+' : ''}${percentChange}% change, current count: ${currentCount}). Based on the following sample of recent reports related to this category, provide a brief, neutral explanation (1-2 sentences) of potential contributing factors or common themes observed in these reports. Focus on summarizing observed patterns from the text provided. Do not speculate beyond this text. Reports Sample:\n${reportsText.slice(0, 1500)}${reportsText.length > 1500 ? '...' : ''}\nBrief Explanation:`;

              const explanationResult = await hf.textGeneration({ model: MODELS.textGeneration, inputs: prompt, parameters: { max_new_tokens: 120, return_full_text: false, temperature: 0.7 } });
              explanation = explanationResult.generated_text.trim() || "No specific themes identified from the sample.";
            } catch (e: any) {
              console.error(`Error generating explanation for category ${category}:`, e.message);
              explanation = "AI explanation currently unavailable.";
            }
          } else {
            explanation = "Not enough distinct report content to generate an explanation.";
          }
        }
        trends.push({ category, count: currentCount, trend: trendDirection, percentChange, explanation });
      }
      return trends.sort((a, b) => {
        if (b.trend !== 'stable' && a.trend === 'stable') return -1;
        if (a.trend !== 'stable' && b.trend === 'stable') return 1;
        if (Math.abs(b.percentChange) !== Math.abs(a.percentChange)) return Math.abs(b.percentChange) - Math.abs(a.percentChange);
        return b.count - a.count;
      }).slice(0, 10);
    } catch (error) {
      console.error('Error calculating trends:', error);
      return [];
    }
  }

  // New function to get polling station hotspot summaries
  private async getPollingStationHotspotSummaries(dateFilter?: any, limit: number = 5): Promise<PollingStationHotspot[]> {
    await this.ensureHfClient();
    try {
      const criticalStationsQuery = await db
        .select({
          stationId: reports.pollingStationId,
          stationName: pollingStations.name,
          criticalCount: sql<number>`COUNT(CASE WHEN ${reports.severity} = 'critical' THEN 1 ELSE NULL END)`.mapWith(Number),
        })
        .from(reports)
        .leftJoin(pollingStations, eq(reports.pollingStationId, pollingStations.id))
        .where(and(eq(reports.severity, 'critical'), reports.pollingStationId.isNotNull(), dateFilter || sql`1=1`)) // Ensure stationId is not null
        .groupBy(reports.pollingStationId, pollingStations.name)
        .having(sql`COUNT(CASE WHEN ${reports.severity} = 'critical' THEN 1 ELSE NULL END) >= 2`) // Hotspot threshold: >= 2 critical reports
        .orderBy(desc(sql<number>`COUNT(CASE WHEN ${reports.severity} = 'critical' THEN 1 ELSE NULL END)`))
        .limit(limit);

      if (!criticalStationsQuery || criticalStationsQuery.length === 0) return [];
      
      const hotspots: PollingStationHotspot[] = [];
      for (const station of criticalStationsQuery) {
        if (!station.stationId) continue;

        const stationCriticalReports = await db
          .select({ content: reports.content, description: reports.description })
          .from(reports)
          .where(and(eq(reports.pollingStationId, station.stationId), eq(reports.severity, 'critical'), dateFilter || sql`1=1`))
          .limit(3); // Sample of 3 critical reports for summary

        let issueSummary: string | undefined = "No specific themes identified from critical reports sample.";
        if (stationCriticalReports.length > 0) {
          const reportContents = stationCriticalReports.map(r => `${r.description || ''} ${typeof r.content === 'string' ? r.content : JSON.stringify(r.content)}`.trim()).join('\n---\n');
          try {
            const prompt = `Polling station "${station.stationName || `ID ${station.stationId}`}" has ${station.criticalCount} critical reports. Based on a sample of these reports:\n${reportContents.slice(0, 1500)}${reportContents.length > 1500 ? '...' : ''}\nBriefly summarize the main issues (1-2 sentences). Focus on observed patterns. Brief Issue Summary:`;
            const summaryResult = await hf.textGeneration({ model: MODELS.textGeneration, inputs: prompt, parameters: { max_new_tokens: 100, return_full_text: false, temperature: 0.6 } });
            issueSummary = summaryResult.generated_text.trim() || issueSummary;
          } catch (e: any) {
            console.error(`Error generating summary for station ${station.stationId}:`, e.message);
            issueSummary = "AI summary currently unavailable for this station.";
          }
        }
        hotspots.push({ stationId: station.stationId, stationName: station.stationName || `Station ID ${station.stationId}`, criticalReportCount: station.criticalCount, issueSummary });
      }
      return hotspots;
    } catch (error) {
      console.error('Error fetching polling station hotspot summaries:', error);
      return [];
    }
  }

  private async generateAIInsights(dateFilter?: any): Promise<AnalyticsInsight[]> {
    // ... (no changes in this method)
    try {
      const reportData = await db.select({ id: reports.id, content: reports.content, description: reports.description, category: reports.category, severity: reports.severity, status: reports.status }).from(reports).where(dateFilter || sql`1=1`).orderBy(desc(reports.createdAt)).limit(100);
      if (reportData.length === 0) return [];
      
      const reportCorpus = reportData.map(report => ({ id: report.id, text: `${report.description || ''} ${typeof report.content === 'string' ? report.content : JSON.stringify(report.content)}`.trim(), category: report.category, severity: report.severity, status: report.status }));
      const reportsByCategory: Record<string, typeof reportCorpus> = {};
      reportCorpus.forEach(report => {
        if (!report.category) return;
        if (!reportsByCategory[report.category]) reportsByCategory[report.category] = [];
        reportsByCategory[report.category].push(report);
      });
      
      const insights: AnalyticsInsight[] = [];
      for (const [category, categoryReports] of Object.entries(reportsByCategory)) {
        if (categoryReports.length < 3) continue;
        const combinedText = categoryReports.map(r => r.text).join(' ');
        try {
          const insight = await this.generateCategoryInsight(category, combinedText, categoryReports);
          if (insight) insights.push(insight);
        } catch (err) { console.error(`Error generating insight for category ${category}:`, err); }
      }
      try { insights.push(...await this.generateLocationBasedInsights(reportCorpus)); } catch (err) { console.error('Error generating location-based insights:', err); }
      try { insights.push(...await this.generateTimeBasedInsights(reportCorpus)); } catch (err) { console.error('Error generating time-based insights:', err); }
      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return [];
    }
  }
  
  private async generateCategoryInsight(category: string, text: string, reportsArr: Array<{ id: number, text: string, category?: string, severity?: string, status?: string }>): Promise<AnalyticsInsight | null> {
    await this.ensureHfClient();
    try {
      const insightPrompt = `Analyze the following election observer reports about "${category}" issues:\n---\n${text.slice(0, 1000)}${text.length > 1000 ? '...' : ''}\n---\nIdentify key patterns or insights that election administrators should know about. Focus on actionable information that could improve election integrity. Insight:`;
      const insightResult = await hf.textGeneration({ // Using textGeneration for potentially better control over output structure
        model: MODELS.textGeneration,
        inputs: insightPrompt,
        parameters: { max_new_tokens: 120, return_full_text: false, temperature: 0.6 }
      });

      if (!insightResult || !insightResult.generated_text) return null;
      const insightText = insightResult.generated_text.trim();

      const actionPrompt = `Based on the insight that "${insightText}" regarding "${category}" issues, suggest one brief, actionable recommendation for election administrators. Recommendation:`;
      const actionResult = await hf.textGeneration({
        model: MODELS.textGeneration,
        inputs: actionPrompt,
        parameters: { max_new_tokens: 80, return_full_text: false, temperature: 0.7 }
      });
      const suggestedActionText = actionResult.generated_text.trim() || undefined;

      const relatedReportIds = reportsArr.map(r => r.id).slice(0, 5);
      const criticalReportsCount = reportsArr.filter(r => r.severity === 'critical').length;
      const confidence = Math.min(0.5 + (reportsArr.length / 20) + (criticalReportsCount / (reportsArr.length || 1)) * 0.3, 0.95);

      return {
        insight: insightText,
        confidence,
        category,
        relatedReportIds,
        suggestedAction: suggestedActionText
      };
    } catch (error) {
      console.error(`Error generating category insight and action for ${category}:`, error);
      return null;
    }
  }
  
  private async generateLocationBasedInsights(reportsArr: Array<{ id: number, text: string, category?: string, severity?: string, status?: string }>): Promise<AnalyticsInsight[]> { return []; }
  private async generateTimeBasedInsights(reportsArr: Array<{ id: number, text: string, category?: string, severity?: string, status?: string }>): Promise<AnalyticsInsight[]> { return []; }
  
  private async classifyReportContent(report: { content?: any, id?: number }): Promise<string> {
    await this.ensureHfClient();
    try {
      if (!report.content) return 'general issues';
      let textContent = typeof report.content === 'string' ? report.content : Object.values(report.content).filter(value => typeof value === 'string').join(' ');
      if (!textContent || textContent.length < 10) return 'general issues';
      
      const classification = await hf.zeroShotClassification({ model: MODELS.zeroShotClassification, inputs: textContent.slice(0, 1000), parameters: { candidate_labels: REPORT_CATEGORIES } });
      if (classification && classification.labels && classification.labels.length > 0) return classification.labels[0];
      return 'general issues';
    } catch (error) {
      console.error('Error classifying report content:', error);
      return 'general issues';
    }
  }
  
  async predictIssues(stationId?: number): Promise<PredictedIssue[]> {
    try {
      let stationReports = [];
      if (stationId) {
        stationReports = await db.select({id: reports.id, content: reports.content, description: reports.description, category: reports.category, severity: reports.severity, status: reports.status, createdAt: reports.createdAt, pollingStationId: reports.pollingStationId}).from(reports).where(sql`${reports.pollingStationId} = ${stationId}`).orderBy(desc(reports.createdAt));
        if (stationReports.length > 0) {
          const stationData = await db.select({ name: pollingStations.name }).from(pollingStations).where(eq(pollingStations.id, stationId)).limit(1);
          if (stationData.length > 0) stationReports = stationReports.map(report => ({ ...report, stationName: stationData[0].name }));
        }
      } else {
        stationReports = await db.select({id: reports.id, content: reports.content, description: reports.description, category: reports.category, severity: reports.severity, status: reports.status, createdAt: reports.createdAt, pollingStationId: reports.pollingStationId}).from(reports).orderBy(desc(reports.createdAt)).limit(100);
        const stationIds = [...new Set(stationReports.map(r => r.pollingStationId).filter(id => id != null))];
        if (stationIds.length > 0) {
          const stationNamesQuery = stationIds.length ? sql`${pollingStations.id} IN (${stationIds.join(',')})` : sql`1=0`;
          const stationNames = await db.select({ id: pollingStations.id, name: pollingStations.name }).from(pollingStations).where(stationNamesQuery);
          const stationMap = new Map(stationNames.map(s => [s.id, s.name]));
          stationReports = stationReports.map(report => ({ ...report, stationName: report.pollingStationId ? stationMap.get(report.pollingStationId) || `Station ${report.pollingStationId}` : 'Unknown station' }));
        }
      }
      if (!stationReports || stationReports.length === 0) return this.getLegacyGenericPredictions();
      try {
        const enhancedPredictions = await analyzeIncidentPatternsWithGemini(stationReports, stationId);
        return enhancedPredictions.map(p => ({ issueType: p.issueType, probability: p.probability, suggestedAction: `${p.suggestedAction} ${p.estimatedImpact === 'high' ? '(HIGH PRIORITY)' : ''}` }));
      } catch (aiError) {
        console.error('Error using Gemini for predictions, falling back to traditional analysis:', aiError);
        return this.generateFallbackPredictions(stationReports);
      }
    } catch (error) {
      console.error('Error predicting issues:', error);
      return this.getLegacyGenericPredictions();
    }
  }
  
  private async generateFallbackPredictions(stationReports: any[]): Promise<PredictedIssue[]> {
    try {
      const categoryCounts: Record<string, number> = {};
      const severityCounts: Record<string, number> = {};
      for (const report of stationReports) {
        const category = report.category || await this.classifyReportContent(report);
        if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        if (report.severity) severityCounts[report.severity] = (severityCounts[report.severity] || 0) + 1;
      }
      const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([category]) => category);
      const hasCritical = (severityCounts['critical'] || 0) > 0;
      const hasHigh = (severityCounts['high'] || 0) > 0;
      const predictions: PredictedIssue[] = [];
      for (const category of sortedCategories) {
        const frequency = categoryCounts[category] / stationReports.length;
        const hasCriticalInCategory = stationReports.some(r => r.category === category && r.severity === 'critical');
        let probability = frequency + (hasCriticalInCategory ? 0.2 : 0) + (hasHigh ? 0.1 : 0);
        probability = Math.min(probability, 0.95);
        predictions.push({ issueType: `${category.charAt(0).toUpperCase() + category.slice(1)}`, probability, suggestedAction: this.getSuggestedAction(category, probability) });
      }
      if (predictions.length < 3) {
        const genericPredictions = this.getLegacyGenericPredictions().filter(p => !sortedCategories.includes(p.issueType.toLowerCase()));
        predictions.push(...genericPredictions.slice(0, 3 - predictions.length));
      }
      return predictions.sort((a, b) => b.probability - a.probability);
    } catch (error) {
      console.error('Error in fallback prediction mechanism:', error);
      return this.getLegacyGenericPredictions();
    }
  }
  
  private getLegacyGenericPredictions(): PredictedIssue[] { /* ... */ return [ { issueType: 'Voter verification delays', probability: 0.7, suggestedAction: 'Ensure adequate staffing for voter ID verification and have backup procedures ready for high-volume periods.' }, { issueType: 'Ballot shortages', probability: 0.5, suggestedAction: 'Maintain higher ballot reserves and establish quick-response distribution system for emergency ballot deliveries.' }, { issueType: 'Technology failures', probability: 0.4, suggestedAction: 'Test all electronic systems 24 hours before election day and have paper backup systems ready to deploy.' }, ]; }
  private getSuggestedAction(category: string, probability: number): string { /* ... */ const actions: Record<string, string> = { 'voter intimidation': 'Increase security presence and train poll workers on de-escalation techniques. Establish clear reporting protocols.', 'ballot issues': 'Verify ballot inventory and distribution processes. Ensure backup ballots are available and proper handling procedures are followed.', 'polling station logistics': 'Review station layout and staffing levels. Ensure adequate resources are allocated based on expected turnout.', 'voter eligibility disputes': 'Provide additional training on voter ID requirements and provisional ballot procedures. Have up-to-date voter rolls available.', 'counting irregularities': 'Implement double-verification procedures and ensure transparent counting processes with observer access.', 'technology issues': 'Test all systems prior to election day and have technical support staff on standby. Prepare paper backups for all electronic processes.', 'accessibility problems': 'Audit polling station for ADA compliance and provide additional accommodations for voters with disabilities.', 'observer rights violation': 'Retrain polling staff on observer rights and establish clear protocols for resolving disputes with observers.', 'violence': 'Coordinate with law enforcement for increased presence and develop emergency response procedures for polling stations.', 'general issues': 'Conduct comprehensive staff training and develop detailed contingency plans for common issues.', }; return actions[category] || 'Monitor the situation closely and ensure staff are prepared to address potential issues promptly.'; }
  
  async generateComprehensiveReport(startDate: Date, endDate: Date): Promise<string> {
    try {
      const analytics = await this.getDashboardData(startDate, endDate);
      const formatDate = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const dateRange = `${formatDate(startDate)} to ${formatDate(endDate)}`;
      const reportSections = [
        `# Election Observation Report\n**Period: ${dateRange}**\n`,
        `## Executive Summary\nThis report analyzes ${analytics.reportStats.totalReports} observation reports submitted during the reporting period. ${analytics.reportStats.criticalReports} critical issues were identified, representing ${Math.round((analytics.reportStats.criticalReports / (analytics.reportStats.totalReports || 1)) * 100)}% of all reports.\n`,
        `## Key Statistics\n- Total Reports: ${analytics.reportStats.totalReports}\n- Critical Issues: ${analytics.reportStats.criticalReports}\n- Reports Reviewed: ${analytics.reportStats.reviewedReports}\n- Pending Review: ${analytics.reportStats.pendingReports}\n`
      ];
      if (analytics.topIssueCategories.length > 0) {
        reportSections.push(`## Top Issue Categories\n`);
        analytics.topIssueCategories.forEach((cat, i) => reportSections.push(`${i + 1}. **${cat.category}**: ${cat.count} reports (${cat.percentage}%)`));
        reportSections.push('');
      }
      if (analytics.reportsByLocation.length > 0) {
        reportSections.push(`## Locations of Concern\n`);
        analytics.reportsByLocation.filter(loc => loc.severity === 'high').forEach((loc, i) => reportSections.push(`${i + 1}. **${loc.locationName}**: ${loc.count} reports (High Severity)`));
        // Add Hotspot Summaries to Report
        if (analytics.pollingStationHotspots && analytics.pollingStationHotspots.length > 0) {
            reportSections.push(`\n### Polling Station Hotspot Summaries\n`);
            analytics.pollingStationHotspots.forEach(hotspot => {
                reportSections.push(`**${hotspot.stationName}** (Critical Reports: ${hotspot.criticalReportCount}): ${hotspot.issueSummary || 'No AI summary available.'}`);
            });
        }
        reportSections.push('');
      }
      if (analytics.recentTrends.length > 0) {
        reportSections.push(`## Significant Trends\n`);
        analytics.recentTrends.filter(t => t.trend !== 'stable').forEach((t, i) => reportSections.push(`${i + 1}. **${t.category}**: ${t.trend === 'increasing' ? 'Increase' : 'Decrease'} of ${Math.abs(t.percentChange)}% (${t.count} reports)${t.explanation ? `\n   - *AI Explanation:* ${t.explanation}` : ''}`));
        reportSections.push('');
      }
      if (analytics.aiInsights.length > 0) {
        reportSections.push(`## AI-Generated Insights\n`);
        analytics.aiInsights.forEach((insight, i) => {
          reportSections.push(`${i + 1}. **${insight.category}** (${Math.round(insight.confidence * 100)}% confidence):\n   *Insight:* ${insight.insight}${insight.suggestedAction ? `\n   *Suggested Action:* ${insight.suggestedAction}` : ''}\n`);
        });
      }
      const recommendations = [];
      if (analytics.reportStats.criticalReports > 0) recommendations.push('1. **Immediate Review**: Conduct thorough review of all critical issues and develop mitigation strategies for high-severity locations.');
      if (analytics.topIssueCategories.length > 0) recommendations.push(`2. **${analytics.topIssueCategories[0].category}**: Develop targeted interventions to address the most common issue category.`);
      const increasingTrend = analytics.recentTrends.find(t => t.trend === 'increasing');
      if (increasingTrend) recommendations.push(`3. **Trend Monitoring**: Closely monitor the increasing trend in ${increasingTrend.category} issues.`);
      recommendations.push('4. **Training Enhancement**: Provide additional training to observers on proper documentation and reporting procedures.');
      recommendations.push('5. **Stakeholder Communication**: Share key findings with relevant election stakeholders to improve processes.');
      reportSections.push(`## Recommendations\n${recommendations.join('\n\n')}`);
      reportSections.push(`\n## Conclusion\nThe data collected during this reporting period highlights both strengths and challenges in the election process. Continued vigilance and proactive measures are recommended to ensure the integrity and transparency of the election.`);
      return reportSections.join('\n\n');
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      return 'Error generating report. Please try again later.';
    }
  }
}

export const aiAnalyticsService = new AIAnalyticsService();