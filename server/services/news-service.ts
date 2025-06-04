/**
 * News Service - Responsible for fetching and processing Jamaican political and electoral news
 * 
 * This service connects to News API to fetch articles related to Jamaican politics,
 * elections, electoral bodies (EOJ, ECJ, CAFFE), and other relevant political topics.
 */

import axios from 'axios';
import { db } from '../db';
import * as logger from '../utils/logger';

// Types
export interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export interface ProcessedNewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  url: string;
  relevanceScore: number; // 0-1 score of relevance to elections
  keywords: string[];
  locations: string[]; // Extracted locations mentioned in the article
}

// Array of Jamaican political keywords for filtering relevant news
const JAMAICAN_POLITICAL_KEYWORDS = [
  'Jamaica election', 'Jamaican politics', 'Jamaica vote', 
  'EOJ', 'Electoral Office of Jamaica',
  'ECJ', 'Electoral Commission of Jamaica',
  'CAFFE', 'Citizens Action For Free and Fair Elections',
  'PNP', 'People\'s National Party', 
  'JLP', 'Jamaica Labour Party',
  'voter registration', 'polling station Jamaica',
  'ballot Jamaica', 'Kingston constituency',
  'Jamaica electoral', 'Jamaica voting',
  'Jamaican constituency', 'election observation',
  'political candidate Jamaica', 'Jamaica parliament'
];

/**
 * Fetches news articles related to Jamaican politics and elections
 * @param days How many days back to search (1-30)
 * @returns Array of processed news articles
 */
export async function fetchJamaicanPoliticalNews(days: number = 7): Promise<ProcessedNewsArticle[]> {
  try {
    // Validate days parameter to be between 1-30
    const searchDays = Math.min(Math.max(days, 1), 30);
    
    // Calculate the from date (days ago from today)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - searchDays);
    
    const fromDateStr = fromDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      logger.error('NEWS_API_KEY environment variable is not set');
      return [];
    }

    // Create search query for Jamaican political keywords
    // We'll do multiple requests with different keywords to maximize our chances
    // of finding relevant articles
    const allArticles: NewsArticle[] = [];
    
    // First general search for Jamaica + politics
    const response = await axios.get(process.env.NEWS_API_URL || 'https://newsapi.org/v2/everything', {
      params: {
        q: '(Jamaica) AND (politics OR election OR voting OR "electoral commission" OR ballot)',
        from: fromDateStr,
        sortBy: 'relevancy',
        language: 'en',
        apiKey
      }
    });
    
    if (response.data.status === 'ok') {
      allArticles.push(...response.data.articles);
    }
    
    // Search for specific electoral bodies
    const electoralResponse = await axios.get(process.env.NEWS_API_URL || 'https://newsapi.org/v2/everything', {
      params: {
        q: '(Jamaica) AND (EOJ OR "Electoral Office of Jamaica" OR ECJ OR "Electoral Commission of Jamaica" OR CAFFE OR "Citizens Action For Free and Fair Elections")',
        from: fromDateStr,
        sortBy: 'relevancy',
        language: 'en',
        apiKey
      }
    });
    
    if (electoralResponse.data.status === 'ok') {
      allArticles.push(...electoralResponse.data.articles);
    }
    
    // Remove duplicates based on URL
    const uniqueArticles = Array.from(
      new Map(allArticles.map(article => [article.url, article])).values()
    );
    
    // Process and score the articles
    const processedArticles = uniqueArticles.map(article => processNewsArticle(article));
    
    // Sort by relevance score
    return processedArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
  } catch (error) {
    const errObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching Jamaican political news:', errObj);
    return [];
  }
}

/**
 * Process a news article to extract relevant election information
 * @param article The raw news article from News API
 * @returns Processed article with relevance score and extracted information
 */
function processNewsArticle(article: NewsArticle): ProcessedNewsArticle {
  // Combine title and description for keyword matching
  const fullText = `${article.title} ${article.description || ''}`.toLowerCase();
  
  // Count how many keywords match
  const matchedKeywords = JAMAICAN_POLITICAL_KEYWORDS.filter(keyword => 
    fullText.includes(keyword.toLowerCase())
  );
  
  // Calculate relevance score based on keyword matches
  const relevanceScore = Math.min(matchedKeywords.length / 5, 1);
  
  // Extract potential locations (very simple approach)
  const jamaicaLocations = [
    'Kingston', 'Montego Bay', 'Spanish Town', 'Portmore', 'St. Andrew', 
    'St. Catherine', 'St. James', 'St. Ann', 'Trelawny', 'St. Mary', 
    'Portland', 'St. Thomas', 'Manchester', 'Clarendon', 'St. Elizabeth', 
    'Westmoreland', 'Hanover'
  ];
  
  const locations = jamaicaLocations.filter(location => 
    fullText.includes(location.toLowerCase())
  );
  
  return {
    title: article.title,
    source: article.source.name,
    publishedAt: article.publishedAt,
    summary: article.description || article.content || 'No summary available',
    url: article.url,
    relevanceScore,
    keywords: matchedKeywords,
    locations
  };
}

/**
 * Stores the news articles in the system for future reference
 * Note: This functionality would require adding a table to the schema
 * For now, we're keeping articles in memory cache
 */
// In-memory news cache to avoid repeated API calls
let newsCache: {
  articles: ProcessedNewsArticle[];
  lastUpdated: Date;
} = {
  articles: [],
  lastUpdated: new Date(0) // Start with very old date to force update
};

/**
 * Gets the latest Jamaican political news articles 
 * Uses cache if news were fetched within the last hour
 */
export async function getLatestJamaicanPoliticalNews(days: number = 7): Promise<ProcessedNewsArticle[]> {
  const now = new Date();
  // Check if cache exists and is less than 1 hour old
  if (newsCache.articles.length > 0 && 
      (now.getTime() - newsCache.lastUpdated.getTime()) < 3600000) {
    return newsCache.articles;
  }
  
  // Fetch fresh news
  const articles = await fetchJamaicanPoliticalNews(days);
  
  // Update cache
  newsCache = {
    articles,
    lastUpdated: now
  };
  
  return articles;
}