import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertCircle, ArrowRight, RefreshCcw, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

interface QuizTrainingModuleProps {
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number; // percentage required to pass
  onComplete: (score: number) => void;
  isCompleted?: boolean;
  finalScore?: number;
}

export function QuizTrainingModule({
  title,
  description,
  questions,
  passingScore,
  onComplete,
  isCompleted = false,
  finalScore
}: QuizTrainingModuleProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>(Array(questions.length).fill(-1));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(finalScore || 0);
  const { toast } = useToast();

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);
  
  // Calculate how many questions the user has answered
  const answeredCount = selectedOptions.filter(option => option !== -1).length;
  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);

  // Handle option selection
  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitted) return;
    
    const newSelectedOptions = [...selectedOptions];
    newSelectedOptions[currentQuestionIndex] = optionIndex;
    setSelectedOptions(newSelectedOptions);
  };

  // Move to next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setIsSubmitted(false);
    } else {
      // If this is the last question, show final results
      calculateAndShowResults();
    }
  };

  // Move to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      setIsSubmitted(false);
    }
  };

  // Submit current answer
  const handleSubmitAnswer = () => {
    if (selectedOptions[currentQuestionIndex] === -1) {
      toast({
        title: "Selection required",
        description: "Please select an answer before submitting",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitted(true);
    
    const isCorrect = selectedOptions[currentQuestionIndex] === currentQuestion.correctOption;
    
    toast({
      title: isCorrect ? "Correct!" : "Incorrect",
      description: isCorrect 
        ? "Great job! That's the right answer." 
        : currentQuestion.explanation || "The selected answer is incorrect.",
      variant: isCorrect ? "default" : "destructive"
    });
  };

  // Calculate final score and show results
  const calculateAndShowResults = () => {
    const correctAnswers = selectedOptions.reduce((count, selectedOption, index) => {
      return selectedOption === questions[index].correctOption ? count + 1 : count;
    }, 0);
    
    const finalScore = Math.round((correctAnswers / totalQuestions) * 100);
    setScore(finalScore);
    setShowResults(true);
    
    if (finalScore >= passingScore) {
      toast({
        title: "Quiz Completed",
        description: `You scored ${finalScore}% and have passed this assessment!`,
      });
      onComplete(finalScore);
    } else {
      toast({
        title: "Quiz Failed",
        description: `You scored ${finalScore}%, but needed ${passingScore}% to pass. Please review and try again.`,
        variant: "destructive"
      });
    }
  };

  // Restart the quiz
  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptions(Array(questions.length).fill(-1));
    setIsSubmitted(false);
    setShowResults(false);
    setScore(0);
  };

  // If module is already completed, show completion state
  if (isCompleted && finalScore !== undefined) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <FileCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            {description && <p className="text-gray-600 mb-4">{description}</p>}
            
            <div className="mb-6">
              <div className="text-3xl font-bold text-green-600 mb-2">{finalScore}%</div>
              <p className="text-gray-600">You have successfully completed this assessment</p>
            </div>
            
            <Button variant="outline" onClick={handleRestartQuiz}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retake Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show final results
  if (showResults) {
    const passed = score >= passingScore;
    
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4">{title} - Results</h3>
          
          <div className="p-6 border rounded-md bg-gray-50 mb-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className={`h-16 w-16 rounded-full ${passed ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
                  {passed ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </div>
              
              <div className="text-3xl font-bold mb-2">
                <span className={passed ? 'text-green-600' : 'text-red-600'}>{score}%</span>
              </div>
              
              <p className={`font-medium ${passed ? 'text-green-600' : 'text-red-600'} mb-1`}>
                {passed ? 'Assessment Passed' : 'Assessment Failed'}
              </p>
              
              <p className="text-gray-600 mb-4">
                {passed 
                  ? 'Congratulations! You have passed this assessment.' 
                  : `You need ${passingScore}% to pass this assessment. Please review and try again.`}
              </p>
              
              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={handleRestartQuiz}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retake Assessment
                </Button>
                
                {!passed && (
                  <Button onClick={() => {
                    setShowResults(false);
                    setCurrentQuestionIndex(0);
                    setIsSubmitted(false);
                  }}>
                    Review Answers
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Question Summary:</h4>
            
            <div className="space-y-2">
              {questions.map((question, index) => {
                const isCorrect = selectedOptions[index] === question.correctOption;
                const isAnswered = selectedOptions[index] !== -1;
                
                return (
                  <div 
                    key={question.id} 
                    className={`p-3 border rounded-md ${
                      !isAnswered 
                        ? 'bg-gray-50' 
                        : isCorrect 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3">
                        {!isAnswered ? (
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        ) : isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Question {index + 1}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {isAnswered 
                            ? isCorrect 
                              ? 'Correctly answered' 
                              : 'Incorrectly answered'
                            : 'Not answered'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show question
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          {description && <p className="text-gray-600 mb-4">{description}</p>}
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-sm font-medium">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium">{progressPercentage}% complete</span>
            </div>
          </div>
          
          <Progress value={progress} className="h-2 mb-6" />
          
          <div className="p-6 border rounded-md">
            <p className="font-medium text-lg mb-4">{currentQuestion.question}</p>
            
            <RadioGroup 
              value={selectedOptions[currentQuestionIndex].toString()}
              disabled={isSubmitted}
            >
              {currentQuestion.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-2 p-3 rounded-md ${
                    isSubmitted && index === currentQuestion.correctOption 
                      ? 'bg-green-50' 
                      : isSubmitted && selectedOptions[currentQuestionIndex] === index && index !== currentQuestion.correctOption 
                        ? 'bg-red-50' 
                        : selectedOptions[currentQuestionIndex] === index 
                          ? 'bg-blue-50' 
                          : ''
                  }`}
                >
                  <RadioGroupItem 
                    value={index.toString()} 
                    id={`option-${index}`} 
                    onClick={() => handleOptionSelect(index)}
                  />
                  <Label htmlFor={`option-${index}`} className="flex-grow cursor-pointer">
                    {option}
                  </Label>
                  
                  {isSubmitted && index === currentQuestion.correctOption && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  
                  {isSubmitted && selectedOptions[currentQuestionIndex] === index && index !== currentQuestion.correctOption && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              ))}
            </RadioGroup>
            
            {isSubmitted && currentQuestion.explanation && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="font-medium mb-1">Explanation:</p>
                <p className="text-sm text-gray-700">{currentQuestion.explanation}</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            
            {!isSubmitted ? (
              <Button onClick={handleSubmitAnswer}>
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNextQuestion}>
                {currentQuestionIndex < totalQuestions - 1 ? (
                  <>
                    Next Question
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'View Results'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}