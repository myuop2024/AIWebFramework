import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, BookOpen, Video, Calendar, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface MoodleCourse {
  id: number;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  progress?: number;
  status: 'not-started' | 'in-progress' | 'completed';
  category: string;
  duration: string;
}

interface ZoomSession {
  id: number;
  title: string;
  description: string;
  url: string;
  startTime: string;
  endTime: string;
  host: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'recorded';
  recordingUrl?: string;
}

export function IntegratedTrainingList() {
  const [activeTab, setActiveTab] = React.useState('moodle');

  // Fetch Moodle courses
  const { data: moodleCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/training/moodle/courses'],
    queryFn: async () => {
      // This would call the API in a real implementation
      // For now, we'll return mock data
      return new Promise<MoodleCourse[]>((resolve) => {
        setTimeout(() => {
          resolve([
            {
              id: 1,
              title: 'Election Laws and Regulations',
              description: 'A comprehensive look at the legal framework governing elections in our target jurisdictions.',
              url: '#',
              imageUrl: `${process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL}?text=Election+Laws`,
              progress: 65,
              status: 'in-progress',
              category: 'Legal',
              duration: '4 hours'
            },
            {
              id: 2,
              title: 'Observer Field Operations',
              description: 'Practical training for conducting observation activities in the field, including safety protocols.',
              url: '#',
              imageUrl: `${process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL}?text=Field+Ops`,
              progress: 100,
              status: 'completed',
              category: 'Operations',
              duration: '6 hours'
            },
            {
              id: 3,
              title: 'Data Collection Methodology',
              description: 'Learn standardized methods for collecting and recording data during election observation.',
              url: '#',
              imageUrl: `${process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL}?text=Data+Methods`,
              progress: 0,
              status: 'not-started',
              category: 'Methodology',
              duration: '3.5 hours'
            }
          ]);
        }, 800);
      });
    }
  });

  // Fetch Zoom sessions
  const { data: zoomSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/training/zoom/sessions'],
    queryFn: async () => {
      // This would call the API in a real implementation
      // For now, we'll return mock data
      return new Promise<ZoomSession[]>((resolve) => {
        setTimeout(() => {
          resolve([
            {
              id: 1,
              title: 'Live Q&A: Election Day Procedures',
              description: 'Interactive session covering common questions about Election Day operations and reporting.',
              url: '#',
              startTime: '2023-10-15T14:00:00Z',
              endTime: '2023-10-15T15:30:00Z',
              host: 'Maria Johnson, Head of Training',
              status: 'upcoming'
            },
            {
              id: 2,
              title: 'Crisis Response Workshop',
              description: 'Training on how to respond to various crisis situations that may arise during observation.',
              url: '#',
              startTime: '2023-10-10T13:00:00Z',
              endTime: '2023-10-10T15:00:00Z',
              host: 'Robert Chen, Security Coordinator',
              status: 'completed',
              recordingUrl: '#'
            },
            {
              id: 3,
              title: 'Report Writing Best Practices',
              description: 'Detailed guidance on writing effective and accurate observation reports.',
              url: '#',
              startTime: '2023-10-18T11:00:00Z',
              endTime: '2023-10-18T12:30:00Z',
              host: 'Sarah Okonjo, Senior Observer',
              status: 'upcoming'
            }
          ]);
        }, 800);
      });
    }
  });

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };

  // Get status badge for Moodle courses
  const getCourseBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Not Started</Badge>;
    }
  };

  // Get status badge for Zoom sessions
  const getSessionBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Live Now</Badge>;
      case 'recorded':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Recording Available</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Upcoming</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="moodle">
            <BookOpen className="h-4 w-4 mr-2" />
            Moodle Courses
          </TabsTrigger>
          <TabsTrigger value="zoom">
            <Video className="h-4 w-4 mr-2" />
            Zoom Sessions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="moodle" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Available Courses</h3>
            <Button variant="outline" size="sm">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              View All in Moodle
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          {coursesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moodleCourses?.map((course) => (
                <Card key={course.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted">
                    {course.imageUrl && (
                      <img 
                        src={course.imageUrl} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      {getCourseBadge(course.status)}
                    </div>
                    <CardDescription className="flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {course.duration}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                    {course.progress !== undefined && course.progress > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 flex justify-between">
                          <span>Progress</span>
                          <span>{course.progress}%</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <a href={course.url} target="_blank" rel="noopener noreferrer">
                        {course.status === 'completed' ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Review Course
                          </>
                        ) : course.status === 'in-progress' ? (
                          <>
                            <ArrowUpRight className="h-4 w-4 mr-2" />
                            Continue Course
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="h-4 w-4 mr-2" />
                            Start Course
                          </>
                        )}
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="zoom" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Training Sessions</h3>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-1" />
              View Full Calendar
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {zoomSessions?.map((session) => (
                <Card key={session.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      {getSessionBadge(session.status)}
                    </div>
                    <CardDescription className="mt-1">
                      {formatDate(session.startTime)} - {formatDate(session.endTime).split(', ')[1]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground">
                      {session.description}
                    </p>
                    <p className="text-sm font-medium mt-3">
                      Host: {session.host}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    {session.status === 'completed' && session.recordingUrl ? (
                      <Button variant="outline" className="w-1/2 mr-2" asChild>
                        <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-2" />
                          Watch Recording
                        </a>
                      </Button>
                    ) : null}
                    
                    <Button 
                      className={session.status === 'completed' && session.recordingUrl ? "w-1/2" : "w-full"}
                      variant={session.status === 'upcoming' ? 'default' : 'outline'}
                      disabled={session.status === 'completed' && !session.recordingUrl}
                      asChild
                    >
                      <a href={session.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {session.status === 'upcoming' ? 'Join Session' : 
                         session.status === 'in-progress' ? 'Join Now' : 
                         'Session Details'}
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}