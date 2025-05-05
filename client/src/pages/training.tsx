import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Play, 
  CheckCircle,
  Award,
  Clock,
  Calendar,
  Download,
  FileText,
  Video,
  ExternalLink
} from "lucide-react";

export default function Training() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [progress, setProgress] = useState(75); // Sample progress value

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Fetch training data
  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['/api/events'],
  });

  // Filter training events
  const trainingEvents = events?.filter((event: any) => 
    event.eventType.toLowerCase() === 'training'
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || isEventsLoading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-6">
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-80 w-full rounded-md" />
        </div>
      </MainLayout>
    );
  }

  // Mock training modules data
  const trainingModules = [
    {
      id: 1,
      title: "Observer Orientation",
      description: "Introduction to the role and responsibilities of election observers",
      duration: "45 min",
      status: "completed",
      progress: 100,
      lessons: [
        { id: 101, title: "Introduction to Election Observation", status: "completed", duration: "15 min" },
        { id: 102, title: "Observer Code of Conduct", status: "completed", duration: "15 min" },
        { id: 103, title: "Legal Framework", status: "completed", duration: "15 min" }
      ]
    },
    {
      id: 2,
      title: "Election Procedures",
      description: "Detailed review of election day procedures and protocols",
      duration: "60 min",
      status: "completed",
      progress: 100,
      lessons: [
        { id: 201, title: "Opening Procedures", status: "completed", duration: "20 min" },
        { id: 202, title: "Voting Procedures", status: "completed", duration: "20 min" },
        { id: 203, title: "Closing and Counting", status: "completed", duration: "20 min" }
      ]
    },
    {
      id: 3,
      title: "Reporting and Documentation",
      description: "Learn how to document observations and submit reports",
      duration: "30 min",
      status: "in-progress",
      progress: 33,
      lessons: [
        { id: 301, title: "Observation Forms", status: "completed", duration: "10 min" },
        { id: 302, title: "Incident Reporting", status: "in-progress", duration: "10 min" },
        { id: 303, title: "Final Report Writing", status: "not-started", duration: "10 min" }
      ]
    }
  ];

  // Calculate overall progress
  const overallProgress = Math.round(
    trainingModules.reduce((sum, module) => sum + module.progress, 0) / trainingModules.length
  );

  return (
    <MainLayout>
      {/* Training Overview Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <BookOpen className="text-primary mr-2 h-5 w-5" />
                <h2 className="text-xl font-bold">Observer Training</h2>
              </div>
              
              <div className="flex items-center mb-4">
                <Badge className={`${
                  overallProgress === 100 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {overallProgress === 100 ? "Completed" : "In Progress"}
                </Badge>
                {overallProgress === 100 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800">Certified Observer</Badge>
                )}
              </div>
              
              <p className="text-gray-600 mb-4">
                Complete all required training modules to become a certified election observer. 
                Track your progress below and access the learning materials at your own pace.
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">{overallProgress}% Complete</span>
                </div>
                <Progress value={overallProgress} />
              </div>
            </div>
            
            <div className="md:w-64 p-4 border rounded-md bg-gray-50 flex flex-col items-center justify-center text-center">
              {overallProgress === 100 ? (
                <>
                  <Award className="h-12 w-12 text-primary mb-2" />
                  <h3 className="font-bold text-lg">Certification Complete</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    You have successfully completed all required training modules.
                  </p>
                  <Button className="w-full" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Certificate
                  </Button>
                </>
              ) : (
                <>
                  <Clock className="h-12 w-12 text-primary mb-2" />
                  <h3 className="font-bold text-lg">Continue Training</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Complete the remaining {100 - overallProgress}% of your training to get certified.
                  </p>
                  <Button className="w-full" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Resume Training
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Training Content */}
      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="modules">Training Modules</TabsTrigger>
          <TabsTrigger value="schedule">Upcoming Sessions</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
        
        <TabsContent value="modules">
          <div className="space-y-6">
            {trainingModules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        module.status === 'completed' 
                          ? 'bg-green-100' 
                          : module.status === 'in-progress' 
                            ? 'bg-yellow-100' 
                            : 'bg-gray-100'
                      }`}>
                        {module.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <BookOpen className={`h-5 w-5 ${
                            module.status === 'in-progress' ? 'text-yellow-600' : 'text-gray-500'
                          }`} />
                        )}
                      </div>
                      <div className="ml-4">
                        <CardTitle>{module.title}</CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${
                        module.status === 'completed' 
                          ? "bg-green-100 text-green-800" 
                          : module.status === 'in-progress' 
                            ? "bg-yellow-100 text-yellow-800" 
                            : "bg-gray-100 text-gray-800"
                      }`}>
                        {module.status === 'completed' 
                          ? "Completed" 
                          : module.status === 'in-progress' 
                            ? "In Progress" 
                            : "Not Started"}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">Duration: {module.duration}</p>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{module.progress}%</span>
                    </div>
                    <Progress value={module.progress} className="h-2" />
                  </div>
                </CardHeader>
                
                <CardContent>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Lessons</h4>
                  <div className="space-y-3">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center">
                          {lesson.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                          ) : lesson.status === 'in-progress' ? (
                            <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-gray-400 mr-3" />
                          )}
                          <span className="font-medium">{lesson.title}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-3">{lesson.duration}</span>
                          <Button 
                            variant={lesson.status === 'completed' ? "outline" : "default"} 
                            size="sm"
                          >
                            {lesson.status === 'completed' ? 'Review' : 'Start'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between border-t pt-6">
                  {module.status === 'completed' ? (
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View Certificate
                    </Button>
                  ) : (
                    <Button disabled={module.status !== 'in-progress'}>
                      {module.status === 'not-started' ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Module
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Continue
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Training Sessions</CardTitle>
              <CardDescription>
                Join live training sessions conducted by experienced trainers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!trainingEvents || trainingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No Upcoming Sessions</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    There are no scheduled training sessions at this time. 
                    Check back soon for updates or continue with self-paced modules.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trainingEvents.map((event: any) => (
                    <div key={event.id} className="flex flex-col md:flex-row p-4 border rounded-md">
                      <div className="flex-shrink-0 flex flex-col items-center justify-center md:w-24 mb-4 md:mb-0">
                        <div className="text-3xl font-bold text-primary">
                          {new Date(event.startTime).getDate()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(event.startTime).toLocaleString('default', { month: 'short' })}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{event.title}</h3>
                        <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                        
                        <div className="flex flex-wrap items-center text-sm text-gray-500 mt-2">
                          <div className="flex items-center mr-4">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>
                              {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 md:mt-0 md:ml-4 flex flex-col items-center justify-center">
                        <Button>
                          {event.location.toLowerCase().includes('zoom') ? (
                            <>
                              <Video className="h-4 w-4 mr-2" />
                              Join Session
                            </>
                          ) : (
                            <>
                              <Calendar className="h-4 w-4 mr-2" />
                              Register
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Training Resources</CardTitle>
              <CardDescription>
                Additional materials to support your training and preparation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Observer Handbook</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Comprehensive guide for election observers with detailed procedures and protocols
                      </p>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Training Videos</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Video tutorials covering all aspects of election observation
                      </p>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Library
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Observation Forms</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Templates and examples of all forms used during observation
                      </p>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download Forms
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Election Laws & Regulations</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Reference materials on electoral legal framework
                      </p>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Resources
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
