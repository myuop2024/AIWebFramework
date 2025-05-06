import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { CalendarIcon, BookIcon, VideoIcon, ExternalLinkIcon, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface TrainingContent {
  id: string;
  title: string;
  description: string;
  type: 'course' | 'meeting' | 'webinar' | 'recording' | 'document';
  source: 'moodle' | 'zoom' | 'internal';
  url?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  progress?: number;
  completed?: boolean;
  instructor?: string;
  thumbnail?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface TrainingProgressData {
  totalContent: number;
  completedContent: number;
  progressPercentage: number;
  bySource: Record<string, { total: number; completed: number; percentage: number }>;
}

export const IntegratedTrainingList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const {
    data: trainingContent,
    isLoading: isLoadingContent,
    error: contentError,
  } = useQuery({
    queryKey: ['/api/training/content'],
    queryFn: () => apiRequest('/api/training/content'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const {
    data: upcomingSession,
    isLoading: isLoadingUpcoming,
  } = useQuery({
    queryKey: ['/api/training/upcoming'],
    queryFn: () => apiRequest('/api/training/upcoming'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const {
    data: progressData,
    isLoading: isLoadingProgress,
  } = useQuery<TrainingProgressData>({
    queryKey: ['/api/training/progress'],
    queryFn: () => apiRequest('/api/training/progress'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Function to determine which tab to show the content
  const filterContentByTab = (content: TrainingContent[]) => {
    switch (activeTab) {
      case 'moodle':
        return content.filter(item => item.source === 'moodle');
      case 'zoom':
        return content.filter(item => item.source === 'zoom');
      case 'completed':
        return content.filter(item => item.completed);
      case 'ongoing':
        return content.filter(item => item.progress && item.progress > 0 && item.progress < 100);
      default:
        return content;
    }
  };
  
  // Function to get the source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'moodle':
        return <BookIcon className="h-4 w-4 mr-1" />;
      case 'zoom':
        return <VideoIcon className="h-4 w-4 mr-1" />;
      default:
        return <Clock className="h-4 w-4 mr-1" />;
    }
  };
  
  // Function to render upcoming sessions
  const renderUpcomingSessions = () => {
    if (isLoadingUpcoming) {
      return <div className="p-4 text-center"><Spinner /></div>;
    }
    
    if (!upcomingSession || upcomingSession.length === 0) {
      return (
        <div className="text-center p-4 text-muted-foreground">
          No upcoming training sessions scheduled
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {upcomingSession.slice(0, 3).map((session: TrainingContent) => (
          <Card key={session.id} className="overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-medium">{session.title}</CardTitle>
                <Badge 
                  variant={session.source === 'zoom' ? 'default' : 'outline'}
                >
                  {session.source === 'zoom' ? 'Zoom' : 'Moodle'}
                </Badge>
              </div>
              {session.startDate && (
                <CardDescription className="text-xs flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1 inline" />
                  {format(new Date(session.startDate), 'PPP p')}
                  {session.duration && (
                    <span className="ml-1">
                      ({session.duration} min)
                    </span>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardFooter className="p-4 pt-0 flex justify-end">
              {session.url && (
                <Button size="sm" variant="outline" asChild>
                  <a 
                    href={session.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    Join <ExternalLinkIcon className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  // Function to render training content
  const renderTrainingContent = () => {
    if (isLoadingContent) {
      return <div className="p-8 text-center"><Spinner /></div>;
    }
    
    if (contentError) {
      return (
        <div className="p-8 text-center text-red-500">
          Error loading training content. Please try again later.
        </div>
      );
    }
    
    if (!trainingContent || trainingContent.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          No training content available. Please check back later.
        </div>
      );
    }
    
    const filteredContent = filterContentByTab(trainingContent);
    
    if (filteredContent.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          No content matches the selected filter.
        </div>
      );
    }
    
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredContent.map((content: TrainingContent) => (
          <Card key={content.id} className="overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-medium line-clamp-2">
                  {content.title}
                </CardTitle>
                <Badge 
                  variant={content.source === 'moodle' ? 'outline' : 'default'}
                  className="ml-2 shrink-0"
                >
                  {content.source === 'moodle' ? 'Course' : content.type}
                </Badge>
              </div>
              <CardDescription className="text-xs flex items-center mt-1">
                {getSourceIcon(content.source)}
                {content.source.charAt(0).toUpperCase() + content.source.slice(1)}
                {content.startDate && (
                  <span className="ml-2">
                    <CalendarIcon className="h-3 w-3 mr-1 inline" />
                    {formatDistanceToNow(new Date(content.startDate), { addSuffix: true })}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {content.description || 'No description available'}
              </p>
              
              {typeof content.progress === 'number' && content.progress > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span>{content.progress}%</span>
                  </div>
                  <Progress 
                    value={content.progress} 
                    className="h-2" 
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center">
              {content.completed ? (
                <Badge variant="success" className="mr-auto">Completed</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {content.duration ? `${content.duration} min` : ''}
                </span>
              )}
              
              {content.url && (
                <Button size="sm" variant="outline" asChild>
                  <a 
                    href={content.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    Open <ExternalLinkIcon className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      {!isLoadingProgress && progressData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Training Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2 text-sm">
              <span>Overall Completion</span>
              <span className="font-medium">{progressData.completedContent} of {progressData.totalContent} items</span>
            </div>
            <Progress 
              value={progressData.progressPercentage} 
              className="h-2 mb-4" 
            />
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              {Object.entries(progressData.bySource).map(([source, data]) => (
                data.total > 0 ? (
                  <div key={source} className="bg-muted rounded-md p-3">
                    <div className="flex items-center mb-2">
                      {getSourceIcon(source)}
                      <span className="font-medium capitalize">{source}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {data.completed} of {data.total} completed
                    </div>
                    <Progress value={data.percentage} className="h-1.5" />
                  </div>
                ) : null
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Training Content</h2>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="moodle">Courses</TabsTrigger>
                <TabsTrigger value="zoom">Sessions</TabsTrigger>
                <TabsTrigger value="ongoing">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="mt-0">
              {renderTrainingContent()}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar - Upcoming */}
        <div>
          <h3 className="text-xl font-bold mb-4">Upcoming Sessions</h3>
          {renderUpcomingSessions()}
        </div>
      </div>
    </div>
  );
};

export default IntegratedTrainingList;