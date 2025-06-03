import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { ModernCard } from '@/components/ui/modern-card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Sparkles, Brain, Users, Smartphone, BarChart, Zap, Globe, Shield, Mic } from 'lucide-react';
import { AIAssistant } from '@/components/advanced/ai-assistant';
import { RealTimeCollaboration } from '@/components/advanced/real-time-collaboration';
import { SmartAnalytics } from '@/components/advanced/smart-analytics';
import { ProgressiveWebApp } from '@/components/advanced/progressive-web-app';
import { VoiceMemos } from '@/components/offline/voice-memos';

export default function AdvancedFeatures() {
  const [activeTab, setActiveTab] = useState('ai-assistant');

  const features = [
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      description: 'Intelligent help with natural language processing and voice commands',
      icon: <Brain className="h-5 w-5" />,
      badge: 'AI Powered',
      color: 'text-purple-600',
      component: <AIAssistant />
    },
    {
      id: 'collaboration',
      title: 'Real-Time Collaboration',
      description: 'Live cursors, presence indicators, and collaborative editing',
      icon: <Users className="h-5 w-5" />,
      badge: 'Live',
      color: 'text-blue-600',
      component: <RealTimeCollaboration />
    },
    {
      id: 'analytics',
      title: 'Smart Analytics',
      description: 'AI-powered insights, predictive analytics, and intelligent recommendations',
      icon: <BarChart className="h-5 w-5" />,
      badge: 'Predictive',
      color: 'text-green-600',
      component: <SmartAnalytics />
    },
    {
      id: 'pwa',
      title: 'Progressive Web App',
      description: 'Offline capabilities, push notifications, and native app experience',
      icon: <Smartphone className="h-5 w-5" />,
      badge: 'Offline Ready',
      color: 'text-orange-600',
      component: <ProgressiveWebApp />
    },
    {
      id: 'voice-memos',
      title: 'Offline Voice Memos',
      description: 'Record audio reports that sync when connection returns',
      icon: <Mic className="h-5 w-5" />,
      badge: 'Offline',
      color: 'text-teal-600',
      component: <VoiceMemos />
    }
  ];

  const highlights = [
    {
      title: 'AI-Powered Intelligence',
      description: 'Advanced machine learning algorithms provide contextual assistance and predictive insights',
      icon: <Brain className="h-6 w-6 text-purple-600" />,
      stats: ['95% Accuracy', 'Natural Language', 'Voice Commands']
    },
    {
      title: 'Real-Time Collaboration',
      description: 'Work together seamlessly with live presence indicators and collaborative editing',
      icon: <Users className="h-6 w-6 text-blue-600" />,
      stats: ['Live Cursors', 'Instant Sync', 'Team Presence']
    },
    {
      title: 'Predictive Analytics',
      description: 'Smart insights and forecasting to optimize operations and improve decision-making',
      icon: <BarChart className="h-6 w-6 text-green-600" />,
      stats: ['87% Prediction Rate', 'Anomaly Detection', 'Smart Recommendations']
    },
    {
      title: 'Progressive Web App',
      description: 'Native app experience with offline capabilities and push notifications',
      icon: <Smartphone className="h-6 w-6 text-orange-600" />,
      stats: ['Offline Mode', 'Push Notifications', 'App Install']
    },
    {
      title: 'Enterprise Security',
      description: 'Multi-layer security with advanced threat detection and compliance',
      icon: <Shield className="h-6 w-6 text-red-600" />,
      stats: ['Zero Trust', 'Encryption', 'Audit Trails']
    },
    {
      title: 'Global Performance',
      description: 'Optimized for worldwide deployment with CDN and edge computing',
      icon: <Globe className="h-6 w-6 text-indigo-600" />,
      stats: ['<100ms Response', 'Global CDN', 'Edge Computing']
    }
  ];

  return (
    <PageWrapper
      title="World-Class Features"
      subtitle="Experience cutting-edge technology with AI-powered assistance, real-time collaboration, predictive analytics, and progressive web app capabilities."
      breadcrumbs={
        <Breadcrumb
          items={[
            { label: "Advanced Features", current: true }
          ]}
        />
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="status-badge-primary">
            <Zap className="h-3 w-3 mr-1" />
            High Performance
          </Badge>
          <Badge variant="secondary" className="status-badge-info">
            <Brain className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      }
    >
      {/* Header Icon */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25">
            <Sparkles className="h-10 w-10" />
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Badge variant="secondary" className="status-badge-success">
            <Users className="h-3 w-3 mr-1" />
            Collaborative
          </Badge>
          <Badge variant="secondary" className="status-badge-warning">
            <Shield className="h-3 w-3 mr-1" />
            Enterprise Security
          </Badge>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {highlights.map((highlight, index) => (
          <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  {highlight.icon}
                </div>
                <CardTitle className="text-lg">{highlight.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{highlight.description}</p>
              <div className="flex flex-wrap gap-2">
                {highlight.stats.map((stat, statIndex) => (
                  <Badge key={statIndex} variant="outline" className="text-xs">
                    {stat}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Card>
        ))}
      </div>

      {/* Interactive Feature Showcase */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Interactive Feature Showcase
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b bg-muted/30">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-transparent">
                {features.map((feature) => (
                  <TabsTrigger
                    key={feature.id}
                    value={feature.id}
                    className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <div className={`p-2 rounded-lg ${feature.color} bg-current/10`}>
                      <div className={feature.color}>
                        {feature.icon}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-sm">{feature.title}</div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {feature.badge}
                      </Badge>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {features.map((feature) => (
              <TabsContent key={feature.id} value={feature.id} className="p-6 m-0">
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      {feature.description}
                    </p>
                  </div>
                  <div className="max-w-4xl mx-auto">
                    {feature.component}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
        <CardContent className="p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience the Future?</h2>
          <p className="text-lg mb-6 opacity-90">
            These world-class features are designed to transform your workflow and boost productivity.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="secondary" size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              <Sparkles className="h-5 w-5 mr-2" />
              Explore All Features
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
              <Brain className="h-5 w-5 mr-2" />
              Try AI Assistant
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Technical Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-600">AI & Machine Learning</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Natural Language Processing</li>
                <li>• Speech Recognition & Synthesis</li>
                <li>• Predictive Analytics</li>
                <li>• Anomaly Detection</li>
                <li>• Contextual Recommendations</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">Real-Time Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• WebSocket Connections</li>
                <li>• Live Cursor Tracking</li>
                <li>• Presence Indicators</li>
                <li>• Collaborative Editing</li>
                <li>• Instant Synchronization</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Progressive Web App</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Service Worker Caching</li>
                <li>• Offline Data Storage</li>
                <li>• Push Notifications</li>
                <li>• Background Sync</li>
                <li>• App Installation</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-600">Performance & Security</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Edge Computing</li>
                <li>• CDN Distribution</li>
                <li>• End-to-End Encryption</li>
                <li>• Zero Trust Architecture</li>
                <li>• Compliance Ready</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
} 