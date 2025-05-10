import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, Phone, Video, Send, Paperclip, Image, Mic, 
  User, UserPlus, Users, X, Volume2, VolumeX, Camera, CameraOff, Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCommunication, type Message, type User as CommunicationUser } from '@/hooks/use-communication';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';

interface CommunicationCenterProps {
  userId: number;
  hideHeader?: boolean; // Optional prop to hide the header tabs
}

export function CommunicationCenter({ userId, hideHeader = false }: CommunicationCenterProps) {
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const { 
    conversations, 
    conversationsLoading,
    onlineUsers,
    useGetMessages,
    sendMessage,
    markAsRead,
    markAllAsRead,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    activeCall,
    incomingCall,
    localStream,
    remoteStream
  } = useCommunication(userId);

  // Get all users for site-wide search
  const { data: allUsers, isLoading: allUsersLoading } = useQuery({
    queryKey: ['/api/communications/online-users'],
    queryFn: async () => {
      const response = await fetch('/api/communications/online-users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    staleTime: 10000 // 10 seconds
  });

  // Get messages for the active chat
  const { data: messages, isLoading: messagesLoading } = 
    useGetMessages(activeChatUserId);

  // Filter conversations based on search query
  const filteredConversations = conversations?.filter(conversation => 
    conversation.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter contacts based on search query
  const filteredContacts = onlineUsers.filter(user => 
    user.username.toLowerCase().includes(contactsSearchQuery.toLowerCase())
  );

  // Filter all users based on search query
  const filteredAllUsers = allUsers?.filter(user => 
    user.username?.toLowerCase().includes(contactsSearchQuery.toLowerCase())
  );

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when opening a chat
  useEffect(() => {
    if (activeChatUserId && messages?.length) {
      const unreadMessages = messages.filter(m => 
        m.senderId === activeChatUserId && !m.read
      );
      
      if (unreadMessages.length > 0) {
        markAllAsRead(activeChatUserId);
      }
    }
  }, [activeChatUserId, messages, markAllAsRead]);

  // Set up video streams when in a call
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  // Handle file dropping
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && activeChatUserId) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  // Handle file selection via input
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeChatUserId) {
      const file = e.target.files[0];
      await handleFileUpload(file);
    }
  };

  // Process and upload file
  const handleFileUpload = async (file: File) => {
    if (!activeChatUserId) return;
    
    try {
      // Handle different file types
      if (file.type.startsWith('image/')) {
        // For images, create a data URL and send as an image message
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result && typeof e.target.result === 'string') {
            sendMessage(activeChatUserId, e.target.result, 'image');
          }
        };
        reader.readAsDataURL(file);
      } else {
        // For other files, upload to server first (we'll simulate this for now)
        // In production, you would upload the file to your server and get a URL
        sendMessage(
          activeChatUserId, 
          JSON.stringify({
            name: file.name,
            size: file.size,
            type: file.type
          }), 
          'file'
        );
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Handle sending a message
  const handleSendMessage = () => {
    if (messageInput.trim() && activeChatUserId) {
      sendMessage(activeChatUserId, messageInput);
      setMessageInput('');
    }
  };

  // Handle key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initialize a call
  const handleStartCall = async (callType: 'audio' | 'video') => {
    if (!activeChatUserId) return;
    
    try {
      await startCall(activeChatUserId, callType);
      setIsCallModalOpen(true);
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  // Answer an incoming call
  const handleAnswerCall = async () => {
    try {
      await answerCall();
      setIsCallModalOpen(true);
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Safely get user initials or provide default
  const getInitials = (username?: string): string => {
    if (!username) return 'UN';
    return username.substring(0, 2).toUpperCase();
  };

  // Format message time
  const formatMessageTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Render message content based on type
  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'image':
        return (
          <div className="mt-2">
            <img 
              src={message.content} 
              alt="Shared image" 
              className="max-w-[200px] max-h-[200px] rounded-md object-contain"
            />
          </div>
        );
      case 'file':
        try {
          const fileData = JSON.parse(message.content);
          return (
            <div className="mt-2 flex items-center gap-2 p-2 bg-secondary rounded-md">
              <Paperclip className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">{fileData.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(fileData.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          );
        } catch (e) {
          return <p>{message.content}</p>;
        }
      case 'system':
        return (
          <p className="text-sm italic text-muted-foreground">{message.content}</p>
        );
      default:
        return <p>{message.content}</p>;
    }
  };

  // Get user by ID
  const getUserById = (id: number): CommunicationUser | undefined => {
    const onlineUser = onlineUsers.find(user => user.id === id);
    if (onlineUser) return onlineUser;
    
    // If not in online users, check conversations
    const conversation = conversations?.find(conv => conv.userId === id);
    if (conversation) {
      return {
        id: conversation.userId,
        username: conversation.username,
        status: 'offline'
      };
    }
    
    // If not in conversations, check all users
    const allUser = allUsers?.find(user => user.id === id);
    if (allUser) {
      return {
        id: allUser.id,
        username: allUser.username,
        status: allUser.status
      };
    }
    
    return undefined;
  };

  // Get active chat user
  const activeChatUser = activeChatUserId ? getUserById(activeChatUserId) : undefined;

  // Check if a user is online
  const isUserOnline = (userId: number): boolean => {
    return onlineUsers.some(user => user.id === userId && user.status === 'online');
  };
  
  // Start a chat with a user
  const startChat = (userId: number) => {
    setActiveChatUserId(userId);
    setShowUserSearch(false);
  };

  return (
    <Card className="h-full border-none shadow-none">
      <CardContent className="p-0 h-full">
        <Tabs defaultValue="chats" className="h-full flex flex-col">
          {!hideHeader && (
            <div className="border-b px-4">
              <TabsList className="justify-start bg-transparent border-b-0 px-0 py-1">
                <TabsTrigger value="chats" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chats
                </TabsTrigger>
                <TabsTrigger value="contacts" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <Users className="h-4 w-4 mr-2" />
                  Contacts
                </TabsTrigger>
              </TabsList>
            </div>
          )}
          
          <div className="flex h-full overflow-hidden">
            <TabsContent value="chats" className="mt-0 w-full md:w-72 h-full border-r flex flex-col">
              <div className="p-3">
                <div className="relative">
                  <Input 
                    placeholder="Search conversations..." 
                    className="border-0 bg-secondary text-sm pl-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <ScrollArea className="flex-grow">
                {conversationsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <p className="text-sm text-muted-foreground">Loading conversations...</p>
                  </div>
                ) : filteredConversations && filteredConversations.length > 0 ? (
                  <div className="px-2">
                    {filteredConversations.map((conversation) => (
                      <div 
                        key={conversation.userId} 
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors mb-1 ${
                          activeChatUserId === conversation.userId
                            ? 'bg-secondary'
                            : 'hover:bg-secondary/50'
                        }`}
                        onClick={() => setActiveChatUserId(conversation.userId)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.username}`} />
                            <AvatarFallback>{getInitials(conversation.username)}</AvatarFallback>
                          </Avatar>
                          {isUserOnline(conversation.userId) && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-start">
                            <p className="font-medium truncate">{conversation.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversation.lastMessageAt), { 
                                addSuffix: false,
                                includeSeconds: true
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessageType === 'image' 
                                ? '🖼️ Image'
                                : conversation.lastMessageType === 'file'
                                ? '📎 File'
                                : conversation.lastMessage}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 px-4">
                    <p className="text-sm text-muted-foreground text-center">
                      {searchQuery ? 'No matches found' : 'No conversations yet'}
                    </p>
                    {!searchQuery && (
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Start a new chat by selecting a contact from the Contacts tab
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center" 
                  onClick={() => setShowUserSearch(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="contacts" className="mt-0 w-full md:w-72 h-full border-r flex flex-col">
              <div className="p-3">
                <div className="relative">
                  <Input 
                    placeholder="Search contacts..." 
                    className="border-0 bg-secondary text-sm pl-9" 
                    value={contactsSearchQuery}
                    onChange={(e) => setContactsSearchQuery(e.target.value)}
                  />
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <ScrollArea className="flex-grow">
                {filteredContacts.length > 0 ? (
                  <div className="px-2">
                    <p className="text-xs font-medium px-2 pt-2 pb-1 text-muted-foreground">Online</p>
                    {filteredContacts.filter(user => user.status === 'online').map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-secondary/50"
                        onClick={() => startChat(user.id)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                            <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            user.status === 'online' ? 'bg-green-500' : 
                            user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.status === 'online' ? 'Active now' : 
                             user.status === 'away' ? 'Away' : 'Offline'}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    <p className="text-xs font-medium px-2 pt-4 pb-1 text-muted-foreground">Offline</p>
                    {filteredContacts.filter(user => user.status !== 'online').map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-secondary/50"
                        onClick={() => startChat(user.id)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                            <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gray-500 border-2 border-white" />
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">Offline</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-32">
                    <p className="text-sm text-muted-foreground">
                      {contactsSearchQuery ? 'No contacts found' : 'No contacts available'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <div className="flex-grow flex flex-col h-full">
              {activeChatUserId && activeChatUser ? (
                <>
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChatUser.username}`} />
                          <AvatarFallback>{getInitials(activeChatUser.username)}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          activeChatUser.status === 'online' ? 'bg-green-500' : 
                          'bg-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{activeChatUser.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {activeChatUser.status === 'online' ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={activeChatUser.status !== 'online'}
                              onClick={() => handleStartCall('audio')}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Audio call</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={activeChatUser.status !== 'online'}
                              onClick={() => handleStartCall('video')}
                            >
                              <Video className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Video call</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <div 
                    className={`flex-grow overflow-y-auto p-4 ${isDraggingFile ? 'bg-primary-50' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {messagesLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Spinner />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {messages.map((message, index) => {
                          const isCurrentUser = message.senderId === userId;
                          // Check if this is a new sender or if more than 2 minutes have passed
                          const showAvatar = index === 0 || 
                            messages[index - 1].senderId !== message.senderId ||
                            new Date(message.sentAt).getTime() - new Date(messages[index - 1].sentAt).getTime() > 120000;
                          
                          return (
                            <div 
                              key={message.id} 
                              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[75%]`}>
                                {!isCurrentUser && showAvatar && (
                                  <Avatar className="h-8 w-8 mr-2">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChatUser.username}`} />
                                    <AvatarFallback>{getInitials(activeChatUser.username)}</AvatarFallback>
                                  </Avatar>
                                )}
                                <div>
                                  <div 
                                    className={`rounded-lg p-3 ${
                                      isCurrentUser 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-secondary'
                                    }`}
                                  >
                                    {renderMessageContent(message)}
                                  </div>
                                  <div 
                                    className={`text-xs text-muted-foreground mt-1 ${
                                      isCurrentUser ? 'text-right' : 'text-left'
                                    }`}
                                  >
                                    {formatMessageTime(message.sentAt)}
                                    {isCurrentUser && message.read && (
                                      <span className="ml-1">✓</span>
                                    )}
                                  </div>
                                </div>
                                {isCurrentUser && showAvatar && (
                                  <Avatar className="h-8 w-8 ml-2">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} />
                                    <AvatarFallback>ME</AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messageEndRef} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="bg-secondary rounded-full p-4 mb-3">
                          <MessageSquare className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">No messages yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Start a conversation with {activeChatUser.username}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border-t">
                    <div className="relative">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileInputChange}
                      />
                      <Input 
                        placeholder={`Message ${activeChatUser.username}...`}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pr-24"
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Image className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="primary" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-4">
                  <div className="bg-secondary rounded-full p-6 mb-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Your messages</h3>
                  <p className="text-muted-foreground text-center max-w-xs">
                    Select a conversation to view your messages, or start a new conversation
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowUserSearch(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    New Conversation
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </CardContent>
      
      {/* Incoming call dialog */}
      <Dialog open={!!incomingCall && !isCallModalOpen} onOpenChange={() => rejectCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incoming Call</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                getUserById(incomingCall?.callerId || 0)?.username || incomingCall?.callerId
              }`} />
              <AvatarFallback>
                {getInitials(getUserById(incomingCall?.callerId || 0)?.username)}
              </AvatarFallback>
            </Avatar>
            <p className="text-xl font-semibold mb-1">
              {getUserById(incomingCall?.callerId || 0)?.username || incomingCall?.callerId}
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              {incomingCall?.type === 'video' ? 'Video call' : 'Audio call'}
            </p>
            <div className="flex gap-4">
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={() => rejectCall()}
              >
                <X className="h-6 w-6" />
              </Button>
              <Button 
                variant="default" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600"
                onClick={handleAnswerCall}
              >
                <Phone className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Active call dialog */}
      <Dialog open={isCallModalOpen} onOpenChange={(open) => {
        if (!open) {
          endCall();
          setIsCallModalOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeCall?.type === 'video' ? 'Video Call' : 'Audio Call'} with {getUserById(activeCall?.receiverId || activeCall?.callerId || 0)?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {activeCall?.type === 'video' && (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                {!remoteStream && (
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                        getUserById(activeCall?.receiverId || activeCall?.callerId || 0)?.username || ''
                      }`} 
                    />
                    <AvatarFallback>
                      {getInitials(getUserById(activeCall?.receiverId || activeCall?.callerId || 0)?.username)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              {activeCall?.type === 'video' && (
                <div className="absolute bottom-2 right-2 w-1/4 aspect-video bg-black rounded-lg overflow-hidden border-2 border-background">
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
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className={`h-10 w-10 rounded-full ${isMuted ? 'bg-red-100' : ''}`}
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              {activeCall?.type === 'video' && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={`h-10 w-10 rounded-full ${!isVideoEnabled ? 'bg-red-100' : ''}`}
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-10 w-10 rounded-full"
                onClick={() => {
                  endCall();
                  setIsCallModalOpen(false);
                }}
              >
                <Phone className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* User search dialog */}
      <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input 
                placeholder="Search for a user..." 
                value={contactsSearchQuery}
                onChange={(e) => setContactsSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {allUsersLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Spinner />
                </div>
              ) : filteredAllUsers && filteredAllUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredAllUsers.map((user) => (
                    <Button
                      key={user.id}
                      variant="ghost"
                      className="w-full justify-start p-2 h-auto"
                      onClick={() => {
                        startChat(user.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                            <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.status === 'online' ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No users found</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}