import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, AlertTriangle, Check, BookOpen } from "lucide-react";

interface ReadingTrainingModuleProps {
  title: string;
  content: string;
  estimatedReadingTime: number; // in minutes
  onComplete: () => void;
  isCompleted?: boolean;
}

export function ReadingTrainingModule({
  title,
  content,
  estimatedReadingTime,
  onComplete,
  isCompleted = false
}: ReadingTrainingModuleProps) {
  const [progress, setProgress] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [readingCompleted, setReadingCompleted] = useState(false);
  const [quizShown, setQuizShown] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Required reading time in seconds (at least 70% of estimated time)
  const requiredReadingTime = Math.floor(estimatedReadingTime * 60 * 0.7);
  
  // Set up the timer to track reading time
  useEffect(() => {
    if (isCompleted) return;
    
    if (isVisible) {
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => {
          const newTime = prev + 1;
          // Calculate progress based on time and scroll position
          const timeProgress = Math.min((newTime / requiredReadingTime) * 100, 100);
          const combinedProgress = Math.floor((timeProgress + scrollPercent) / 2);
          setProgress(combinedProgress);
          
          // Check if reading requirements are met
          if (timeProgress >= 100 && scrollPercent >= 100 && !readingCompleted) {
            setReadingCompleted(true);
            toast({
              title: "Ready for comprehension check",
              description: "You've spent enough time on this module. Scroll to the bottom to continue.",
            });
          }
          
          return newTime;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isVisible, requiredReadingTime, scrollPercent, readingCompleted, isCompleted, toast]);
  
  // Set up scroll tracking
  useEffect(() => {
    if (isCompleted) return;
    
    const handleScroll = () => {
      if (!contentRef.current || !containerRef.current) return;
      
      const contentHeight = contentRef.current.scrollHeight;
      const containerHeight = containerRef.current.clientHeight;
      const scrollPosition = contentRef.current.scrollTop;
      const maxScroll = contentHeight - containerHeight;
      
      if (maxScroll <= 0) {
        setScrollPercent(100);
        return;
      }
      
      const newScrollPercent = Math.min(Math.floor((scrollPosition / maxScroll) * 100), 100);
      setScrollPercent(newScrollPercent);
    };
    
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isCompleted]);
  
  // Set up intersection observer to track visibility
  useEffect(() => {
    if (isCompleted) return;
    
    if (containerRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
          
          if (!entry.isIntersecting) {
            toast({
              title: "Content not in view",
              description: "Time tracking paused because the content is not visible.",
              variant: "destructive",
            });
          }
        },
        { threshold: 0.5 }
      );
      
      observerRef.current.observe(containerRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isCompleted, toast]);
  
  // Format seconds to mm:ss
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Handle showing the quiz
  const handleShowQuiz = () => {
    if (progress < 100) {
      toast({
        title: "Please finish reading",
        description: "You need to read more of the content before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    setQuizShown(true);
  };
  
  // Handle answering quiz questions
  const handleAnswerQuestion = (id: string, answer: boolean) => {
    setQuizAnswers(prev => ({
      ...prev,
      [id]: answer
    }));
  };
  
  // Handle completing the module
  const handleCompleteModule = () => {
    // Check if all questions are answered
    const questionIds = ['q1', 'q2']; // Match the IDs in the quiz markup
    const allAnswered = questionIds.every(id => quizAnswers[id] !== undefined);
    
    if (!allAnswered) {
      toast({
        title: "Answer all questions",
        description: "Please answer all comprehension check questions.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if answers are correct (in this simple example we just check if any are true)
    const hasCorrectAnswers = Object.values(quizAnswers).some(answer => answer === true);
    
    if (!hasCorrectAnswers) {
      toast({
        title: "Check your answers",
        description: "Please review the content and try answering the questions again.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Module Completed!",
      description: "You've successfully completed this reading module.",
    });
    onComplete();
  };
  
  // If the module is already completed, show a different UI
  if (isCompleted) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            
            <p className="text-green-600 font-medium mb-6">You have successfully completed this reading module</p>
            
            <div 
              className="prose prose-sm mx-auto max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6" ref={containerRef}>
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1.5" />
            <span>Estimated reading time: {estimatedReadingTime} minutes</span>
          </div>
          
          <div className="flex items-center">
            <div className="text-sm font-medium mr-2">
              Progress: {progress}%
            </div>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
        
        {/* Content container with scroll tracking */}
        <div 
          ref={contentRef} 
          className="border rounded-md p-4 mb-4 max-h-96 overflow-y-auto"
        >
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
          
          {/* Comprehension check quiz (shown only when reading is completed) */}
          {readingCompleted && (
            <div className={`mt-8 p-4 bg-gray-50 rounded-md border ${quizShown ? 'block' : 'hidden'}`}>
              <h4 className="font-medium text-lg mb-4">Comprehension Check</h4>
              <p className="text-gray-600 mb-4">
                Please answer the following questions to demonstrate your understanding of the material.
              </p>
              
              <div className="space-y-4">
                <div className="p-3 border rounded-md bg-white">
                  <p className="font-medium mb-2">Does this content provide valuable information for election observers?</p>
                  <div className="flex space-x-4">
                    <Button 
                      variant={quizAnswers['q1'] === true ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleAnswerQuestion('q1', true)}
                    >
                      Yes
                    </Button>
                    <Button 
                      variant={quizAnswers['q1'] === false ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleAnswerQuestion('q1', false)}
                    >
                      No
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 border rounded-md bg-white">
                  <p className="font-medium mb-2">Would you recommend this reading to other observers?</p>
                  <div className="flex space-x-4">
                    <Button 
                      variant={quizAnswers['q2'] === true ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleAnswerQuestion('q2', true)}
                    >
                      Yes
                    </Button>
                    <Button 
                      variant={quizAnswers['q2'] === false ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleAnswerQuestion('q2', false)}
                    >
                      No
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Button onClick={handleCompleteModule}>
                  Complete Module
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {!isVisible && (
              <div className="flex items-center text-amber-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>Time tracking paused - content not in view</span>
              </div>
            )}
            {isVisible && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Time spent: {formatTime(timeSpent)} / {formatTime(requiredReadingTime)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-sm mr-2">
              <div className={scrollPercent >= 100 ? "text-green-600" : "text-gray-500"}>
                <Check className="h-4 w-4 mr-1 inline" />
                <span>Scrolled to end</span>
              </div>
            </div>
            
            {readingCompleted && !quizShown ? (
              <Button onClick={handleShowQuiz}>
                Continue to Comprehension Check
              </Button>
            ) : !quizShown ? (
              <Button variant="outline" disabled={!readingCompleted}>
                <BookOpen className="h-4 w-4 mr-2" />
                Continue Reading
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}