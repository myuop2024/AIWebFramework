import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: Array<{
    label: string;
    action: string;
    icon?: React.ReactNode;
  }>;
}

interface AIAssistantProps {
  context?: string;
  className?: string;
}

export function AIAssistant({ context = 'general', className }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hello! I'm your AI assistant. I can help you with navigation, data analysis, report generation, and answer questions about the electoral observation system. How can I assist you today?`,
      timestamp: new Date(),
      suggestions: [
        'Show me recent reports',
        'Help with route planning',
        'Explain polling station data',
        'Generate analytics summary'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for speech recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSpeechToText = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const generateAIResponse = async (userMessage: string): Promise<Message> => {
    // Simulate AI processing with contextual responses
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responses = {
      reports: {
        content: "I can help you with reports! Here's what I found: You have 3 pending reports, 12 completed this week, and 2 requiring approval. Would you like me to show you the details or help you create a new report?",
        actions: [
          { label: "View Pending Reports", action: "/reports?status=pending" },
          { label: "Create New Report", action: "/reports/new" },
          { label: "Analytics Dashboard", action: "/admin-dashboard" }
        ]
      },
      routing: {
        content: "I can assist with route planning! Based on your current assignments, I've optimized routes for 5 polling stations. The estimated travel time is 3.5 hours with minimal traffic. Would you like to see the detailed route or make adjustments?",
        actions: [
          { label: "View Route Map", action: "/route-planning" },
          { label: "Optimize Route", action: "/observer-route-planning" },
          { label: "Station Schedule", action: "/roving/station-schedule" }
        ]
      },
      analytics: {
        content: "Here's your analytics summary: 89% completion rate, 15% increase in efficiency this month, and 3 areas needing attention. The system has identified potential issues in Kingston Central region. Would you like a detailed breakdown?",
        actions: [
          { label: "Full Analytics", action: "/admin/analytics" },
          { label: "Regional Breakdown", action: "/polling-stations/regions" },
          { label: "Performance Metrics", action: "/admin-dashboard" }
        ]
      },
      default: {
        content: "I understand you're asking about the electoral observation system. I can help with navigation, data analysis, report management, route planning, and system guidance. Could you be more specific about what you'd like to know?",
        suggestions: [
          "Show me system status",
          "Help with data entry",
          "Explain workflow process",
          "Troubleshoot issues"
        ]
      }
    };

    const lowerMessage = userMessage.toLowerCase();
    let responseType: keyof typeof responses = 'default';

    if (lowerMessage.includes('report') || lowerMessage.includes('data')) {
      responseType = 'reports';
    } else if (lowerMessage.includes('route') || lowerMessage.includes('navigation') || lowerMessage.includes('travel')) {
      responseType = 'routing';
    } else if (lowerMessage.includes('analytics') || lowerMessage.includes('summary') || lowerMessage.includes('stats')) {
      responseType = 'analytics';
    }

    const response = responses[responseType];

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: response.content,
      timestamp: new Date(),
      suggestions: 'suggestions' in response ? response.suggestions : undefined,
      actions: 'actions' in response ? response.actions : undefined
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await generateAIResponse(userMessage.content);
      setMessages(prev => [...prev, aiResponse]);
      
      // Optional: Speak the response
      if (aiResponse.content.length < 200) {
        speakText(aiResponse.content);
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I apologize, but I'm experiencing some technical difficulties. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleActionClick = (action: string) => {
    // Navigate to the specified route
    window.location.href = action;
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          AI Assistant
          <Badge variant="secondary" className="ml-auto">
            Smart Help
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea className="h-96 w-full pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'assistant' && (
                  <div className="p-2 rounded-full bg-primary/10 h-fit">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] space-y-2",
                  message.type === 'user' ? 'items-end' : 'items-start'
                )}>
                  <div className={cn(
                    "p-3 rounded-lg",
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-muted'
                  )}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                  
                  {/* Suggestions */}
                  {message.suggestions && (
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  {message.actions && (
                    <div className="flex flex-wrap gap-2">
                      {message.actions.map((action, index) => (
                        <Button
                          key={index}
                          variant="default"
                          size="sm"
                          onClick={() => handleActionClick(action.action)}
                          className="text-xs"
                        >
                          {action.icon}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                
                {message.type === 'user' && (
                  <div className="p-2 rounded-full bg-secondary h-fit">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about the system..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="pr-12"
            />
            {speechSupported && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeechToText}
                className={cn(
                  "absolute right-1 top-1 h-8 w-8 p-0",
                  isListening && "text-red-500"
                )}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <Button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || isLoading}
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          AI Assistant • Voice commands supported • Context-aware help
        </div>
      </CardContent>
    </Card>
  );
} 