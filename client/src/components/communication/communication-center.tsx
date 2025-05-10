import { useState, useRef, useEffect } from 'react';
import useCommunication from '@/hooks/use-communication';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Phone,
  Video,
  Monitor,
  X,
  PhoneOff,
  Send,
  User,
  Check,
  Clock,
  FileText,
  Image as ImageIcon,
  Paperclip,
  CheckCheck,
  MessageSquare,
  Users,
  MicOff,
  Mic,
  Video as VideoIcon,
  VideoOff,
  Share2,
  Loader2
} from "lucide-react";
import { format } from 'date-fns';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types for the component
interface User {
  id: number;
  username: string;
  status: 'online' | 'offline' | 'away';
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  sentAt: Date;
  read: boolean;
}

interface Conversation {
  userId: number;
  username: string;
  lastMessage: string;
  unreadCount: number;
  lastMessageAt: Date;
}

interface CommunicationCenterProps {
  userId: number;
}

export function CommunicationCenter({ userId }: CommunicationCenterProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callTab, setCallTab] = useState<'video' | 'audio'>('video');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isConnected,
    onlineUsers,
    activeChat,
    typingUsers,
    conversations,
    messages,
    incomingCall,
    currentCall,
    localStream,
    remoteStream,
    sendMessage,
    setActiveChatUser,
    sendTypingIndicator,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    shareScreen
  } = useCommunication(userId);

  // Format the messages for display
  const formattedMessages = Array.isArray(messages) ? messages.map(msg => ({
    ...msg,
    sentAt: new Date(msg.sentAt),
    isOwn: msg.senderId === userId
  })) : [];

  // Get the active user
  const activeUser = activeChat 
    ? onlineUsers.find(user => user.id === activeChat) || { id: activeChat, username: 'Unknown', status: 'offline' as const }
    : null;

  // Handle sending messages
  const handleSendMessage = () => {
    if (!activeChat || !messageInput.trim()) return;
    
    sendMessage(activeChat, messageInput);
    setMessageInput('');
    
    // Cancel typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    sendTypingIndicator(activeChat, false);
    setIsTyping(false);
  };

  // Handle message input changes
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (!isTyping && e.target.value.trim() && activeChat) {
      sendTypingIndicator(activeChat, true);
      setIsTyping(true);
    }
    
    // Reset typing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    if (e.target.value.trim() && activeChat) {
      const timeout = setTimeout(() => {
        sendTypingIndicator(activeChat, false);
        setIsTyping(false);
        setTypingTimeout(null);
      }, 2000);
      setTypingTimeout(timeout);
    } else if (isTyping && activeChat) {
      sendTypingIndicator(activeChat, false);
      setIsTyping(false);
    }
  };

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [formattedMessages]);

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeChat) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || !event.target.result) return;
      
      // For simplicity, we'll just send the file name as the message
      // In a real app, you'd upload the file to a server and send a link
      sendMessage(activeChat, `[File] ${file.name}`, 'file');
    };
    
    reader.readAsDataURL(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start a call
  const handleStartCall = () => {
    if (!activeChat) return;
    startCall(activeChat, callTab);
    setIsCallDialogOpen(false);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar with conversations and online users */}
      <div className="w-64 border-r flex flex-col h-full bg-card">
        <Tabs defaultValue="conversations" className="w-full h-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="conversations">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Online
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="h-full flex flex-col">
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations.map((conversation: Conversation) => (
                    <div
                      key={conversation.userId}
                      className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 ${
                        activeChat === conversation.userId ? 'bg-accent' : ''
                      }`}
                      onClick={() => setActiveChatUser(conversation.userId)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {conversation.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            {conversation.username}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="ml-auto rounded-full px-1 min-w-[1.5rem] text-center">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="users" className="h-full flex flex-col">
            <ScrollArea className="flex-1">
              {onlineUsers.length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-muted-foreground">
                  No users online
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {onlineUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 ${
                        activeChat === user.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setActiveChatUser(user.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                            user.status === 'online'
                              ? 'bg-green-500'
                              : user.status === 'away'
                              ? 'bg-yellow-500'
                              : 'bg-gray-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{user.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full">
        {activeChat && activeUser ? (
          <>
            {/* Chat header */}
            <div className="p-3 border-b flex items-center justify-between bg-card">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarFallback>
                    {activeUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{activeUser.username}</div>
                  <div className="text-xs flex items-center space-x-1">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        activeUser.status === 'online'
                          ? 'bg-green-500'
                          : activeUser.status === 'away'
                          ? 'bg-yellow-500'
                          : 'bg-gray-500'
                      }`}
                    />
                    <span>{activeUser.status}</span>
                    {typingUsers[activeUser.id] && (
                      <span className="text-muted-foreground ml-2 italic">typing...</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCallTab('audio');
                          setIsCallDialogOpen(true);
                        }}
                      >
                        <Phone className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Audio Call</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCallTab('video');
                          setIsCallDialogOpen(true);
                        }}
                      >
                        <Video className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Video Call</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {/* Messages area */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {formattedMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-4 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  formattedMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.isOwn ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] ${
                          message.isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        } p-3 rounded-lg`}
                      >
                        {message.type === 'text' && <p>{message.content}</p>}
                        {message.type === 'file' && (
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>{message.content}</span>
                          </div>
                        )}
                        {message.type === 'image' && (
                          <div className="flex items-center space-x-2">
                            <ImageIcon className="h-4 w-4" />
                            <span>{message.content}</span>
                          </div>
                        )}
                        {message.type === 'system' && (
                          <div className="text-muted-foreground italic">
                            {message.content}
                          </div>
                        )}
                        <div
                          className={`text-xs mt-1 ${
                            message.isOwn
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          } flex items-center justify-end space-x-1`}
                        >
                          <span>
                            {format(new Date(message.sentAt), 'HH:mm')}
                          </span>
                          {message.isOwn && (
                            <span>
                              {message.read ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            {/* Message input */}
            <div className="p-3 border-t flex items-center space-x-2 bg-card">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </Button>
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={handleMessageInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="default"
                size="icon"
                disabled={!messageInput.trim()}
                onClick={handleSendMessage}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground">
            <div className="text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-medium mb-2">No conversation selected</h3>
              <p>Choose a contact from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Call dialog */}
      <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {callTab === 'video' ? 'Start Video Call' : 'Start Audio Call'}
            </DialogTitle>
            <DialogDescription>
              {callTab === 'video'
                ? 'Start a video call with this contact'
                : 'Start an audio call with this contact'}
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={callTab}
            onValueChange={(value) => setCallTab(value as 'video' | 'audio')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="video">
                <Video className="h-4 w-4 mr-2" />
                Video
              </TabsTrigger>
              <TabsTrigger value="audio">
                <Phone className="h-4 w-4 mr-2" />
                Audio
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsCallDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartCall}>Start Call</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Incoming call dialog */}
      <Dialog open={!!incomingCall} onOpenChange={(open) => !open && rejectCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incoming {incomingCall?.type} Call</DialogTitle>
            <DialogDescription>
              {onlineUsers.find(u => u.id === incomingCall?.callerId)?.username || 'Someone'} is calling you
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center space-x-4 mt-4">
            <Button
              variant="destructive"
              className="rounded-full h-12 w-12 p-0"
              onClick={rejectCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              variant="default"
              className="rounded-full h-12 w-12 p-0"
              onClick={answerCall}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Active call dialog */}
      <Dialog
        open={!!currentCall}
        onOpenChange={(open) => !open && endCall()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentCall?.type === 'video' ? 'Video' : 'Audio'} Call</DialogTitle>
            <DialogDescription>
              {currentCall?.callerId === userId
                ? `Calling ${
                    onlineUsers.find(u => u.id === currentCall.receiverId)?.username || 'User'
                  }`
                : `Call with ${
                    onlineUsers.find(u => u.id === currentCall?.callerId)?.username || 'User'
                  }`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative">
            {currentCall?.type === 'video' && (
              <div className="bg-black rounded-lg overflow-hidden aspect-video mb-4">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    <span>Connecting...</span>
                  </div>
                )}
                
                {localStream && (
                  <div className="absolute bottom-4 right-4 w-1/4 bg-black rounded-lg overflow-hidden border-2 border-background">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}
            
            {currentCall?.type === 'audio' && (
              <div className="flex flex-col items-center justify-center py-6">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="text-3xl">
                    {currentCall.callerId === userId
                      ? onlineUsers.find(u => u.id === currentCall.receiverId)?.username.charAt(0).toUpperCase() || 'U'
                      : onlineUsers.find(u => u.id === currentCall.callerId)?.username.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <audio ref={remoteVideoRef} autoPlay />
                <audio ref={localVideoRef} autoPlay muted />
                
                {!remoteStream && (
                  <div className="flex items-center mt-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Connecting...</span>
                  </div>
                )}
                
                <div className="text-xl font-medium mt-2">
                  {currentCall.callerId === userId
                    ? onlineUsers.find(u => u.id === currentCall.receiverId)?.username || 'User'
                    : onlineUsers.find(u => u.id === currentCall.callerId)?.username || 'User'}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-center space-x-4">
            {currentCall?.type === 'video' && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full h-12 w-12 p-0"
                  onClick={() => {
                    // Toggle microphone
                    if (localStream) {
                      const audioTracks = localStream.getAudioTracks();
                      audioTracks.forEach(track => {
                        track.enabled = !track.enabled;
                      });
                    }
                  }}
                >
                  <MicOff className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="outline"
                  className="rounded-full h-12 w-12 p-0"
                  onClick={() => {
                    // Toggle video
                    if (localStream) {
                      const videoTracks = localStream.getVideoTracks();
                      videoTracks.forEach(track => {
                        track.enabled = !track.enabled;
                      });
                    }
                  }}
                >
                  <VideoOff className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="outline"
                  className="rounded-full h-12 w-12 p-0"
                  onClick={shareScreen}
                >
                  <Monitor className="h-5 w-5" />
                </Button>
              </>
            )}
            
            {currentCall?.type === 'audio' && (
              <Button
                variant="outline"
                className="rounded-full h-12 w-12 p-0"
                onClick={() => {
                  // Toggle microphone
                  if (localStream) {
                    const audioTracks = localStream.getAudioTracks();
                    audioTracks.forEach(track => {
                      track.enabled = !track.enabled;
                    });
                  }
                }}
              >
                <MicOff className="h-5 w-5" />
              </Button>
            )}
            
            <Button
              variant="destructive"
              className="rounded-full h-12 w-12 p-0"
              onClick={endCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CommunicationCenter;