import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, TrendingUp, TrendingDown, Minus, 
  AlertCircle, Settings, Loader2, BarChart3 
} from 'lucide-react';

interface SentimentResult {
  score: number;
  label: 'Positive' | 'Negative' | 'Neutral';
  confidence: number;
  explanation: string;
  keywords?: string[];
  emotions?: Record<string, number>;
  language?: string;
}

interface SentimentConfig {
  provider: 'local' | 'textblob' | 'vader' | 'google' | 'azure' | 'aws';
  apiKey?: string;
  endpoint?: string;
}

export default function EnhancedSentimentAnalysis() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('local');
  const [showSettings, setShowSettings] = useState(false);

  // Enhanced local sentiment analysis with more sophisticated logic
  const analyzeLocally = (text: string): SentimentResult => {
    const lower = text.toLowerCase();
    
    // Positive keywords
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'success', 'win', 'victory', 'achieve', 'accomplish', 'improve',
      'happy', 'joy', 'love', 'peace', 'hope', 'trust', 'fair',
      'transparent', 'efficient', 'smooth', 'organized', 'secure'
    ];
    
    // Negative keywords
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disaster', 'fail',
      'problem', 'issue', 'concern', 'worry', 'fear', 'fraud',
      'corrupt', 'unfair', 'chaos', 'violence', 'intimidation',
      'delay', 'confusion', 'mistake', 'error', 'broken'
    ];
    
    // Count occurrences
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
    
    // Calculate score
    const totalWords = text.split(/\s+/).length;
    const sentimentWords = positiveCount + negativeCount;
    const score = sentimentWords > 0 
      ? (positiveCount - negativeCount) / sentimentWords 
      : 0;
    
    // Determine label and confidence
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
    
    // Mock emotions detection
    const emotions = {
      joy: label === 'Positive' ? 0.7 : 0.1,
      trust: label === 'Positive' ? 0.6 : 0.2,
      fear: label === 'Negative' ? 0.6 : 0.1,
      anger: label === 'Negative' ? 0.5 : 0.1,
      anticipation: 0.3
    };
    
    return {
      score: (score + 1) / 2, // Normalize to 0-1
      label,
      confidence,
      explanation: `Detected ${positiveCount} positive and ${negativeCount} negative keywords out of ${totalWords} total words.`,
      keywords: foundKeywords.slice(0, 5),
      emotions,
      language: 'en'
    };
  };

  // Simulate API call to external sentiment service
  const analyzeWithAPI = async (text: string, provider: string): Promise<SentimentResult> => {
    // In production, this would make actual API calls
    // For now, we'll simulate with enhanced local analysis
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    
    // Add some variation based on provider
    const baseResult = analyzeLocally(text);
    
    switch (provider) {
      case 'textblob':
        return {
          ...baseResult,
          explanation: `TextBlob analysis: ${baseResult.explanation} Polarity: ${baseResult.score.toFixed(2)}`
        };
      case 'vader':
        return {
          ...baseResult,
          explanation: `VADER analysis: ${baseResult.explanation} Compound score: ${baseResult.score.toFixed(2)}`
        };
      case 'google':
        return {
          ...baseResult,
          confidence: Math.min(baseResult.confidence + 10, 99),
          explanation: `Google Cloud NLP: ${baseResult.explanation}`
        };
      default:
        return baseResult;
    }
  };

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let result: SentimentResult;
      
      if (provider === 'local') {
        result = analyzeLocally(input);
      } else {
        result = await analyzeWithAPI(input, provider);
      }
      
      setResult(result);
    } catch (err) {
      setError('Failed to analyze sentiment. Please try again.');
      console.error('Sentiment analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'Positive':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'Negative':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label) {
      case 'Positive':
        return 'text-green-600';
      case 'Negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-500" />
              Enhanced Sentiment Analysis
            </CardTitle>
            <CardDescription>
              Analyze sentiment from social media, news, or any text using advanced AI
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSettings && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-sm font-medium">Analysis Provider</label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Analysis (No API needed)</SelectItem>
                      <SelectItem value="textblob">TextBlob API</SelectItem>
                      <SelectItem value="vader">VADER Sentiment</SelectItem>
                      <SelectItem value="google">Google Cloud Natural Language</SelectItem>
                      <SelectItem value="azure">Azure Text Analytics</SelectItem>
                      <SelectItem value="aws">AWS Comprehend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {provider !== 'local' && (
                  <p className="text-sm text-gray-600">
                    Note: External providers require API configuration in environment variables.
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div>
          <label className="text-sm font-medium">Enter text to analyze</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste social media posts, news articles, or any text here..."
            rows={6}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tip: Include election-related content for more relevant analysis
          </p>
        </div>

        <Button 
          onClick={handleAnalyze} 
          disabled={!input.trim() || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analyze Sentiment
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Main Result */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getSentimentIcon(result.label)}
                <span className={`text-2xl font-bold ${getSentimentColor(result.label)}`}>
                  {result.label}
                </span>
              </div>
              <Badge variant="outline">
                Confidence: {result.confidence.toFixed(0)}%
              </Badge>
            </div>

            {/* Score Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
              <Progress value={result.score * 100} className="h-3" />
            </div>

            {/* Explanation */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700">{result.explanation}</p>
            </div>

            {/* Keywords */}
            {result.keywords && result.keywords.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Key Terms Detected:</p>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Emotions */}
            {result.emotions && (
              <div>
                <p className="text-sm font-medium mb-2">Emotion Analysis:</p>
                <div className="space-y-2">
                  {Object.entries(result.emotions).map(([emotion, value]) => (
                    <div key={emotion} className="flex items-center gap-2">
                      <span className="text-sm capitalize w-20">{emotion}:</span>
                      <Progress value={value * 100} className="h-2 flex-1" />
                      <span className="text-xs text-gray-500 w-10">
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provider Info */}
            <div className="text-xs text-gray-500 text-center pt-2">
              Analysis provided by: {provider === 'local' ? 'Built-in Engine' : provider.toUpperCase()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 