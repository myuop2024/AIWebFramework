import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useWebSocket, type ChatMessage } from "@/lib/websocket";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, Send, AlertCircle, Loader2, PhoneCall, Video } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface ChatContact {
  id: number;
  name: string;
  role: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  isOnline?: boolean;
}

export default function ChatInterface() {
  const { user } = useAuth();
  const [message, setMessage] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Sample support contacts (in a real app, these would come from the API)
  const supportContacts: ChatContact[] = [
    {
      id: 1001, // Special ID for system support
      name: "Election Center Support",
      role: "Support Staff",
      isOnline: true,
    },
    {
      id: 1002,
      name: "Technical Support",
      role: "IT Team",
      isOnline: true,
    }
  ];

  // WebSocket connection for real-time chat
  const { isConnected, error: wsError, sendMessage } = useWebSocket({
    userId: user?.id || null,
    onMessage: (message) => {
      if (
        message.type === "message" && 
        (message.senderId === selectedContact?.id || message.receiverId === selectedContact?.id)
      ) {
        setChatMessages(prev => [...prev, message]);
      }
    },
  });

  // Fetch chat history when contact is selected
  const { data: messageHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['/api/messages', selectedContact?.id],
    enabled: !!selectedContact?.id,
  });

  // Set chat history when it's loaded
  useEffect(() => {
    if (messageHistory) {
      const formattedMessages = messageHistory.map((msg: any) => ({
        type: 'message' as const,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        timestamp: new Date(msg.sentAt),
        messageId: msg.id,
      }));
      setChatMessages(formattedMessages);
    }
  }, [messageHistory]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Select default contact on load
  useEffect(() => {
    if (supportContacts.length > 0 && !selectedContact) {
      setSelectedContact(supportContacts[0]);
    }
  }, [supportContacts, selectedContact]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (!selectedContact || !message.trim() || !isConnected) return;

    // Send message via WebSocket
    const sent = sendMessage(selectedContact.id, message);
    
    if (sent) {
      // Add message to UI immediately (optimistic update)
      const newMessage: ChatMessage = {
        type: 'message',
        senderId: user?.id,
        receiverId: selectedContact.id,
        content: message,
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, newMessage]);
      setMessage("");
      
      // Focus back on input
      chatInputRef.current?.focus();
    }
  };

  // Handle key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Format timestamp for display
  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display in message groups
  const formatMessageDate = (timestamp: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (timestamp.toDateString() === today.toDateString()) {
      return "Today";
    } else if (timestamp.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  // Group messages by date
  const getMessageGroups = () => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    
    chatMessages.forEach((message) => {
      const messageDate = formatMessageDate(message.timestamp);
      const existingGroup = groups.find(group => group.date === messageDate);
      
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({
          date: messageDate,
          messages: [message],
        });
      }
    });
    
    return groups;
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-180px)]">
      <CardHeader className="pb-3">
        <CardTitle>Chat Support</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 px-0 pb-0 overflow-hidden">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="mx-4 mb-2">
            <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">Contacts</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-hidden flex">
            <TabsContent value="chat" className="flex flex-col h-full w-full m-0 p-0">
              <div className="flex flex-col h-full">
                {/* Chat header */}
                {selectedContact && (
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        {selectedContact.avatarUrl ? (
                          <AvatarImage src={selectedContact.avatarUrl} alt={selectedContact.name} />
                        ) : (
                          <AvatarFallback>
                            {selectedContact.name.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{selectedContact.name}</h3>
                        <div className="flex items-center text-xs text-gray-500">
                          <span className={`h-2 w-2 rounded-full mr-1.5 ${
                            selectedContact.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}></span>
                          {selectedContact.isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon" title="Voice Call">
                        <PhoneCall className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Video Call">
                        <Video className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {!isConnected && !isHistoryLoading && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                        <p className="text-amber-700 font-medium">Connection lost to chat server</p>
                        <p className="text-amber-600 text-sm mt-1">Trying to reconnect...</p>
                      </div>
                    </div>
                  )}
                  
                  {isHistoryLoading && (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      <span className="ml-2 text-gray-500">Loading messages...</span>
                    </div>
                  )}
                  
                  {isConnected && !isHistoryLoading && chatMessages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="bg-primary/10 p-3 rounded-full inline-flex mx-auto mb-3">
                          <UserRound className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-medium text-gray-700">Start a conversation</h3>
                        <p className="text-sm text-gray-500 mt-1">Send a message to begin chatting</p>
                      </div>
                    </div>
                  )}
                  
                  {isConnected && !isHistoryLoading && chatMessages.length > 0 && (
                    <>
                      {getMessageGroups().map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-4">
                          <div className="relative flex items-center justify-center">
                            <Separator className="absolute w-full" />
                            <span className="relative bg-white px-2 text-xs text-gray-500">
                              {group.date}
                            </span>
                          </div>
                          
                          {group.messages.map((msg, msgIndex) => {
                            const isCurrentUser = msg.senderId === user?.id;
                            
                            return (
                              <div 
                                key={msgIndex} 
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className="flex items-end max-w-[75%]">
                                  {!isCurrentUser && (
                                    <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                                      {selectedContact?.avatarUrl ? (
                                        <AvatarImage 
                                          src={selectedContact.avatarUrl} 
                                          alt={selectedContact.name} 
                                        />
                                      ) : (
                                        <AvatarFallback>
                                          {selectedContact?.name.charAt(0)}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                  )}
                                  
                                  <div>
                                    <div 
                                      className={`rounded-lg px-4 py-2 text-sm ${
                                        isCurrentUser 
                                          ? 'bg-primary text-primary-foreground' 
                                          : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {msg.content}
                                    </div>
                                    <div 
                                      className={`text-xs text-gray-500 mt-1 ${
                                        isCurrentUser ? 'text-right' : 'text-left'
                                      }`}
                                    >
                                      {formatMessageTime(msg.timestamp)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div ref={messagesEndRef}></div>
                    </>
                  )}
                </div>
                
                {/* Chat input */}
                <div className="px-4 py-3 border-t">
                  <div className="flex items-center">
                    <Input
                      ref={chatInputRef}
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={!isConnected}
                      className="flex-1"
                    />
                    <Button
                      className="ml-2"
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!isConnected || !message.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="contacts" className="h-full w-full m-0 p-0 overflow-y-auto">
              <div className="divide-y divide-gray-200">
                {supportContacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedContact?.id === contact.id ? 'bg-primary-light/10' : ''
                    }`}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        {contact.avatarUrl ? (
                          <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                        ) : (
                          <AvatarFallback>
                            {contact.name.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">{contact.name}</h3>
                          {contact.unreadCount && contact.unreadCount > 0 && (
                            <Badge className="ml-2 bg-primary">{contact.unreadCount}</Badge>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="truncate">{contact.role}</span>
                          <span className="mx-1.5">•</span>
                          <span className={`h-2 w-2 rounded-full ${
                            contact.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
