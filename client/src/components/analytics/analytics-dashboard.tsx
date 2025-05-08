import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Calendar as CalendarIcon, TrendingDown, TrendingUp, Minus, AlertTriangle, Check, Info, FileText } from 'lucide-react';

type TabValue = 'overview' | 'locations' | 'trends' | 'insights' | 'predictions';

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

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState<'from' | 'to' | null>(null);
  const [stationId, setStationId] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);

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

  // Fetch predictions based on station
  const { 
    data: predictions, 
    isLoading: isPredictionsLoading,
    refetch: refetchPredictions
  } = useQuery({
    queryKey: ['/api/analytics/predict-issues', stationId],
    queryFn: async () => {
      const response = await fetch('/api/analytics/predict-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stationId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      return response.json();
    },
    enabled: activeTab === 'predictions',
  });

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

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load analytics data. Please try again later.</AlertDescription>
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
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
              <Card>
                <CardHeader>
                  <CardTitle>Issue Predictions</CardTitle>
                  <CardDescription>AI-predicted potential issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Label htmlFor="stationId">Filter by Polling Station</Label>
                    <Select 
                      onValueChange={(value) => setStationId(value ? parseInt(value) : null)}
                      value={stationId?.toString() || ''}
                    >
                      <SelectTrigger className="w-full md:w-[300px] mt-1">
                        <SelectValue placeholder="All polling stations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All polling stations</SelectItem>
                        {data?.reportsByLocation?.map((location, index) => (
                          <SelectItem key={index} value={location.locationName}>
                            {location.locationName}
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
                      {predictions?.map((prediction: any, index: number) => (
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
                            <CardDescription>
                              Probability: {Math.round(prediction.probability * 100)}%
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <h4 className="font-medium mb-1">Suggested Action:</h4>
                            <p className="text-gray-700">{prediction.suggestedAction}</p>
                          </CardContent>
                        </Card>
                      ))}

                      {(!predictions || predictions.length === 0) && (
                        <div className="py-8 text-center text-gray-500">
                          <Info className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                          <p>No predictions available. Try changing your filters or collecting more data.</p>
                        </div>
                      )}
                    </div>
                  )}
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