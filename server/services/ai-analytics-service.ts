import { HfInference } from '@huggingface/inference';
import { db } from '../db';
import { reports, assignments, users, pollingStations } from '@shared/schema';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import { Report } from '@shared/schema';
import * as crypto from 'crypto';

// Initialize Hugging Face inference client with API key
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export interface ReportTrend {
  category: string;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
}

export interface AiInsight {
  insight: string;
  confidence: number;
  category: string;
  relatedReportIds: number[];
}

export interface AnalyticsData {
  reportStats: {
    totalReports: number;
    pendingReports: number;
    reviewedReports: number;
    criticalReports: number;
  };
  recentTrends: ReportTrend[];
  aiInsights: AiInsight[];
  reportsByLocation: {
    locationName: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
  }[];
  topIssueCategories: {
    category: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * AI Analytics Service for analyzing election observation reports
 */
export class AiAnalyticsService {
  /**
   * Analyze a report content using AI to extract insights
   * @param reportContent The content of the report to analyze
   * @returns The analysis results
   */
  async analyzeReport(reportContent: string): Promise<{
    severity: 'low' | 'medium' | 'high';
    categories: string[];
    summary: string;
    sentiment: number;
    actionRequired: boolean;
  }> {
    try {
      // Use Hugging Face's text classification to categorize the report
      const classificationPrompt = `
      Categorize this election observation report into one or more of these categories: 
      Ballot Issues, Voter Intimidation, Equipment Malfunction, Process Violation, Accessibility Issues, Staff Conduct, Security Concerns, Other.
      
      Also determine the severity (low, medium, high) and whether immediate action is required.
      
      Report: ${reportContent}
      
      Format your response as JSON with the following structure:
      {
        "severity": "low|medium|high",
        "categories": ["category1", "category2"],
        "summary": "brief summary of the key issues",
        "sentiment": "score from -1 to 1 where -1 is very negative and 1 is very positive",
        "actionRequired": true|false
      }
      `;

      // Use a text generation model for sophisticated analysis
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: classificationPrompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.1,
          return_full_text: false,
        }
      });

      // Extract JSON from the response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON');
      }

      const analysisResult = JSON.parse(jsonMatch[0]);
      return analysisResult;
    } catch (error) {
      console.error('Error analyzing report with AI:', error);
      // Return a fallback analysis if the AI service fails
      return {
        severity: 'medium', 
        categories: ['Process Violation'],
        summary: 'Unable to analyze report content automatically.',
        sentiment: 0,
        actionRequired: false
      };
    }
  }

  /**
   * Get comprehensive analytics data for the dashboard
   * @param timeRange Optional time range for filtering the data
   * @returns Analytics data for the dashboard
   */
  async getDashboardAnalytics(timeRange?: { 
    start: Date, 
    end: Date 
  }): Promise<AnalyticsData> {
    try {
      let reportsQuery = db.select().from(reports);
      
      // Apply time range filter if provided
      if (timeRange) {
        reportsQuery = reportsQuery.where(
          and(
            gte(reports.submittedAt, timeRange.start),
            lte(reports.submittedAt, timeRange.end)
          )
        );
      }

      const allReports = await reportsQuery;
      
      // Generate report statistics
      const reportStats = {
        totalReports: allReports.length,
        pendingReports: allReports.filter(r => r.status === 'pending').length,
        reviewedReports: allReports.filter(r => r.status === 'reviewed').length,
        criticalReports: allReports.filter(r => r.priority === 'high').length
      };

      // Get the polling station data for location analysis
      const locationData = await db.select({
        id: pollingStations.id,
        name: pollingStations.name,
        reportCount: count(reports.id)
      })
      .from(pollingStations)
      .leftJoin(reports, eq(reports.stationId, pollingStations.id))
      .groupBy(pollingStations.id, pollingStations.name);

      // Generate location-based reporting insights
      const reportsByLocation = await Promise.all(
        locationData.map(async location => {
          // Get reports for this location
          const locationReports = allReports.filter(r => r.stationId === location.id);
          
          // Determine severity based on report count and priorities
          const highPriorityCount = locationReports.filter(r => r.priority === 'high').length;
          let severity: 'low' | 'medium' | 'high' = 'low';
          
          if (highPriorityCount > 2) {
            severity = 'high';
          } else if (highPriorityCount > 0 || locationReports.length > 5) {
            severity = 'medium';
          }
          
          return {
            locationName: location.name,
            count: location.reportCount || 0,
            severity
          };
        })
      );

      // Generate trend data by comparing current week to previous week
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const currentWeekReports = allReports.filter(r => 
        new Date(r.submittedAt) >= oneWeekAgo && 
        new Date(r.submittedAt) <= now
      );
      
      const previousWeekReports = allReports.filter(r => 
        new Date(r.submittedAt) >= twoWeeksAgo && 
        new Date(r.submittedAt) < oneWeekAgo
      );

      // Get the top categories based on report content
      // This would normally come from AI analysis of each report
      // For now, we'll create synthetic categories based on report types
      const reportCategories = allReports.map(report => report.type).filter(type => !!type);
      const categoryMap: Record<string, number> = {};
      
      reportCategories.forEach(category => {
        if (!category) return;
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });
      
      const topCategories = Object.entries(categoryMap)
        .map(([category, count]) => ({
          category,
          count,
          percentage: Math.round(count / reportCategories.length * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Generate trends
      const trends: ReportTrend[] = [];
      const uniqueTypes = [...new Set(allReports.map(r => r.type))];
      
      uniqueTypes.forEach(type => {
        if (!type) return;
        
        const currentWeekCount = currentWeekReports.filter(r => r.type === type).length;
        const previousWeekCount = previousWeekReports.filter(r => r.type === type).length;
        
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        let percentChange = 0;
        
        if (previousWeekCount > 0) {
          percentChange = Math.round((currentWeekCount - previousWeekCount) / previousWeekCount * 100);
          
          if (percentChange > 10) {
            trend = 'increasing';
          } else if (percentChange < -10) {
            trend = 'decreasing';
          }
        } else if (currentWeekCount > 0) {
          // If there were no reports last week but there are this week
          trend = 'increasing';
          percentChange = 100;
        }
        
        trends.push({
          category: type,
          count: currentWeekCount,
          trend,
          percentChange
        });
      });

      // Generate AI insights based on the reports
      const aiInsights = await this.generateAiInsights(allReports);

      return {
        reportStats,
        recentTrends: trends,
        aiInsights,
        reportsByLocation,
        topIssueCategories: topCategories
      };
    } catch (error) {
      console.error('Error generating analytics data:', error);
      throw new Error('Failed to generate analytics data');
    }
  }

  /**
   * Generate AI insights from a collection of reports
   * @param reports The reports to analyze
   * @returns Array of AI insights
   */
  private async generateAiInsights(reports: Report[]): Promise<AiInsight[]> {
    if (reports.length === 0) {
      return [];
    }

    try {
      // Get the 10 most recent reports
      const recentReports = [...reports]
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 10);

      // Prepare the prompt for analysis
      const reportSummaries = recentReports.map(r => 
        `Report ID ${r.id}: Type: ${r.type || 'General'}, Priority: ${r.priority}, Status: ${r.status}, Content: ${r.content?.substring(0, 100)}...`
      ).join('\n\n');

      const analysisPrompt = `
      Analyze these election observer reports and identify 3 key insights or patterns:

      ${reportSummaries}

      Format your response as a JSON array, with each item having the following structure:
      {
        "insight": "detailed description of the insight",
        "confidence": "number between 0 and 1 indicating confidence level",
        "category": "category of the insight (e.g., 'security', 'process', 'accessibility')",
        "relatedReportIds": [list of report IDs that support this insight]
      }
      `;

      // Use a text generation model for sophisticated analysis
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: analysisPrompt,
        parameters: {
          max_new_tokens: 750,
          temperature: 0.1,
          return_full_text: false,
        }
      });

      // Extract JSON from the response
      const jsonMatch = response.generated_text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON array');
      }

      const insights = JSON.parse(jsonMatch[0]);
      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      
      // Return a fallback insight if the AI service fails
      return [{
        insight: "Not enough report data to generate meaningful insights.",
        confidence: 0.8,
        category: "system",
        relatedReportIds: []
      }];
    }
  }

  /**
   * Predict potential issues based on historical patterns
   * @param stationId Optional station ID to get predictions for a specific location
   * @returns Predicted issues
   */
  async predictPotentialIssues(stationId?: number): Promise<{
    issueType: string;
    probability: number;
    suggestedAction: string;
  }[]> {
    try {
      // Get historical data
      let reportsQuery = db.select().from(reports);
      
      if (stationId) {
        reportsQuery = reportsQuery.where(eq(reports.stationId, stationId));
      }
      
      const historicalReports = await reportsQuery;
      
      if (historicalReports.length < 5) {
        return [{
          issueType: 'Insufficient Data',
          probability: 0,
          suggestedAction: 'Collect more reports to enable predictions'
        }];
      }

      // Get station information if a specific station is requested
      let stationInfo = null;
      if (stationId) {
        const [station] = await db
          .select()
          .from(pollingStations)
          .where(eq(pollingStations.id, stationId));
        
        stationInfo = station;
      }

      // Create a prompt for the AI to predict issues
      const predictPrompt = `
      Based on the following historical election reports${stationId ? ` for polling station "${stationInfo?.name}"` : ''}, 
      predict the most likely issues that might occur and suggest preventative actions.
      
      Historical reports:
      ${historicalReports.slice(0, 10).map(r => 
        `- Type: ${r.type || 'General'}, Priority: ${r.priority}, Status: ${r.status}, Date: ${r.submittedAt}, Content: ${r.content?.substring(0, 100)}...`
      ).join('\n')}
      
      Format your response as a JSON array with 3 items, each having this structure:
      {
        "issueType": "type of issue that might occur",
        "probability": number between 0 and 1 indicating the likelihood,
        "suggestedAction": "detailed suggestion to prevent or mitigate the issue"
      }
      `;

      // Use a text generation model for predictions
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: predictPrompt,
        parameters: {
          max_new_tokens: 750,
          temperature: 0.2,
          return_full_text: false,
        }
      });

      // Extract JSON from the response
      const jsonMatch = response.generated_text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON array');
      }

      const predictions = JSON.parse(jsonMatch[0]);
      return predictions;
    } catch (error) {
      console.error('Error predicting potential issues:', error);
      
      // Return a fallback prediction if the AI service fails
      return [{
        issueType: 'General Process Violations',
        probability: 0.5,
        suggestedAction: 'Ensure all observers are properly trained on reporting procedures'
      }];
    }
  }

  /**
   * Generate a comprehensive report on election observation data
   * @param startDate Start date for the report period
   * @param endDate End date for the report period
   * @returns HTML or markdown report content
   */
  async generateComprehensiveReport(startDate: Date, endDate: Date): Promise<string> {
    try {
      // Get all the relevant data for the time period
      const reportData = await db
        .select()
        .from(reports)
        .where(
          and(
            gte(reports.submittedAt, startDate),
            lte(reports.submittedAt, endDate)
          )
        );
      
      const assignmentData = await db
        .select({
          assignment: assignments,
          user: users,
          station: pollingStations
        })
        .from(assignments)
        .leftJoin(users, eq(assignments.userId, users.id))
        .leftJoin(pollingStations, eq(assignments.stationId, pollingStations.id))
        .where(
          and(
            gte(assignments.startDate, startDate),
            lte(assignments.endDate, endDate)
          )
        );

      // Prepare the data summaries for the AI
      const reportSummary = `
      Reports Summary:
      - Total Reports: ${reportData.length}
      - Critical Reports: ${reportData.filter(r => r.priority === 'high').length}
      - Medium Priority: ${reportData.filter(r => r.priority === 'medium').length}
      - Low Priority: ${reportData.filter(r => r.priority === 'low').length}
      - Resolved Reports: ${reportData.filter(r => r.status === 'resolved').length}
      - Pending Reports: ${reportData.filter(r => r.status === 'pending').length}
      
      Top Report Types:
      ${Object.entries(
        reportData.reduce((acc, report) => {
          const type = report.type || 'Unspecified';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => `- ${type}: ${count} reports`)
        .join('\n')
      }
      `;

      const assignmentSummary = `
      Assignments Summary:
      - Total Assignments: ${assignmentData.length}
      - Total Observers: ${new Set(assignmentData.map(a => a.user.id)).size}
      - Total Polling Stations: ${new Set(assignmentData.map(a => a.station.id)).size}
      - Completed Assignments: ${assignmentData.filter(a => a.assignment.status === 'completed').length}
      - Active Assignments: ${assignmentData.filter(a => a.assignment.status === 'active').length}
      `;

      // Generate the comprehensive report using AI
      const reportPrompt = `
      Generate a comprehensive election observation report for the period from ${startDate.toDateString()} to ${endDate.toDateString()} 
      based on the following data:
      
      ${reportSummary}
      
      ${assignmentSummary}
      
      Your report should include:
      1. An executive summary
      2. Key findings and trends
      3. Areas of concern
      4. Recommendations for improvement
      5. Conclusion
      
      Format the report in Markdown, with proper headings, subheadings, and bullet points.
      `;

      // Use a text generation model for the report
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: reportPrompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.2,
          return_full_text: false,
        }
      });

      return response.generated_text;
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      return `
# Election Observation Report
## Error Generating Report
We encountered a technical issue while generating the comprehensive report. Please try again later or contact technical support.

Error details: ${error instanceof Error ? error.message : 'Unknown error'}
      `;
    }
  }
}

// Create a singleton instance of the service
export const aiAnalyticsService = new AiAnalyticsService();