import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, FileCheck, FileText, PlayCircle, BookOpen, Video, AlertTriangle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { ResponsiveContainer } from "@/components/ui/responsive-container";

interface TrainingModuleProps {
  userId?: number;
  isAdmin?: boolean;
}

export function TrainingModule({ userId, isAdmin = false }: TrainingModuleProps) {
  const [activeTab, setActiveTab] = useState("available");
  const [currentModule, setCurrentModule] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch available training events/modules
  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['/api/events/upcoming'],
  });

  // Fetch user's training progress/participation
  const { data: participations, isLoading: isParticipationsLoading } = useQuery({
    queryKey: ['/api/users/events', userId],
    enabled: !!userId,
  });

  // Mock training module content
  const trainingContent = {
    1: {
      title: "Observer Fundamentals",
      modules: [
        { id: 1, title: "Introduction to Election Observation", duration: "15 minutes", type: "video" },
        { id: 2, title: "Role and Responsibilities", duration: "20 minutes", type: "reading" },
        { id: 3, title: "Observer Ethics and Code of Conduct", duration: "15 minutes", type: "reading" },
        { id: 4, title: "Standard Observation Procedures", duration: "25 minutes", type: "interactive" },
        { id: 5, title: "Knowledge Assessment", duration: "15 minutes", type: "quiz" }
      ],
      description: "This foundational course covers the basics of election observation, including roles, responsibilities, and ethical standards required for all observers."
    },
    2: {
      title: "Reporting and Documentation",
      modules: [
        { id: 1, title: "Documentation Best Practices", duration: "15 minutes", type: "reading" },
        { id: 2, title: "Incident Reporting", duration: "20 minutes", type: "video" },
        { id: 3, title: "The Mobile App Reporting Flow", duration: "15 minutes", type: "interactive" },
        { id: 4, title: "Evidence Collection", duration: "25 minutes", type: "video" },
        { id: 5, title: "Final Assessment", duration: "15 minutes", type: "quiz" }
      ],
      description: "Learn how to properly document and report on election events, incidents, and concerns using standardized forms and our mobile application."
    },
    3: {
      title: "Election Day Procedures",
      modules: [
        { id: 1, title: "Station Opening Procedures", duration: "15 minutes", type: "video" },
        { id: 2, title: "Voting Process Monitoring", duration: "25 minutes", type: "reading" },
        { id: 3, title: "Closing and Counting Observation", duration: "20 minutes", type: "video" },
        { id: 4, title: "Common Issues and Response", duration: "15 minutes", type: "interactive" },
        { id: 5, title: "Practical Assessment", duration: "20 minutes", type: "quiz" }
      ],
      description: "This specialized training covers all Election Day activities, from polling station opening to vote counting, with emphasis on critical observation points."
    }
  };

  // Simulate loading state
  if (isEventsLoading || isParticipationsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          <Skeleton className="h-64 rounded-md" />
          <Skeleton className="h-64 rounded-md" />
          <Skeleton className="h-64 rounded-md" />
        </div>
      </div>
    );
  }

  // Handle starting a training module
  const handleStartTraining = (eventId: number) => {
    setCurrentModule(eventId);
    toast({
      title: "Training Started",
      description: `You've started the ${trainingContent[eventId as keyof typeof trainingContent]?.title} module.`,
    });
  };

  // Handle completing a training module
  const handleCompleteModule = (moduleId: number) => {
    toast({
      title: "Module Completed",
      description: "Your progress has been saved and updated.",
    });
    
    // In a real implementation, this would call an API to update progress
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/events', userId] });
    }, 500);
  };

  // Get module type icon
  const getModuleTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "reading":
        return <FileText className="h-4 w-4" />;
      case "interactive":
        return <PlayCircle className="h-4 w-4" />;
      case "quiz":
        return <FileCheck className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  // Calculate progress for a given training
  const calculateProgress = (eventId: number) => {
    const userParticipation = participations?.find(p => p.eventId === eventId);
    
    if (!userParticipation) return 0;
    
    // This would be more sophisticated in a real implementation
    if (userParticipation.completionStatus === "completed") return 100;
    if (userParticipation.completionStatus === "in_progress") {
      // Simplistic progress calculation
      return userParticipation.progress || Math.floor(Math.random() * 80) + 10; // Mock between 10-90%
    }
    
    return 0;
  };

  // Get status badge for a training
  const getStatusBadge = (eventId: number) => {
    const userParticipation = participations?.find(p => p.eventId === eventId);
    
    if (!userParticipation) {
      return <Badge variant="outline" className="text-gray-500 bg-gray-100">Not Started</Badge>;
    }
    
    switch (userParticipation.completionStatus) {
      case "completed":
        return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Completed</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">In Progress</Badge>;
      case "overdue":
        return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">Overdue</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-500 bg-gray-100">Not Started</Badge>;
    }
  };

  // Render training details when a module is selected
  if (currentModule !== null) {
    const module = trainingContent[currentModule as keyof typeof trainingContent];
    if (!module) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentModule(null)}
              className="mb-4"
            >
              ← Back to Training List
            </Button>
            <h2 className="text-2xl font-bold">{module.title}</h2>
            <p className="text-gray-500 mt-1">{module.description}</p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">Progress</p>
            <div className="flex items-center mt-1">
              <Progress value={calculateProgress(currentModule)} className="w-32 h-2" />
              <span className="ml-2 text-sm font-medium">{calculateProgress(currentModule)}%</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          {module.modules.map((item, index) => {
            const isCompleted = calculateProgress(currentModule) > ((index / module.modules.length) * 100);
            const isActive = calculateProgress(currentModule) >= ((index / module.modules.length) * 100) && 
                            calculateProgress(currentModule) < (((index + 1) / module.modules.length) * 100);
            
            return (
              <Card key={item.id} className={`${isCompleted ? 'bg-gray-50' : ''} ${isActive ? 'border-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${isCompleted ? 'bg-green-100' : isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          getModuleTypeIcon(item.type)
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {item.duration}
                          <span className="ml-3 flex items-center">
                            {getModuleTypeIcon(item.type)}
                            <span className="ml-1 capitalize">{item.type}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant={isCompleted ? "outline" : isActive ? "default" : "secondary"}
                      disabled={!isActive && !isCompleted}
                      onClick={() => isActive && handleCompleteModule(item.id)}
                    >
                      {isCompleted ? "Review" : isActive ? "Start" : "Locked"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <Separator />
        
        <div className="flex justify-between items-center">
          <div>
            {calculateProgress(currentModule) < 100 ? (
              <div className="flex items-center text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>Complete all modules to receive your certificate</span>
              </div>
            ) : (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>All modules completed!</span>
              </div>
            )}
          </div>
          
          <Button
            disabled={calculateProgress(currentModule) < 100}
            className={calculateProgress(currentModule) === 100 ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {calculateProgress(currentModule) === 100 ? "Download Certificate" : "Complete All Modules to Continue"}
          </Button>
        </div>
      </div>
    );
  }

  // Render available and completed training tabs
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Observer Training</h2>
        <p className="text-gray-500 mt-1">Complete required training modules to become a certified election observer</p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="available">Available Training</TabsTrigger>
          <TabsTrigger value="completed">My Progress</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(trainingContent).map(([id, module]) => (
              <Card key={id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{module.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {module.modules.length} modules • {
                          module.modules.reduce((acc, curr) => {
                            const duration = parseInt(curr.duration.split(" ")[0]);
                            return acc + duration;
                          }, 0)
                        } minutes
                      </CardDescription>
                    </div>
                    {getStatusBadge(parseInt(id))}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {module.description}
                  </p>
                  <div className="mt-4">
                    <Progress value={calculateProgress(parseInt(id))} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      {calculateProgress(parseInt(id))}% complete
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-4 px-6 border-t">
                  <Button
                    onClick={() => handleStartTraining(parseInt(id))}
                    className="w-full"
                    variant={calculateProgress(parseInt(id)) > 0 ? "outline" : "default"}
                  >
                    {calculateProgress(parseInt(id)) > 0 ? "Continue Training" : "Start Training"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Required Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Object.keys(trainingContent).filter(id => 
                    calculateProgress(parseInt(id)) === 100
                  ).length} / {Object.keys(trainingContent).length}
                </div>
                <p className="text-sm text-gray-500 mt-1">Modules completed</p>
                
                <Progress 
                  value={(Object.keys(trainingContent).filter(id => 
                    calculateProgress(parseInt(id)) === 100
                  ).length / Object.keys(trainingContent).length) * 100} 
                  className="mt-4 h-2" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Object.values(trainingContent).reduce((acc, module) => {
                    return acc + module.modules.reduce((moduleAcc, curr) => {
                      const duration = parseInt(curr.duration.split(" ")[0]);
                      return moduleAcc + duration;
                    }, 0);
                  }, 0)} min
                </div>
                <p className="text-sm text-gray-500 mt-1">Total training time</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Training Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center">
                  {(Object.keys(trainingContent).filter(id => 
                    calculateProgress(parseInt(id)) === 100
                  ).length / Object.keys(trainingContent).length) === 1 ? (
                    <>
                      <CheckCircle className="mr-2 h-7 w-7 text-green-600" />
                      <span className="text-green-600">Certified</span>
                    </>
                  ) : (
                    <>
                      <Clock className="mr-2 h-7 w-7 text-amber-600" />
                      <span className="text-amber-600">In Progress</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">Observer training status</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Training History</h3>
            
            <div className="overflow-hidden rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Training Module</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Progress</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {Object.entries(trainingContent).map(([id, module]) => (
                    <tr key={id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-gray-900">{module.title}</div>
                        <div className="text-sm text-gray-500">
                          {module.modules.length} modules • {
                            module.modules.reduce((acc, curr) => {
                              const duration = parseInt(curr.duration.split(" ")[0]);
                              return acc + duration;
                            }, 0)
                          } minutes
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <Progress value={calculateProgress(parseInt(id))} className="w-24 h-2" />
                          <span className="ml-2 text-sm">{calculateProgress(parseInt(id))}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {getStatusBadge(parseInt(id))}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartTraining(parseInt(id))}
                        >
                          {calculateProgress(parseInt(id)) === 0 ? "Start" : 
                            calculateProgress(parseInt(id)) === 100 ? "Review" : "Continue"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}