import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Alert,
  AlertTitle,
  AlertDescription
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DropdownMenu } from '@/components/ui/dropdown-menu'; // Added import
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  AlertTriangle, 
  Check, 
  Info, 
  FileText,
  Newspaper,
  AlertCircle,
  ExternalLink,
  MapPin
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Cloud, CloudRain, Sun, Wifi, WifiOff } from 'lucide-react';
import EnhancedSentimentAnalysis from './sentiment-analysis-enhanced';

type TabValue = 'overview' | 'locations' | 'trends' | 'insights' | 'predictions' | 'sentiment' | 'turnout-maps';

type TimeRange = {
  startDate: Date;
  endDate: Date;
};

// Types for API responses
type AnalyticsData = {
  reportStats: {
    totalReports: number;
    pendingReports: number;
    reviewedReports: number;
    criticalReports: number;
  };
  recentTrends: {
    category: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentChange: number;
  }[];
  aiInsights: {
    insight: string;
    confidence: number;
    category: string;
    relatedReportIds: number[];
  }[];
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
};

// News-enhanced prediction types
type NewsArticle = {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  url: string;
  relevanceScore: number;
  locations: string[];
};

type IncidentPrediction = {
  issueType: string;
  probability: number;
  suggestedAction: string;
  reasoning: string;
  affectedStations?: string[];
  estimatedImpact: 'low' | 'medium' | 'high';
  preventativeMeasures: string[];
  relatedNewsArticles?: string[];
};

type NewsEnhancedPredictionResponse = {
  predictions: IncidentPrediction[];
  newsArticles: NewsArticle[];
  message?: string;
};

// Mock turnout data
const mockTurnoutData = [
  { time: '8:00', predicted: 15, actual: 12 },
  { time: '10:00', predicted: 35, actual: 38 },
  { time: '12:00', predicted: 55, actual: 52 },
  { time: '14:00', predicted: 70, actual: 68 },
  { time: '16:00', predicted: 85, actual: null },
  { time: '18:00', predicted: 95, actual: null },
];

// Mock heatmap data
const mockHeatmapData = [
  { lat: 18.0179, lng: -76.8099, intensity: 8, region: 'Kingston' },
  { lat: 18.4762, lng: -77.8939, intensity: 5, region: 'Montego Bay' },
  { lat: 18.1825, lng: -77.3218, intensity: 3, region: 'Ocho Rios' },
  { lat: 17.9927, lng: -76.7920, intensity: 6, region: 'Spanish Town' },
];

// Mock weather data
const mockWeatherImpact = {
  current: 'sunny',
  impact: 'positive',
  message: 'Clear weather is expected to increase turnout by 5-10%'
};

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState<'from' | 'to' | null>(null);
  const [stationId, setStationId] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [sentimentInput, setSentimentInput] = useState('');
  const [sentimentResult, setSentimentResult] = useState<null | { score: number; label: string; explanation: string }>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(true);

  // Fetch analytics data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/analytics/dashboard', timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (timeRange?.startDate && timeRange?.endDate) {
        params.append('startDate', timeRange.startDate.toISOString());
        params.append('endDate', timeRange.endDate.toISOString());
      }

      const response = await fetch(`/api/analytics/dashboard?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json() as Promise<AnalyticsData>;
    },
    enabled: true,
  });

  const { toast } = useToast();

  // Fetch news-enhanced predictions
  const { 
    data: newsEnhancedPredictions, 
    isLoading: isPredictionsLoading,
    error: predictionsError,
    refetch: refetchPredictions
  } = useQuery<NewsEnhancedPredictionResponse>({
    queryKey: ['/api/admin/analytics/news-enhanced-predictions', stationId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stationId) {
        params.append('stationId', stationId.toString());
      }

      // Use the correct endpoint from news-enhanced-predictions.ts
      const response = await fetch(`/api/admin/analytics/news-enhanced-predictions?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Prediction fetch error:", errorText);
        throw new Error(errorText || 'Failed to fetch news-enhanced predictions');
      }

      return response.json();
    },
    enabled: activeTab === 'predictions',
  });
  
  // Show toast if there's an error with predictions
  useEffect(() => {
    if (predictionsError) {
      toast({
        title: "Failed to load predictions",
        description: predictionsError instanceof Error ? predictionsError.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [predictionsError, toast]);

  // Apply date range filter
  const applyDateFilter = () => {
    if (dateFrom && dateTo) {
      setTimeRange({
        startDate: dateFrom,
        endDate: dateTo,
      });
    }
  };

  // Clear date range filter
  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setTimeRange(null);
  };

  // Reset the date range when the component is mounted
  useEffect(() => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    setDateFrom(oneMonthAgo);
    setDateTo(now);
    setTimeRange({
      startDate: oneMonthAgo,
      endDate: now,
    });
  }, []);

  // Simulate real-time connection
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRealTimeConnected(prev => !prev);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Generate a comprehensive report
  const generateReport = async () => {
    if (!dateFrom || !dateTo) return;

    setIsGeneratingReport(true);
    setReportContent(null);

    try {
      const response = await fetch('/api/analytics/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateFrom.toISOString(),
          endDate: dateTo.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportContent(data.report);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Helper for trend icons
  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  // Helper for severity badges
  const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Medium</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-red-50 text-red-700">High</Badge>;
    }
  };

  // Simple sentiment analysis (mocked, replace with real model/API)
  function analyzeSentiment(text: string): { score: number; label: string; explanation: string } {
    // Very basic: positive if contains 'good', negative if 'bad', else neutral
    const lower = text.toLowerCase();
    if (lower.includes('good') || lower.includes('success') || lower.includes('win')) {
      return { score: 0.8, label: 'Positive', explanation: 'Detected positive keywords.' };
    }
    if (lower.includes('bad') || lower.includes('fail') || lower.includes('problem')) {
      return { score: 0.2, label: 'Negative', explanation: 'Detected negative keywords.' };
    }
    return { score: 0.5, label: 'Neutral', explanation: 'No strong sentiment detected.' };
  }

  const handleAnalyzeSentiment = () => {
    setSentimentLoading(true);
    setTimeout(() => {
      setSentimentResult(analyzeSentiment(sentimentInput));
      setSentimentLoading(false);
    }, 500);
  };

  // Add weather icon helper
  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'sunny': return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'rainy': return <CloudRain className="h-5 w-5 text-blue-500" />;
      default: return <Cloud className="h-5 w-5 text-gray-500" />;
    }
  };

  if (error) {
    const axiosError = error as any;
    const errorMsg = axiosError?.response?.data?.error || axiosError?.data?.error || axiosError?.message || "Please try again later.";
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load analytics data: {errorMsg}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Election Analytics Dashboard
        </h1>
        <p className="text-gray-500 mb-4">
          AI-powered insights and analytics for election observation
        </p>

        <div className="flex flex-wrap gap-4 mb-4">
          {/* Date filter controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <Label htmlFor="date-range">Date Range</Label>
              <div className="flex mt-1 space-x-2">
                <Popover open={showCalendar === 'from'} onOpenChange={(open) => !open && setShowCalendar(null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setShowCalendar('from')}
                      className="w-[150px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => {
                        setDateFrom(date);
                        setShowCalendar(null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <span className="self-center">to</span>

                <Popover open={showCalendar === 'to'} onOpenChange={(open) => !open && setShowCalendar(null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setShowCalendar('to')}
                      className="w-[150px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => {
                        setDateTo(date);
                        setShowCalendar(null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button onClick={applyDateFilter} size="sm">Apply</Button>
                <Button onClick={clearDateFilter} variant="outline" size="sm">Clear</Button>
              </div>
            </div>
          </div>

          <div className="ml-auto">
            <Button
              onClick={generateReport}
              disabled={isGeneratingReport || !dateFrom || !dateTo}
              className="ml-auto"
            >
              {isGeneratingReport ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Status Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isRealTimeConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">Real-time Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">Reconnecting...</span>
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="turnout-maps">Turnout & Maps</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-12 h-12" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data?.reportStats && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Reports</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{data.reportStats.totalReports}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Pending Review</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{data.reportStats.pendingReports}</div>
                        <Progress 
                          value={(data.reportStats.pendingReports / data.reportStats.totalReports) * 100} 
                          className="h-2 mt-2"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Reviewed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{data.reportStats.reviewedReports}</div>
                        <Progress 
                          value={(data.reportStats.reviewedReports / data.reportStats.totalReports) * 100} 
                          className="h-2 mt-2"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Critical Issues</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{data.reportStats.criticalReports}</div>
                        <Progress 
                          value={(data.reportStats.criticalReports / data.reportStats.totalReports) * 100} 
                          className="h-2 mt-2"
                        />
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Issues Categories */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Top Issue Categories</CardTitle>
                    <CardDescription>Most common types of reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data?.topIssueCategories?.map((category, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{category.category}</span>
                            <span className="text-sm text-gray-500">{category.count} reports ({category.percentage}%)</span>
                          </div>
                          <Progress value={category.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent AI Insights */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Recent AI Insights</CardTitle>
                    <CardDescription>AI-generated insights from reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data?.aiInsights?.slice(0, 3).map((insight, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start">
                            <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                            <div>
                              <p className="text-sm">{insight.insight}</p>
                              <div className="flex justify-between mt-2">
                                <Badge variant="secondary">{insight.category}</Badge>
                                <span className="text-xs text-gray-500">
                                  Confidence: {Math.round(insight.confidence * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setActiveTab('insights')}
                    >
                      View all insights
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            {/* Locations Tab */}
            <TabsContent value="locations">
              <Card>
                <CardHeader>
                  <CardTitle>Reports by Location</CardTitle>
                  <CardDescription>Polling stations with most reported issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-3 px-4 text-left">Location</th>
                          <th className="py-3 px-4 text-center">Reports Count</th>
                          <th className="py-3 px-4 text-center">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.reportsByLocation?.map((location, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-3 px-4">{location.locationName}</td>
                            <td className="py-3 px-4 text-center">{location.count}</td>
                            <td className="py-3 px-4 text-center">
                              {getSeverityBadge(location.severity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Report Trends</CardTitle>
                  <CardDescription>Changes in report patterns over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-3 px-4 text-left">Category</th>
                          <th className="py-3 px-4 text-center">Count</th>
                          <th className="py-3 px-4 text-center">Trend</th>
                          <th className="py-3 px-4 text-right">% Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.recentTrends?.map((trend, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-3 px-4">{trend.category}</td>
                            <td className="py-3 px-4 text-center">{trend.count}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center">
                                {getTrendIcon(trend.trend)}
                              </div>
                            </td>
                            <td className={`py-3 px-4 text-right ${
                              trend.percentChange > 0 
                                ? 'text-red-600' 
                                : trend.percentChange < 0 
                                ? 'text-green-600' 
                                : ''
                            }`}>
                              {trend.percentChange > 0 && '+'}
                              {trend.percentChange}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Generated Insights</CardTitle>
                  <CardDescription>Patterns and insights identified by the AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {data?.aiInsights?.map((insight, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center">
                            <Info className="h-5 w-5 text-blue-500 mr-2" />
                            Insight: {insight.category}
                          </CardTitle>
                          <CardDescription>
                            Confidence: {Math.round(insight.confidence * 100)}%
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>{insight.insight}</p>
                          {insight.relatedReportIds.length > 0 && (
                            <div className="mt-2">
                              <span className="text-sm text-gray-500">Related Reports: </span>
                              {insight.relatedReportIds.map((id, idx) => (
                                <Badge key={idx} variant="outline" className="ml-1">
                                  #{id}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 mr-2 text-blue-500" />
                          News-Enhanced Election Issue Predictions
                        </div>
                      </CardTitle>
                      <CardDescription>AI-predicted potential issues with Jamaican news context</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <Label htmlFor="stationId">Filter by Polling Station</Label>
                        <Select 
                          onValueChange={(value) => setStationId(value === 'all' ? null : parseInt(value))}
                          value={stationId?.toString() || 'all'}
                        >
                          <SelectTrigger className="w-full md:w-[300px] mt-1">
                            <SelectValue placeholder="All polling stations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All polling stations</SelectItem>
                            {data?.reportsByLocation?.map((location, index) => (
                              <SelectItem key={index} value={location.locationName || `${index}`}>
                                {location.locationName || `Location ${index + 1}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {isPredictionsLoading ? (
                        <div className="flex justify-center py-8">
                          <Spinner className="w-8 h-8" />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {newsEnhancedPredictions?.predictions?.map((prediction, index) => (
                            <Card key={index} className={`border-l-4 ${
                              prediction.probability > 0.7 
                                ? 'border-l-red-500' 
                                : prediction.probability > 0.4 
                                ? 'border-l-yellow-500' 
                                : 'border-l-green-500'
                            }`}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center">
                                  <AlertTriangle className={`h-5 w-5 mr-2 ${
                                    prediction.probability > 0.7 
                                      ? 'text-red-500' 
                                      : prediction.probability > 0.4 
                                      ? 'text-yellow-500' 
                                      : 'text-green-500'
                                  }`} />
                                  {prediction.issueType}
                                </CardTitle>
                                <CardDescription className="flex justify-between">
                                  <span>Probability: {Math.round(prediction.probability * 100)}%</span>
                                  <span>Impact: {prediction.estimatedImpact[0].toUpperCase() + prediction.estimatedImpact.slice(1)}</span>
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="font-medium">Reasoning:</h4>
                                    <p className="text-gray-700 text-sm">{prediction.reasoning}</p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium">Suggested Action:</h4>
                                    <p className="text-gray-700 text-sm">{prediction.suggestedAction}</p>
                                  </div>
                                  
                                  {prediction.preventativeMeasures && prediction.preventativeMeasures.length > 0 && (
                                    <div>
                                      <h4 className="font-medium">Preventative Measures:</h4>
                                      <ul className="list-disc list-inside text-sm text-gray-700 pl-2">
                                        {prediction.preventativeMeasures.map((measure, i) => (
                                          <li key={i}>{measure}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {prediction.affectedStations && prediction.affectedStations.length > 0 && (
                                    <div>
                                      <h4 className="font-medium">Affected Stations:</h4>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {prediction.affectedStations.map((station, i) => (
                                          <Badge key={i} variant="outline">{station}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          {(!newsEnhancedPredictions?.predictions || newsEnhancedPredictions.predictions.length === 0) && (
                            <div className="py-8 text-center text-gray-500">
                              <Info className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                              <p>No predictions available. Try changing your filters or collecting more data.</p>
                              {newsEnhancedPredictions?.message && (
                                <p className="mt-2 text-sm italic">{newsEnhancedPredictions.message}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* News Articles Column */}
                <div className="col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Newspaper className="h-5 w-5 mr-2 text-blue-500" />
                        Jamaican Political News
                      </CardTitle>
                      <CardDescription>Recent news informing predictions</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[600px] overflow-y-auto">
                      {isPredictionsLoading ? (
                        <div className="flex justify-center py-8">
                          <Spinner className="w-6 h-6" />
                        </div>
                      ) : newsEnhancedPredictions?.newsArticles && newsEnhancedPredictions.newsArticles.length > 0 ? (
                        <div className="space-y-4">
                          {newsEnhancedPredictions.newsArticles.map((article, index) => (
                            <div key={index} className="border-b pb-4 last:border-b-0">
                              <h4 className="font-medium text-sm line-clamp-2">{article.title}</h4>
                              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                <span>{article.source}</span>
                                <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-gray-700 mt-2 line-clamp-3">{article.summary}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex gap-1">
                                  {article.locations.slice(0, 2).map((location, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{location}</Badge>
                                  ))}
                                  {article.locations.length > 2 && (
                                    <Badge variant="outline" className="text-xs">+{article.locations.length - 2}</Badge>
                                  )}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="px-2"
                                  onClick={() => window.open(article.url, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-500">
                          <Newspaper className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                          <p className="text-sm">No relevant news articles found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Sentiment Analysis Tab */}
            {activeTab === 'sentiment' && (
              <TabsContent value="sentiment" className="space-y-6">
                <EnhancedSentimentAnalysis />
              </TabsContent>
            )}

            {/* Turnout & Maps Tab */}
            <TabsContent value="turnout-maps" className="space-y-6">
              {/* Turnout Forecasting */}
              <Card>
                <CardHeader>
                  <CardTitle>Turnout Forecasting</CardTitle>
                  <CardDescription>Predicted vs Actual Voter Turnout</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockTurnoutData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis label={{ value: 'Turnout %', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="predicted" stroke="#8884d8" name="Predicted" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getWeatherIcon(mockWeatherImpact.current)}
                      <span className="text-sm">{mockWeatherImpact.message}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interactive Heatmap */}
              <Card>
                <CardHeader>
                  <CardTitle>Incident Density Heatmap</CardTitle>
                  <CardDescription>Click on markers for details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-lg overflow-hidden border">
                    <div className="h-full relative bg-gray-100">
                      {/* Mock heatmap visualization */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">Interactive Map View</p>
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            {mockHeatmapData.map((point, idx) => (
                              <div key={idx} className="bg-white p-3 rounded shadow">
                                <p className="font-semibold">{point.region}</p>
                                <p className="text-sm text-gray-600">Intensity: {point.intensity}/10</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resource Optimization */}
              <Card>
                <CardHeader>
                  <CardTitle>Resource Optimization</CardTitle>
                  <CardDescription>AI-suggested resource allocation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Recommendation</AlertTitle>
                      <AlertDescription>
                        Based on current turnout patterns, consider reallocating 2 observers from Ocho Rios to Kingston Central.
                      </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded">
                        <p className="text-sm text-gray-600">Observers Needed</p>
                        <p className="text-2xl font-bold">+5</p>
                        <p className="text-xs text-gray-500">Kingston Central</p>
                      </div>
                      <div className="p-4 border rounded">
                        <p className="text-sm text-gray-600">Surplus Observers</p>
                        <p className="text-2xl font-bold">3</p>
                        <p className="text-xs text-gray-500">Ocho Rios</p>
                      </div>
                      <div className="p-4 border rounded">
                        <p className="text-sm text-gray-600">Optimal Coverage</p>
                        <p className="text-2xl font-bold">92%</p>
                        <p className="text-xs text-gray-500">After reallocation</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Report Generation Result */}
      {reportContent && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Generated Report
            </CardTitle>
            <CardDescription>
              {dateFrom && dateTo ? `For period ${format(dateFrom, 'PPP')} to ${format(dateTo, 'PPP')}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              {/* Render markdown content */}
              <div dangerouslySetInnerHTML={{ __html: reportContent.replace(/\n/g, '<br />') }} />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setReportContent(null)}>Close Report</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}