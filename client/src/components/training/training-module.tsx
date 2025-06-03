import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Clock,
  Award,
  BookOpen,
  Video,
  FileText,
  BarChart,
  Calendar,
  ExternalLink,
  ArrowUpRight,
  CheckCircle2,
  Play,
  RefreshCw,
} from "lucide-react";

// Types for the training module
interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  contentType: string;
  source: string;
  duration: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  lastAccessedAt: string;
  imageUrl?: string;
  externalUrl?: string;
  moduleCount?: number;
  quizCount?: number;
  certificateUrl?: string;
  required: boolean;
  category: string;
  level: string;
}

export default function TrainingModule() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for fetching training courses
  const { data: courses, isLoading } = useQuery<TrainingCourse[]>({
    queryKey: ["/api/training/courses"],
    enabled: !!user,
  });

  // Query for training progress
  const { data: progressData } = useQuery<{ completed: number; total: number }>({
    queryKey: ["/api/training/progress"],
    enabled: !!user,
  });

  // Mutation for marking a course as completed
  const completeCourse = useMutation({
    mutationFn: (courseId: string) =>
      apiRequest(`/api/training/courses/${courseId}/complete`, "POST"),
    onSuccess: async (data, courseId) => { // Make onSuccess async and receive courseId
      queryClient.invalidateQueries({ queryKey: ["/api/training/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress"] });
      toast({
        title: "Course Completed",
        description: "Your progress has been updated.",
      });

      // Add gamification call
      try {
        await apiRequest('/api/gamification/actions', "POST", {
          action: 'TRAINING_MODULE_COMPLETED', // Ensure this string matches GamificationAction on backend
          actionDetailsId: courseId, // Pass the ID of the completed course
        });
      } catch (gamificationError) {
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update course progress.",
        variant: "destructive",
      });
    },
  });

  // Mutation for resetting a course
  const resetCourse = useMutation({
    mutationFn: (courseId: string) =>
      apiRequest(`/api/training/courses/${courseId}/reset`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress"] });
      toast({
        title: "Course Reset",
        description: "Your progress has been reset.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset course progress.",
        variant: "destructive",
      });
    },
  });

  // Filter courses based on the active tab
  const filteredCourses = () => {
    if (!courses) return [];

    switch (activeTab) {
      case "in-progress":
        return courses.filter(
          (course) => course.progress > 0 && !course.completed
        );
      case "completed":
        return courses.filter((course) => course.completed);
      case "required":
        return courses.filter((course) => course.required);
      default:
        return courses;
    }
  };

  // Group courses by category
  const coursesByCategory = () => {
    const grouped: Record<string, TrainingCourse[]> = {};
    
    filteredCourses().forEach((course) => {
      if (!grouped[course.category]) {
        grouped[course.category] = [];
      }
      grouped[course.category].push(course);
    });
    
    return grouped;
  };

  // Format duration in minutes to readable format
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    
    return `${hours} hour${hours > 1 ? "s" : ""} ${mins} min`;
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get icon for content type
  const getContentTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "quiz":
        return <BarChart className="h-4 w-4" />;
      case "webinar":
        return <Calendar className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  // Calculate percentage of required courses completed
  const calculateRequiredCompletion = () => {
    if (!courses) return 0;
    
    const requiredCourses = courses.filter((course) => course.required);
    if (requiredCourses.length === 0) return 100;
    
    const completedRequired = requiredCourses.filter(
      (course) => course.completed
    ).length;
    
    return Math.round((completedRequired / requiredCourses.length) * 100);
  };

  // Handle opening a course
  const handleOpenCourse = (course: TrainingCourse) => {
    // For external courses, open in a new tab
    if (course.externalUrl) {
      window.open(course.externalUrl, "_blank");
      return;
    }
    
    // For internal courses, navigate to the course page
    window.location.href = `/training/${course.id}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-full rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Training Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Overall Progress</CardTitle>
            <CardDescription>Your training completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    className="text-gray-200"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  {/* Progress circle */}
                  <circle
                    className="text-primary"
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    strokeDasharray={`${
                      2 * Math.PI * 40
                    }`}
                    strokeDashoffset={`${
                      2 * Math.PI * 40 * (1 - (progressData?.completed || 0) / (progressData?.total || 1))
                    }`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">
                    {Math.round(
                      ((progressData?.completed || 0) / (progressData?.total || 1)) * 100
                    )}%
                  </span>
                  <span className="text-xs text-gray-500">Completed</span>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  {progressData?.completed || 0} of {progressData?.total || 0} courses completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Required Courses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Required Training</CardTitle>
            <CardDescription>Mandatory courses for certification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col p-4">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Completion Status</span>
                  <span className="text-sm font-medium">{calculateRequiredCompletion()}%</span>
                </div>
                <Progress value={calculateRequiredCompletion()} className="h-2" />
              </div>
              
              <div className="text-center mt-4">
                {calculateRequiredCompletion() === 100 ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="font-medium text-green-600">All requirements complete!</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                      <Clock className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="font-medium text-amber-600">Required training incomplete</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Certification Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Certification Status</CardTitle>
            <CardDescription>Your observer qualifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Award className="h-8 w-8 text-primary" />
              </div>
              
              <h3 className="text-xl font-bold mb-1">
                {calculateRequiredCompletion() === 100
                  ? "Certified Observer"
                  : "Training In Progress"}
              </h3>
              
              <p className="text-sm text-gray-600 text-center">
                {calculateRequiredCompletion() === 100
                  ? "You have completed all required training and are certified to observe elections."
                  : "Complete all required training to become a certified election observer."}
              </p>
              
              {calculateRequiredCompletion() === 100 && (
                <Badge className="mt-3" variant="outline">
                  Certification ID: {user?.observerId || "UNKNOWN"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Training Courses */}
      <Card>
        <CardHeader>
          <CardTitle>Training Courses</CardTitle>
          <CardDescription>Browse and complete observer training modules</CardDescription>
          
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-3"
          >
            <TabsList>
              <TabsTrigger value="all">All Courses</TabsTrigger>
              <TabsTrigger value="required">Required</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {Object.entries(coursesByCategory()).map(([category, categoryCourses]) => (
            <div key={category} className="mb-8 last:mb-0">
              <h3 className="text-lg font-medium mb-4">{category}</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {categoryCourses.map((course) => (
                  <div
                    key={course.id}
                    className={`border rounded-lg overflow-hidden ${
                      course.completed
                        ? "bg-green-50 border-green-100"
                        : course.progress > 0
                        ? "bg-blue-50 border-blue-100"
                        : course.required
                        ? "bg-amber-50 border-amber-100"
                        : "bg-white"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{course.title}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {course.description}
                          </p>
                        </div>
                        
                        {course.required && (
                          <Badge className="ml-2 shrink-0" variant="outline">
                            Required
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-3 mt-3">
                        <div className="flex items-center text-xs text-gray-600">
                          {getContentTypeIcon(course.contentType)}
                          <span className="ml-1">{course.contentType}</span>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span className="ml-1">{formatDuration(course.duration)}</span>
                        </div>
                        
                        {course.source !== "internal" && (
                          <div className="flex items-center text-xs text-gray-600">
                            <ExternalLink className="h-4 w-4" />
                            <span className="ml-1">{course.source}</span>
                          </div>
                        )}
                        
                        {course.level && (
                          <div className="flex items-center text-xs text-gray-600">
                            <BarChart className="h-4 w-4" />
                            <span className="ml-1">{course.level}</span>
                          </div>
                        )}
                      </div>
                      
                      {(course.progress > 0 || course.completed) && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium">
                              {course.completed ? "Completed" : "Progress"}
                            </span>
                            <span className="text-xs font-medium">
                              {course.completed ? "100%" : `${course.progress}%`}
                            </span>
                          </div>
                          <Progress
                            value={course.completed ? 100 : course.progress}
                            className="h-1"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4">
                        <div>
                          {course.completed && course.completedAt && (
                            <div className="flex items-center text-xs text-green-600">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Completed on {formatDate(course.completedAt)}
                            </div>
                          )}
                          
                          {course.progress > 0 && !course.completed && (
                            <div className="flex items-center text-xs text-blue-600">
                              <Clock className="h-4 w-4 mr-1" />
                              Last accessed on {formatDate(course.lastAccessedAt)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {/* For in-progress courses, show the complete and reset buttons */}
                          {course.progress > 0 && !course.completed && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetCourse.mutate(course.id)}
                                className="h-8 px-3"
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                <span>Reset</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => completeCourse.mutate(course.id)}
                                className="h-8 px-3"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                <span>Complete</span>
                              </Button>
                            </>
                          )}
                          
                          {/* For completed courses, show the certificate and reset buttons */}
                          {course.completed && (
                            <>
                              {course.certificateUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(course.certificateUrl, "_blank")}
                                  className="h-8 px-3"
                                >
                                  <Award className="h-3.5 w-3.5 mr-1" />
                                  <span>Certificate</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetCourse.mutate(course.id)}
                                className="h-8 px-3"
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                <span>Reset</span>
                              </Button>
                            </>
                          )}
                          
                          {/* For not started courses, show the start button */}
                          {course.progress === 0 && !course.completed && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenCourse(course)}
                              className="h-8 px-3"
                            >
                              <Play className="h-3.5 w-3.5 mr-1" />
                              <span>Start</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {filteredCourses().length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-700">No courses found</h3>
              <p className="text-gray-500 mt-1">
                {activeTab === "in-progress"
                  ? "You don't have any courses in progress"
                  : activeTab === "completed"
                  ? "You haven't completed any courses yet"
                  : activeTab === "required"
                  ? "There are no required courses"
                  : "There are no courses available"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}