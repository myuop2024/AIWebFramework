import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { VideoTrainingModule } from "./video-training-module";
import { ReadingTrainingModule } from "./reading-training-module";
import { QuizTrainingModule } from "./quiz-training-module";
import { TrainingManager } from "../admin/training-manager";

interface TrainingModuleProps {
  userId?: number;
  isAdmin?: boolean;
}

// Specialized module types
interface ModuleItem {
  id: number;
  title: string;
  duration: string;
  type: "video" | "reading" | "interactive" | "quiz";
  completed?: boolean;
  videoId?: string;
  content?: string;
  quizQuestions?: QuizQuestion[];
}

interface ModuleContent {
  title: string;
  modules: ModuleItem[];
  description: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

export function TrainingModule({ userId, isAdmin = false }: TrainingModuleProps) {
  const [activeTab, setActiveTab] = useState("available");
  const [currentModule, setCurrentModule] = useState<number | null>(null);
  const [currentLesson, setCurrentLesson] = useState<ModuleItem | null>(null);
  const { toast } = useToast();
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});

  // Fetch available training events/modules
  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['/api/events/upcoming'],
  });

  // Fetch user's training progress/participation
  const { data: participations, isLoading: isParticipationsLoading } = useQuery({
    queryKey: ['/api/users/events', userId],
    enabled: !!userId,
  });

  // Mutation for completing modules
  const completeModuleMutation = useMutation({
    mutationFn: async (data: { moduleId: number, lessonId: number, userId?: number }) => {
      // In a real implementation, this would call an API endpoint
      return new Promise<void>(resolve => {
        // Simulate API call
        setTimeout(() => {
          // Update local progress data
          setUserProgress(prev => {
            const newProgress = { ...prev };
            if (!newProgress[data.moduleId]) {
              newProgress[data.moduleId] = { completedLessons: [] };
            }
            if (!newProgress[data.moduleId].completedLessons.includes(data.lessonId)) {
              newProgress[data.moduleId].completedLessons = [
                ...newProgress[data.moduleId].completedLessons,
                data.lessonId
              ];
            }
            return newProgress;
          });
          resolve();
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/events', userId] });
    },
  });

  // Mock training module content with enhanced data for specialized modules
  const trainingContent: Record<number, ModuleContent> = {
    1: {
      title: "Observer Fundamentals",
      modules: [
        { 
          id: 1, 
          title: "Introduction to Election Observation", 
          duration: "15 minutes", 
          type: "video",
          videoId: "dQw4w9WgXcQ" // Example YouTube video ID
        },
        { 
          id: 2, 
          title: "Role and Responsibilities", 
          duration: "20 minutes", 
          type: "reading",
          content: `
            <h2>Role and Responsibilities of Election Observers</h2>
            <p>Election observers play a crucial role in ensuring the integrity and transparency of the electoral process. This module outlines the key responsibilities and ethical guidelines for observers.</p>
            
            <h3>Primary Responsibilities</h3>
            <ul>
              <li>Monitor the opening, voting, closing, and counting procedures at polling stations</li>
              <li>Document any irregularities or incidents that may affect the integrity of the election</li>
              <li>Report observations through proper channels using standardized forms</li>
              <li>Maintain impartiality and avoid interfering with the electoral process</li>
              <li>Collaborate with other observers and election officials as appropriate</li>
            </ul>
            
            <h3>Ethical Guidelines</h3>
            <p>All observers must adhere to strict ethical guidelines that include:</p>
            <ol>
              <li>Impartiality: Observers must remain politically neutral and not display bias toward any candidate or party</li>
              <li>Objectivity: Observations must be factual, accurate, and evidence-based</li>
              <li>Professionalism: Observers must conduct themselves with integrity and respect for local customs</li>
              <li>Transparency: Methodology and findings should be transparent and consistent</li>
              <li>Non-interference: Observers must not interfere with the electoral process or instruct officials</li>
            </ol>
            
            <h3>Reporting Chain</h3>
            <p>Effective observation requires a clear reporting structure:</p>
            <ol>
              <li>Individual observers document findings using standardized forms</li>
              <li>Team leaders compile and verify reports from team members</li>
              <li>Regional coordinators analyze patterns and escalate significant issues</li>
              <li>Mission leadership produces preliminary and final reports</li>
            </ol>
          `
        },
        { 
          id: 3, 
          title: "Observer Ethics and Code of Conduct", 
          duration: "15 minutes", 
          type: "reading",
          content: `
            <h2>Observer Ethics and Code of Conduct</h2>
            <p>Maintaining ethical standards is essential for the credibility of election observation missions. This module outlines the code of conduct all observers must follow.</p>
            
            <h3>Core Ethical Principles</h3>
            <ul>
              <li><strong>Integrity:</strong> Act honestly and maintain high moral principles at all times</li>
              <li><strong>Impartiality:</strong> Remain politically neutral and avoid activities that could create a perception of bias</li>
              <li><strong>Accuracy:</strong> Ensure all reports and statements are factual and evidence-based</li>
              <li><strong>Transparency:</strong> Be open about methodologies and findings</li>
              <li><strong>Confidentiality:</strong> Protect sensitive information and the privacy of individuals</li>
            </ul>
            
            <h3>Code of Conduct</h3>
            <ol>
              <li>Observers must respect the sovereignty of the host country and its electoral laws</li>
              <li>Observers must not obstruct or interfere with the electoral process</li>
              <li>Observers must avoid making public comments or statements that could undermine the credibility of the mission</li>
              <li>Observers must maintain political neutrality at all times, including on social media</li>
              <li>Observers must not accept gifts, favors, or special treatment from political entities or candidates</li>
              <li>Observers must work collaboratively with other members of the mission</li>
              <li>Observers must report any conflicts of interest or attempts to influence their work</li>
            </ol>
            
            <h3>Consequences of Violations</h3>
            <p>Violations of the code of conduct may result in:</p>
            <ul>
              <li>Verbal or written warnings</li>
              <li>Removal from specific observation duties</li>
              <li>Dismissal from the observation mission</li>
              <li>Prohibition from participating in future observation activities</li>
            </ul>
          `
        },
        { 
          id: 4, 
          title: "Standard Observation Procedures", 
          duration: "25 minutes", 
          type: "interactive",
          content: "This interactive module simulates various election day scenarios and guides observers through proper response procedures."
        },
        { 
          id: 5, 
          title: "Knowledge Assessment", 
          duration: "15 minutes", 
          type: "quiz",
          quizQuestions: [
            {
              id: 1,
              question: "What is the primary role of an election observer?",
              options: [
                "To supervise election officials and direct their work",
                "To monitor the electoral process and report observations without interfering",
                "To verify voter identities and prevent fraud",
                "To count votes and validate election results"
              ],
              correctOption: 1,
              explanation: "Election observers monitor the process and report their findings, but they must not interfere with the election procedures or direct officials."
            },
            {
              id: 2,
              question: "Which of the following actions would violate the observer code of conduct?",
              options: [
                "Documenting observed irregularities on official forms",
                "Speaking with polling station officials to understand procedures",
                "Wearing a political party's logo while observing",
                "Moving between different polling stations during election day"
              ],
              correctOption: 2,
              explanation: "Observers must maintain political neutrality. Wearing party logos or symbols indicates bias and compromises the observer's impartiality."
            },
            {
              id: 3,
              question: "When should an observer submit their observation reports?",
              options: [
                "Only if irregularities are observed",
                "According to the predetermined reporting schedule, regardless of findings",
                "After consulting with political party representatives",
                "Only at the end of election day"
              ],
              correctOption: 1,
              explanation: "Observers must follow the predetermined reporting schedule and submit reports regardless of whether irregularities were observed or not."
            }
          ]
        }
      ],
      description: "This foundational course covers the basics of election observation, including roles, responsibilities, and ethical standards required for all observers."
    },
    2: {
      title: "Reporting and Documentation",
      modules: [
        { 
          id: 1, 
          title: "Documentation Best Practices", 
          duration: "15 minutes", 
          type: "reading",
          content: `
            <h2>Documentation Best Practices for Election Observers</h2>
            <p>Accurate and thorough documentation is essential for effective election observation. This module covers best practices for documenting observations during the electoral process.</p>
            
            <h3>Documentation Principles</h3>
            <ul>
              <li><strong>Accuracy:</strong> Record only what you directly observe</li>
              <li><strong>Objectivity:</strong> Document facts without interpretation or bias</li>
              <li><strong>Precision:</strong> Include specific details (times, locations, quantities)</li>
              <li><strong>Comprehensiveness:</strong> Document both positive aspects and irregularities</li>
              <li><strong>Timeliness:</strong> Record observations as soon as possible</li>
            </ul>
            
            <h3>Documentation Tools</h3>
            <p>Observers should utilize various tools for documentation:</p>
            <ol>
              <li>Standardized observation forms</li>
              <li>Checklists for specific processes</li>
              <li>Digital tools and mobile applications</li>
              <li>Notebooks for supplementary notes</li>
              <li>Photography (where permitted by law and mission guidelines)</li>
            </ol>
            
            <h3>What to Document</h3>
            <p>Key elements that should always be documented include:</p>
            <ul>
              <li>Time of arrival and departure at observation sites</li>
              <li>Names and positions of officials spoken with</li>
              <li>Number of voters, staff, party agents, and other observers present</li>
              <li>Opening and closing procedures</li>
              <li>Voting process observations</li>
              <li>Counting and tabulation observations</li>
              <li>Any irregularities or incidents</li>
              <li>General atmosphere and conduct of the process</li>
            </ul>
            
            <h3>Documentation Examples</h3>
            <p><strong>Poor example:</strong> "The voting was problematic."</p>
            <p><strong>Good example:</strong> "At Polling Station #123, between 10:15-10:45 AM, approximately 15 voters were observed being turned away without voting. The polling station chairperson, Mr. Smith, explained this was due to their names not appearing on the voter list despite them having valid ID cards."</p>
          `
        },
        { 
          id: 2, 
          title: "Incident Reporting", 
          duration: "20 minutes", 
          type: "video",
          videoId: "dQw4w9WgXcQ"
        },
        { 
          id: 3, 
          title: "The Mobile App Reporting Flow", 
          duration: "15 minutes", 
          type: "interactive"
        },
        { 
          id: 4, 
          title: "Evidence Collection", 
          duration: "25 minutes", 
          type: "video",
          videoId: "dQw4w9WgXcQ"
        },
        { 
          id: 5, 
          title: "Final Assessment", 
          duration: "15 minutes", 
          type: "quiz",
          quizQuestions: [
            {
              id: 1,
              question: "Which of the following is the best approach to documenting an incident?",
              options: [
                "Using general descriptions to cover multiple incidents at once",
                "Recording your analysis of why the incident occurred",
                "Documenting specific details including time, location, and individuals involved",
                "Focusing only on the most serious violations"
              ],
              correctOption: 2,
              explanation: "Specific details are essential for proper incident documentation. Time, location, and factual descriptions provide the necessary context for analysis."
            },
            {
              id: 2,
              question: "When should you complete and submit incident reports?",
              options: [
                "At the end of election day to include all incidents",
                "As soon as possible after observing an incident",
                "Only when instructed by team leaders",
                "After discussing the incident with polling officials"
              ],
              correctOption: 1,
              explanation: "Incidents should be reported as soon as possible while details are fresh in your memory, not at the end of the day."
            }
          ]
        }
      ],
      description: "Learn how to properly document and report on election events, incidents, and concerns using standardized forms and our mobile application."
    },
    3: {
      title: "Election Day Procedures",
      modules: [
        { 
          id: 1, 
          title: "Station Opening Procedures", 
          duration: "15 minutes", 
          type: "video",
          videoId: "dQw4w9WgXcQ"
        },
        { 
          id: 2, 
          title: "Voting Process Monitoring", 
          duration: "25 minutes", 
          type: "reading",
          content: `
            <h2>Voting Process Monitoring</h2>
            <p>Effective monitoring of the voting process is critical to ensuring the integrity of elections. This module outlines key aspects to observe during the voting phase.</p>
            
            <h3>Key Elements to Monitor</h3>
            <ul>
              <li><strong>Voter Identification:</strong> How voters are identified and verified</li>
              <li><strong>Ballot Issuance:</strong> Procedures for distributing ballots to eligible voters</li>
              <li><strong>Voter Privacy:</strong> Arrangements for secret voting</li>
              <li><strong>Ballot Box Security:</strong> Measures to secure ballot boxes throughout the day</li>
              <li><strong>Special Voting Procedures:</strong> Accommodations for voters with disabilities, elderly, etc.</li>
              <li><strong>Queue Management:</strong> Organization of voter lines and waiting times</li>
            </ul>
            
            <h3>Common Irregularities</h3>
            <p>Be vigilant for these potential issues:</p>
            <ol>
              <li>Multiple voting or voter impersonation</li>
              <li>Family voting or proxy voting</li>
              <li>Intimidation of voters inside or outside polling stations</li>
              <li>Presence of unauthorized persons</li>
              <li>Campaign activities within or near polling stations</li>
              <li>Compromises to ballot secrecy</li>
              <li>Failure to check voter identification properly</li>
              <li>Ballot box stuffing or pre-marked ballots</li>
            </ol>
            
            <h3>Observation Methodology</h3>
            <p>Effective observation requires a systematic approach:</p>
            <ul>
              <li>Maintain a discreet presence that doesn't interfere with the process</li>
              <li>Rotate observation positions to view different aspects of the voting process</li>
              <li>Take regular notes on standard procedures and any deviations</li>
              <li>Record voter turnout trends throughout the day</li>
              <li>Track processing times and queue lengths</li>
              <li>Observe interactions between officials, voters, and party agents</li>
            </ul>
            
            <h3>Questions to Consider</h3>
            <p>While observing, keep these questions in mind:</p>
            <ol>
              <li>Are all eligible voters able to cast their ballots?</li>
              <li>Are voting procedures being applied consistently?</li>
              <li>Is the secrecy of the vote being protected?</li>
              <li>Are vulnerable or marginalized voters able to participate equally?</li>
              <li>Are officials handling complaints and questions appropriately?</li>
              <li>Is there evidence of organized manipulation or fraud?</li>
            </ol>
          `
        },
        { 
          id: 3, 
          title: "Closing and Counting Observation", 
          duration: "20 minutes", 
          type: "video",
          videoId: "dQw4w9WgXcQ"
        },
        { 
          id: 4, 
          title: "Common Issues and Response", 
          duration: "15 minutes", 
          type: "interactive"
        },
        { 
          id: 5, 
          title: "Practical Assessment", 
          duration: "20 minutes", 
          type: "quiz",
          quizQuestions: [
            {
              id: 1,
              question: "What should an observer do if they notice ballot box stuffing?",
              options: [
                "Immediately intervene to stop the fraudulent activity",
                "Discreetly document the incident with specific details and report according to mission protocols",
                "Confront the polling station chairperson in front of other officials",
                "Remove the stuffed ballots from the ballot box"
              ],
              correctOption: 1,
              explanation: "Observers should never interfere with the electoral process. The correct action is to document the incident in detail and report it through proper channels."
            },
            {
              id: 2,
              question: "Which of the following is a sign of possible intimidation at a polling station?",
              options: [
                "Officials checking voter identification",
                "Party agents observing the voting process from a designated area",
                "Security personnel stationed outside the polling station entrance",
                "Groups of people recording who enters the polling station and approaching voters"
              ],
              correctOption: 3,
              explanation: "Recording who enters polling stations and approaching voters can constitute voter intimidation. Security personnel stationed outside is normal, while checking ID and party agent presence are standard procedures."
            }
          ]
        }
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

  // If user is admin, show training management interface
  if (isAdmin) {
    return <TrainingManager userId={userId} />;
  }

  // Handle starting a training module
  const handleStartTraining = (eventId: number) => {
    setCurrentModule(eventId);
    setCurrentLesson(null);
    toast({
      title: "Training Started",
      description: `You've started the ${trainingContent[eventId]?.title} module.`,
    });
  };

  // Handle opening a specific lesson
  const handleStartLesson = (lesson: ModuleItem) => {
    setCurrentLesson(lesson);
  };

  // Handle completing a lesson
  const handleCompleteLesson = (lessonId: number) => {
    if (!currentModule || !userId) return;
    
    completeModuleMutation.mutate({
      moduleId: currentModule,
      lessonId: lessonId,
      userId: userId
    });
    
    toast({
      title: "Lesson Completed",
      description: "Your progress has been saved and updated.",
    });
    
    // Go back to module overview
    setCurrentLesson(null);
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
    // Use userProgress object if available
    if (userProgress[eventId]) {
      const moduleContent = trainingContent[eventId];
      if (!moduleContent) return 0;
      
      const totalLessons = moduleContent.modules.length;
      const completedLessons = userProgress[eventId].completedLessons?.length || 0;
      
      return Math.round((completedLessons / totalLessons) * 100);
    }
    
    // Fall back to participations data from API
    const userParticipation = participations?.find((p: any) => p.eventId === eventId);
    
    if (!userParticipation) return 0;
    
    // This would be more sophisticated in a real implementation
    if (userParticipation.completionStatus === "completed") return 100;
    if (userParticipation.completionStatus === "in_progress") {
      // Simplistic progress calculation
      return userParticipation.progress || Math.floor(Math.random() * 80) + 10; // Mock between 10-90%
    }
    
    return 0;
  };

  // Check if a lesson is completed
  const isLessonCompleted = (moduleId: number, lessonId: number) => {
    return userProgress[moduleId]?.completedLessons?.includes(lessonId) || false;
  };

  // Get status badge for a training
  const getStatusBadge = (eventId: number) => {
    // Generate status based on progress
    const progress = calculateProgress(eventId);
    
    if (progress === 0) {
      return <Badge variant="outline" className="text-gray-500 bg-gray-100">Not Started</Badge>;
    } else if (progress === 100) {
      return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Completed</Badge>;
    } else if (progress > 0) {
      return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">In Progress</Badge>;
    }
    
    // Fall back to participations data from API
    const userParticipation = participations?.find((p: any) => p.eventId === eventId);
    
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

  // Render specific lesson module based on type
  if (currentLesson !== null) {
    switch (currentLesson.type) {
      case "video":
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentLesson(null)}
              className="mb-2"
            >
              ← Back to Module
            </Button>
            
            <VideoTrainingModule
              videoId={currentLesson.videoId || "dQw4w9WgXcQ"}
              title={currentLesson.title}
              description={`Part of ${trainingContent[currentModule!]?.title} module`}
              duration={parseInt(currentLesson.duration) * 60} // Convert to seconds
              onComplete={() => handleCompleteLesson(currentLesson.id)}
              isCompleted={isLessonCompleted(currentModule!, currentLesson.id)}
            />
          </div>
        );
        
      case "reading":
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentLesson(null)}
              className="mb-2"
            >
              ← Back to Module
            </Button>
            
            <ReadingTrainingModule
              title={currentLesson.title}
              content={currentLesson.content || `<p>Content for "${currentLesson.title}" will be available soon.</p>`}
              estimatedReadingTime={parseInt(currentLesson.duration)}
              onComplete={() => handleCompleteLesson(currentLesson.id)}
              isCompleted={isLessonCompleted(currentModule!, currentLesson.id)}
            />
          </div>
        );
        
      case "quiz":
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentLesson(null)}
              className="mb-2"
            >
              ← Back to Module
            </Button>
            
            <QuizTrainingModule
              title={currentLesson.title}
              description={`Part of ${trainingContent[currentModule!]?.title} module`}
              questions={currentLesson.quizQuestions || [
                {
                  id: 1,
                  question: "Sample question",
                  options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                  correctOption: 0
                }
              ]}
              passingScore={70}
              onComplete={(score) => handleCompleteLesson(currentLesson.id)}
              isCompleted={isLessonCompleted(currentModule!, currentLesson.id)}
              finalScore={isLessonCompleted(currentModule!, currentLesson.id) ? 85 : undefined}
            />
          </div>
        );
        
      case "interactive":
        // Interactive modules would have a custom implementation
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentLesson(null)}
              className="mb-2"
            >
              ← Back to Module
            </Button>
            
            <Card className="mb-6">
              <CardContent className="p-6 text-center">
                <div className="mb-6">
                  <PlayCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">{currentLesson.title}</h3>
                  <p className="text-gray-600">
                    This interactive module simulates real-world scenarios you may encounter during election observation.
                  </p>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 mx-auto max-w-md">
                  <p className="text-amber-800">
                    This interactive module requires observer tracking. Please ensure you keep this window visible while completing the module.
                  </p>
                </div>
                
                <Button
                  onClick={() => handleCompleteLesson(currentLesson.id)}
                  disabled={isLessonCompleted(currentModule!, currentLesson.id)}
                >
                  {isLessonCompleted(currentModule!, currentLesson.id) ? "Module Completed" : "Start Interactive Training"}
                </Button>
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  }

  // Render training details when a module is selected but no specific lesson
  if (currentModule !== null) {
    const module = trainingContent[currentModule];
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
            const completed = isLessonCompleted(currentModule, item.id);
            const progress = calculateProgress(currentModule);
            // Calculate if this module should be active based on progress
            // A module is active if the previous modules are completed or if this is the first module
            const isActive = index === 0 || 
                           (index > 0 && module.modules.slice(0, index).every(m => 
                             isLessonCompleted(currentModule, m.id)));
            
            return (
              <Card key={item.id} className={`${completed ? 'bg-gray-50' : ''} ${isActive && !completed ? 'border-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${completed ? 'bg-green-100' : isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {completed ? (
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
                      variant={completed ? "outline" : isActive ? "default" : "secondary"}
                      disabled={!isActive && !completed}
                      onClick={() => handleStartLesson(item)}
                    >
                      {completed ? "Review" : isActive ? "Start" : "Locked"}
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