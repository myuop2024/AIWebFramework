import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [isInView, setIsInView] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Required time in seconds (60% of estimated reading time)
  const requiredTimeInSeconds = Math.max(estimatedReadingTime * 60 * 0.6, 30);

  // Set up intersection observer to detect when content is out of view
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      const wasInView = isInView;
      setIsInView(entry.isIntersecting);
      
      // If scrolled out of view, show toast
      if (wasInView && !entry.isIntersecting && !isCompleted) {
        toast({
          title: "Training paused",
          description: "You must keep the content visible to continue training",
          variant: "destructive"
        });
      }
    }, {
      threshold: 0.5 // 50% of the content must be visible
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isInView, isCompleted, toast]);

  // Timer to track time spent on content when in view
  useEffect(() => {
    if (isCompleted) {
      setProgress(100);
      return;
    }

    if (isInView && hasInteracted) {
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => {
          const newTimeSpent = prev + 1;
          // Calculate progress percentage based on time spent vs required time
          const newProgress = Math.min(Math.floor((newTimeSpent / requiredTimeInSeconds) * 100), 100);
          setProgress(newProgress);
          return newTimeSpent;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isInView, hasInteracted, requiredTimeInSeconds, isCompleted]);

  // Check scroll position to determine if user has read to the bottom
  useEffect(() => {
    const checkScrollPosition = () => {
      if (!contentRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      // Consider bottom reached if within 100px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 100) {
        setHasScrolledToBottom(true);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', checkScrollPosition);
      return () => contentElement.removeEventListener('scroll', checkScrollPosition);
    }
  }, []);

  // Track interactions with the content
  useEffect(() => {
    const handleInteraction = () => setHasInteracted(true);
    
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleInteraction);
      contentElement.addEventListener('click', handleInteraction);
      contentElement.addEventListener('mousemove', handleInteraction);
      
      return () => {
        contentElement.removeEventListener('scroll', handleInteraction);
        contentElement.removeEventListener('click', handleInteraction);
        contentElement.removeEventListener('mousemove', handleInteraction);
      };
    }
  }, []);

  // Handle completion
  const handleCompleteClick = () => {
    if (timeSpent >= requiredTimeInSeconds && hasScrolledToBottom && quizAnswered) {
      onComplete();
      toast({
        title: "Training completed",
        description: "You have successfully completed this reading module"
      });
    } else {
      let message = "";
      if (!hasScrolledToBottom) message += "You need to read the entire content. ";
      if (timeSpent < requiredTimeInSeconds) message += "You need to spend more time on this material. ";
      if (!quizAnswered) message += "You need to answer the comprehension question.";
      
      toast({
        title: "Cannot complete yet",
        description: message,
        variant: "destructive"
      });
    }
  };

  // The simple comprehension question
  const handleAnswerQuestion = (isCorrect: boolean) => {
    if (isCorrect) {
      setQuizAnswered(true);
      toast({
        title: "Correct!",
        description: "You've answered the question correctly."
      });
    } else {
      toast({
        title: "Incorrect",
        description: "Please try again after reviewing the material.",
        variant: "destructive"
      });
    }
  };

  return (
    <div ref={containerRef} className="mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">
                  Estimated reading time: {estimatedReadingTime} min
                </span>
              </div>
              
              {isCompleted ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-sm font-medium">{progress}% complete</span>
                </div>
              )}
            </div>
            
            <Progress value={progress} className="h-2 mb-4" />
            
            {!isInView && !isCompleted && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-yellow-700 font-medium">Training paused</p>
                <p className="text-yellow-600 text-sm">The content must remain visible to track your progress</p>
              </div>
            )}
            
            <div 
              ref={contentRef} 
              className="bg-white border rounded-md p-4 overflow-y-auto max-h-[500px] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            
            {!isCompleted && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium mb-3">Comprehension Check</h4>
                <p className="mb-3">Please answer this question to verify your understanding:</p>
                
                <div className="p-4 border rounded-md bg-gray-50 mb-4">
                  <p className="font-medium mb-3">What is the main purpose of this training module?</p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left"
                      onClick={() => handleAnswerQuestion(true)}
                    >
                      To provide essential knowledge about election observation procedures
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left"
                      onClick={() => handleAnswerQuestion(false)}
                    >
                      To teach observers how to operate electronic voting machines
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left"
                      onClick={() => handleAnswerQuestion(false)}
                    >
                      To explain the history of democratic elections
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <p>To complete this module:</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li className={hasScrolledToBottom ? "text-green-600" : ""}>
                        Read all content {hasScrolledToBottom && "✓"}
                      </li>
                      <li className={timeSpent >= requiredTimeInSeconds ? "text-green-600" : ""}>
                        Spend sufficient time reviewing {timeSpent >= requiredTimeInSeconds && "✓"}
                      </li>
                      <li className={quizAnswered ? "text-green-600" : ""}>
                        Answer the comprehension question {quizAnswered && "✓"}
                      </li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={handleCompleteClick}
                    disabled={!(timeSpent >= requiredTimeInSeconds && hasScrolledToBottom && quizAnswered)}
                  >
                    Mark as Complete
                  </Button>
                </div>
              </div>
            )}
            
            {isCompleted && (
              <div className="mt-4 text-center">
                <Button variant="outline" className="mx-auto">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Review Material
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}