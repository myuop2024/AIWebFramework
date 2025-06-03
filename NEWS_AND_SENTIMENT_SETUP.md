# News Feature and Sentiment Analysis Setup Guide

## Issue Summary

1. **News Feature Error**: The dashboard shows an error when loading news, likely due to:
   - Missing news entries in the database
   - API endpoint not returning data in expected format
   - Permission issues

2. **Admin News Management**: The admin news page exists at `/admin/news` but needs to be properly linked in the menu.

3. **Sentiment Analysis**: Currently using basic keyword matching, needs proper API integration.

## Solutions

### 1. Fix News Feature

#### A. Check Database Migration
First, ensure the news_entries table exists:

```sql
-- Check if table exists
SELECT * FROM news_entries LIMIT 1;

-- If not, create it
CREATE TABLE IF NOT EXISTS news_entries (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

#### B. Add Sample News Data
```sql
INSERT INTO news_entries (title, content, category, is_published) VALUES
('Election Monitoring Training Begins', 'All observers are required to complete the online training modules before deployment.', 'Training', true),
('New Polling Station Guidelines', 'Updated guidelines for polling station procedures have been released.', 'Update', true),
('Important: Security Protocol Update', 'Please review the new security protocols for election day.', 'Alert', true);
```

#### C. Fix API Response
The `/api/news/latest` endpoint is already configured to return an empty array on error, which is good. The issue might be that there's no data.

### 2. Access Admin News Management

The admin news management page is already created and accessible at `/admin/news`. To access it:

1. **Direct URL**: Navigate to `/admin/news`
2. **Menu Access**: It's already in the sidebar under Administration > Content Management > News Management
3. **Required Permission**: User needs `news:create` or `admin:access-panel` permission

### 3. Enhanced Sentiment Analysis Implementation

#### A. Environment Variables Setup
Add these to your `.env` file:

```env
# Sentiment Analysis API Keys (choose one or multiple)
TEXTBLOB_API_KEY=your_textblob_key
GOOGLE_CLOUD_API_KEY=your_google_cloud_key
AZURE_TEXT_ANALYTICS_KEY=your_azure_key
AZURE_TEXT_ANALYTICS_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# News API Keys (for external news)
NEWS_API_KEY=your_newsapi_key
GOOGLE_NEWS_API_KEY=your_google_news_key
```

#### B. Backend API Implementation

Create `server/services/sentiment-service.ts`:

```typescript
import { TextAnalyticsClient, AzureKeyCredential } from "@azure/ai-text-analytics";
import { ComprehendClient, DetectSentimentCommand } from "@aws-sdk/client-comprehend";

export interface SentimentResult {
  score: number;
  label: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  confidence: number;
  keywords?: string[];
  emotions?: Record<string, number>;
  language?: string;
}

export class SentimentAnalysisService {
  private azureClient?: TextAnalyticsClient;
  private awsClient?: ComprehendClient;

  constructor() {
    // Initialize Azure client if credentials exist
    if (process.env.AZURE_TEXT_ANALYTICS_KEY && process.env.AZURE_TEXT_ANALYTICS_ENDPOINT) {
      this.azureClient = new TextAnalyticsClient(
        process.env.AZURE_TEXT_ANALYTICS_ENDPOINT,
        new AzureKeyCredential(process.env.AZURE_TEXT_ANALYTICS_KEY)
      );
    }

    // Initialize AWS client if credentials exist
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.awsClient = new ComprehendClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  async analyze(text: string, provider: string = 'local'): Promise<SentimentResult> {
    switch (provider) {
      case 'azure':
        return this.analyzeWithAzure(text);
      case 'aws':
        return this.analyzeWithAWS(text);
      case 'google':
        return this.analyzeWithGoogle(text);
      default:
        return this.analyzeLocally(text);
    }
  }

  private async analyzeWithAzure(text: string): Promise<SentimentResult> {
    if (!this.azureClient) {
      throw new Error('Azure Text Analytics not configured');
    }

    const [result] = await this.azureClient.analyzeSentiment([text]);
    
    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      score: result.confidenceScores.positive,
      label: this.mapAzureSentiment(result.sentiment),
      confidence: Math.max(
        result.confidenceScores.positive,
        result.confidenceScores.negative,
        result.confidenceScores.neutral
      ),
      language: result.language,
    };
  }

  private async analyzeWithAWS(text: string): Promise<SentimentResult> {
    if (!this.awsClient) {
      throw new Error('AWS Comprehend not configured');
    }

    const command = new DetectSentimentCommand({
      Text: text,
      LanguageCode: 'en',
    });

    const response = await this.awsClient.send(command);
    
    return {
      score: response.SentimentScore?.Positive || 0,
      label: this.mapAWSSentiment(response.Sentiment || 'NEUTRAL'),
      confidence: Math.max(
        response.SentimentScore?.Positive || 0,
        response.SentimentScore?.Negative || 0,
        response.SentimentScore?.Neutral || 0,
        response.SentimentScore?.Mixed || 0
      ),
    };
  }

  private async analyzeWithGoogle(text: string): Promise<SentimentResult> {
    // Google Cloud Natural Language API implementation
    // Requires @google-cloud/language package
    throw new Error('Google Cloud NLP not implemented yet');
  }

  private analyzeLocally(text: string): SentimentResult {
    // Enhanced local analysis (same as frontend implementation)
    const lower = text.toLowerCase();
    
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'success', 'win', 'victory', 'achieve', 'accomplish', 'improve',
      'happy', 'joy', 'love', 'peace', 'hope', 'trust', 'fair',
      'transparent', 'efficient', 'smooth', 'organized', 'secure'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disaster', 'fail',
      'problem', 'issue', 'concern', 'worry', 'fear', 'fraud',
      'corrupt', 'unfair', 'chaos', 'violence', 'intimidation',
      'delay', 'confusion', 'mistake', 'error', 'broken'
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    const foundKeywords: string[] = [];
    
    positiveWords.forEach(word => {
      if (lower.includes(word)) {
        positiveCount++;
        foundKeywords.push(word);
      }
    });
    
    negativeWords.forEach(word => {
      if (lower.includes(word)) {
        negativeCount++;
        foundKeywords.push(word);
      }
    });
    
    const totalWords = text.split(/\s+/).length;
    const sentimentWords = positiveCount + negativeCount;
    const score = sentimentWords > 0 
      ? (positiveCount - negativeCount) / sentimentWords 
      : 0;
    
    let label: 'Positive' | 'Negative' | 'Neutral';
    let confidence: number;
    
    if (score > 0.2) {
      label = 'Positive';
      confidence = Math.min(score * 100, 95);
    } else if (score < -0.2) {
      label = 'Negative';
      confidence = Math.min(Math.abs(score) * 100, 95);
    } else {
      label = 'Neutral';
      confidence = 70 - Math.abs(score) * 50;
    }
    
    return {
      score: (score + 1) / 2,
      label,
      confidence,
      keywords: foundKeywords.slice(0, 5),
      language: 'en'
    };
  }

  private mapAzureSentiment(sentiment: string): 'Positive' | 'Negative' | 'Neutral' | 'Mixed' {
    switch (sentiment) {
      case 'positive': return 'Positive';
      case 'negative': return 'Negative';
      case 'neutral': return 'Neutral';
      case 'mixed': return 'Mixed';
      default: return 'Neutral';
    }
  }

  private mapAWSSentiment(sentiment: string): 'Positive' | 'Negative' | 'Neutral' | 'Mixed' {
    switch (sentiment) {
      case 'POSITIVE': return 'Positive';
      case 'NEGATIVE': return 'Negative';
      case 'NEUTRAL': return 'Neutral';
      case 'MIXED': return 'Mixed';
      default: return 'Neutral';
    }
  }
}
```

#### C. API Endpoint

Create `server/routes/sentiment-routes.ts`:

```typescript
import { Router } from 'express';
import { SentimentAnalysisService } from '../services/sentiment-service';
import { ensureAuthenticated } from '../middleware/auth';

const router = Router();
const sentimentService = new SentimentAnalysisService();

router.post('/analyze', ensureAuthenticated, async (req, res) => {
  try {
    const { text, provider = 'local' } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }
    
    const result = await sentimentService.analyze(text, provider);
    res.json(result);
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze sentiment',
      message: error.message 
    });
  }
});

export default router;
```

#### D. Frontend Integration

Update the sentiment analysis component to use the API:

```typescript
// In sentiment-analysis-enhanced.tsx
const analyzeWithAPI = async (text: string, provider: string): Promise<SentimentResult> => {
  const response = await fetch('/api/sentiment/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, provider }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to analyze sentiment');
  }
  
  return response.json();
};
```

### 4. Testing

1. **Test News Feature**:
   - Navigate to `/admin/news`
   - Create a few news entries
   - Check if they appear on the dashboard

2. **Test Sentiment Analysis**:
   - Go to Analytics Dashboard > Sentiment Analysis tab
   - Try different providers (local works without API keys)
   - Test with election-related text

### 5. Production Considerations

1. **API Rate Limits**: Implement caching and rate limiting for external APIs
2. **Cost Management**: Monitor API usage to control costs
3. **Error Handling**: Gracefully handle API failures
4. **Data Privacy**: Ensure sensitive text is not logged
5. **Performance**: Consider batch processing for multiple texts

## Quick Fixes

If you need immediate fixes without API setup:

1. **News**: Add news entries manually via `/admin/news`
2. **Sentiment**: Use the local provider which works without API keys
3. **Permissions**: Ensure your user has admin role or specific permissions

## Troubleshooting

1. **News not showing**: Check browser console for API errors
2. **Sentiment analysis failing**: Verify API keys in environment variables
3. **Permission denied**: Check user roles and permissions in database
4. **API errors**: Check server logs for detailed error messages 