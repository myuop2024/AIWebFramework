import React, { useState, useEffect } from 'react';
import { TrendingUp, Brain, Target, AlertTriangle, CheckCircle, Clock, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  actionable: boolean;
  data?: any;
}

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
}

interface SmartAnalyticsProps {
  className?: string;
}

export function SmartAnalytics({ className }: SmartAnalyticsProps) {
  const [insights, setInsights] = useState<Insight[]>([
    {
      id: '1',
      type: 'prediction',
      title: 'Completion Rate Forecast',
      description: 'Based on current trends, completion rate is expected to reach 94% by end of week, exceeding target by 4%.',
      confidence: 87,
      impact: 'high',
      category: 'Performance',
      actionable: false
    },
    {
      id: '2',
      type: 'anomaly',
      title: 'Unusual Activity Detected',
      description: 'Kingston Central region shows 23% higher report submission rate than usual. Investigate potential causes.',
      confidence: 92,
      impact: 'medium',
      category: 'Regional',
      actionable: true
    },
    {
      id: '3',
      type: 'recommendation',
      title: 'Resource Optimization',
      description: 'Reallocating 2 observers from over-staffed regions could improve coverage efficiency by 15%.',
      confidence: 78,
      impact: 'high',
      category: 'Operations',
      actionable: true
    },
    {
      id: '4',
      type: 'trend',
      title: 'Training Effectiveness',
      description: 'Observers who completed advanced training show 31% better performance metrics.',
      confidence: 95,
      impact: 'medium',
      category: 'Training',
      actionable: true
    }
  ]);

  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      id: '1',
      title: 'Completion Rate',
      value: 89,
      change: 5.2,
      trend: 'up',
      target: 90,
      unit: '%',
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'text-green-600'
    },
    {
      id: '2',
      title: 'Active Observers',
      value: 247,
      change: -3.1,
      trend: 'down',
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-600'
    },
    {
      id: '3',
      title: 'Avg Response Time',
      value: '2.3h',
      change: -12.5,
      trend: 'up',
      icon: <Clock className="h-5 w-5" />,
      color: 'text-orange-600'
    },
    {
      id: '4',
      title: 'Coverage Areas',
      value: 156,
      change: 8.7,
      trend: 'up',
      target: 160,
      icon: <MapPin className="h-5 w-5" />,
      color: 'text-purple-600'
    }
  ]);

  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Reduce update frequency to save CPU
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: typeof metric.value === 'number' 
          ? metric.value + (Math.random() - 0.5) * 2
          : metric.value,
        change: metric.change + (Math.random() - 0.5) * 1
      })));
    }, 30000); // Update every 30 seconds instead of 5

    return () => clearInterval(interval);
  }, []);

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newInsight: Insight = {
      id: Date.now().toString(),
      type: 'prediction',
      title: 'Performance Optimization Opportunity',
      description: 'AI analysis suggests implementing staggered scheduling could improve efficiency by 18% while reducing observer fatigue.',
      confidence: 84,
      impact: 'high',
      category: 'AI Generated',
      actionable: true
    };
    
    setInsights(prev => [newInsight, ...prev.slice(0, 4)]);
    setIsAnalyzing(false);
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-4 w-4" />;
      case 'anomaly': return <AlertTriangle className="h-4 w-4" />;
      case 'prediction': return <Brain className="h-4 w-4" />;
      case 'recommendation': return <Target className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'trend': return 'text-blue-600 bg-blue-100';
      case 'anomaly': return 'text-red-600 bg-red-100';
      case 'prediction': return 'text-purple-600 bg-purple-100';
      case 'recommendation': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getImpactColor = (impact: Insight['impact']) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Smart Analytics</h2>
          <p className="text-muted-foreground">AI-powered insights and predictive analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={runAIAnalysis}
            disabled={isAnalyzing}
            className="relative"
          >
            <Brain className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-primary/10 rounded animate-pulse" />
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => (
          <Card key={metric.id} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg", metric.color.replace('text-', 'bg-').replace('-600', '-100'))}>
                  <div className={metric.color}>
                    {metric.icon}
                  </div>
                </div>
                <Badge variant={metric.trend === 'up' ? 'default' : metric.trend === 'down' ? 'destructive' : 'secondary'}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground">{metric.title}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {typeof metric.value === 'number' ? metric.value.toFixed(0) : metric.value}
                  </span>
                  {metric.unit && <span className="text-sm text-muted-foreground">{metric.unit}</span>}
                </div>
                
                {metric.target && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress to target</span>
                      <span>{metric.target}{metric.unit}</span>
                    </div>
                    <Progress 
                      value={typeof metric.value === 'number' ? (metric.value / metric.target) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Insights
            <Badge variant="secondary" className="ml-auto">
              {insights.length} insights
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map(insight => (
              <div key={insight.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", getInsightColor(insight.type))}>
                    {getInsightIcon(insight.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant="outline" className={getImpactColor(insight.impact)}>
                        {insight.impact} impact
                      </Badge>
                      <Badge variant="outline">
                        {insight.confidence}% confidence
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {insight.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant="secondary">{insight.category}</Badge>
                        <Badge variant="outline" className="capitalize">
                          {insight.type}
                        </Badge>
                      </div>
                      
                      {insight.actionable && (
                        <Button variant="outline" size="sm">
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Interactive trend visualization would be rendered here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Predictive models and forecasts would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Anomaly detection results and patterns would be shown here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Actionable recommendations and optimization suggestions would be listed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}