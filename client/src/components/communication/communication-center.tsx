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
    user.username.toLowerCase().includes(contactsSearchQuery.toLowerCase())
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
                            <AvatarFallback>{conversation.username.substring(0, 2).toUpperCase()}</AvatarFallback>
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
              <div className="px-3 py-2 flex items-center justify-between border-b">
                <h3 className="text-sm font-medium">Online Users ({onlineUsers.length})</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setShowUserSearch(true)}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-grow">
                <div className="px-2 py-2">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map(user => (
                      <div 
                        key={user.id} 
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors mb-1 ${
                          activeChatUserId === user.id
                            ? 'bg-secondary'
                            : 'hover:bg-secondary/50'
                        }`}
                        onClick={() => setActiveChatUserId(user.id)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                            <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            user.status === 'online' ? 'bg-green-500' : 
                            user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-center items-center h-32">
                      <p className="text-sm text-muted-foreground">
                        {contactsSearchQuery ? 'No matches found' : 'No users online'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* All Users Section */}
                <div className="px-3 py-2 border-t mt-2">
                  <h3 className="text-sm font-medium">All Users</h3>
                </div>
                <div className="px-2">
                  {allUsersLoading ? (
                    <div className="flex justify-center items-center py-4">
                      <p className="text-sm text-muted-foreground">Loading users...</p>
                    </div>
                  ) : filteredAllUsers && filteredAllUsers.length > 0 ? (
                    filteredAllUsers.map(user => (
                      <div 
                        key={user.id} 
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors mb-1 ${
                          activeChatUserId === user.id
                            ? 'bg-secondary'
                            : 'hover:bg-secondary/50'
                        }`}
                        onClick={() => setActiveChatUserId(user.id)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                            <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-center items-center py-4">
                      <p className="text-sm text-muted-foreground">
                        {contactsSearchQuery ? 'No matches found' : 'No users available'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <div className="flex-1 h-full flex flex-col overflow-hidden">
              {activeChatUserId && activeChatUser ? (
                <>
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChatUser.username}`} />
                        <AvatarFallback>{activeChatUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{activeChatUser.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {activeChatUser.status}
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
                              className="h-8 w-8"
                              onClick={() => handleStartCall('audio')}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Audio Call</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleStartCall('video')}
                            >
                              <Video className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Video Call</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <ScrollArea 
                    className="flex-grow p-4"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className={`h-full ${isDraggingFile ? 'bg-secondary/50 border-2 border-dashed border-primary' : ''}`}>
                      {isDraggingFile && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
                          <div className="bg-card p-4 rounded-lg text-center">
                            <Paperclip className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <p className="font-medium">Drop file to send</p>
                          </div>
                        </div>
                      )}
                      
                      {messagesLoading ? (
                        <div className="flex justify-center items-center h-full">
                          <p className="text-sm text-muted-foreground">Loading messages...</p>
                        </div>
                      ) : messages && messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages.map((message, index) => {
                            const isCurrentUser = message.senderId === userId;
                            const showAvatar = index === 0 || 
                              messages[index - 1].senderId !== message.senderId;
                            
                            return (
                              <div 
                                key={message.id} 
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                              >
                                {!isCurrentUser && showAvatar && (
                                  <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChatUser.username}`} />
                                    <AvatarFallback>{activeChatUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                )}
                                
                                <div className={`max-w-[75%] ${!isCurrentUser && !showAvatar ? 'ml-10' : ''}`}>
                                  <div 
                                    className={`rounded-lg p-3 ${
                                      isCurrentUser 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-secondary'
                                    }`}
                                  >
                                    {renderMessageContent(message)}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatMessageTime(message.sentAt)}
                                  </p>
                                </div>
                                
                                {isCurrentUser && showAvatar && (
                                  <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${userId}`} />
                                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            );
                          })}
                          <div ref={messageEndRef} />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-lg font-medium">No messages yet</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Send a message to start the conversation
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="p-3 border-t">
                    <div className="flex items-end gap-2">
                      <input 
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Image className="h-5 w-5" />
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        className="flex-1"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                      />
                      <Button 
                        size="icon" 
                        className="h-9 w-9 flex-shrink-0"
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium">Your Messages</h3>
                  <p className="text-muted-foreground mt-2 text-center max-w-md">
                    Select a conversation from the sidebar or start a new chat with an online user
                  </p>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </CardContent>
      
      {/* Call Modal */}
      <Dialog open={isCallModalOpen || !!incomingCall} onOpenChange={(open) => {
        // Only allow closing via the end call button
        if (!open && (activeCall || incomingCall)) {
          endCall();
        }
        setIsCallModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {incomingCall && !activeCall 
                ? 'Incoming Call' 
                : activeCall?.type === 'video' 
                ? 'Video Call' 
                : 'Voice Call'}
            </DialogTitle>
          </DialogHeader>
          
          {incomingCall && !activeCall ? (
            <div className="flex flex-col items-center py-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                    incomingCall.callerId 
                    ? getUserById(incomingCall.callerId)?.username || 'user' 
                    : 'user'
                  }`} 
                />
                <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-medium mb-1">
                {incomingCall.callerId 
                  ? getUserById(incomingCall.callerId)?.username || 'Unknown User' 
                  : 'Unknown User'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {incomingCall.type === 'video' ? 'Video call' : 'Voice call'}
              </p>
              
              <div className="flex gap-4">
                <Button 
                  variant="destructive" 
                  className="rounded-full h-12 w-12 p-0"
                  onClick={() => rejectCall()}
                >
                  <Phone className="h-5 w-5 rotate-135" />
                </Button>
                <Button 
                  variant="default" 
                  className="rounded-full h-12 w-12 p-0"
                  onClick={handleAnswerCall}
                >
                  <Phone className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : activeCall ? (
            <div className="flex flex-col">
              {activeCall.type === 'video' ? (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  <video 
                    ref={remoteVideoRef}
                    autoPlay 
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 right-4 w-1/4 aspect-video rounded overflow-hidden border-2 border-background shadow-md">
                    <video 
                      ref={localVideoRef}
                      autoPlay 
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                        activeCall.callerId === userId 
                          ? getUserById(activeCall.receiverId)?.username || 'user' 
                          : getUserById(activeCall.callerId)?.username || 'user'
                      }`} 
                    />
                    <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-medium mb-1">
                    {activeCall.callerId === userId 
                      ? getUserById(activeCall.receiverId)?.username || 'Unknown User' 
                      : getUserById(activeCall.callerId)?.username || 'Unknown User'}
                  </h3>
                  <p className="text-muted-foreground mb-2">Voice call</p>
                  <p className="text-sm" id="call-timer">00:00</p>
                </div>
              )}
              
              <div className="flex justify-center gap-4 py-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={`rounded-full h-12 w-12 ${isMuted ? 'bg-red-100 text-red-500' : ''}`}
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                
                {activeCall.type === 'video' && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className={`rounded-full h-12 w-12 ${!isVideoEnabled ? 'bg-red-100 text-red-500' : ''}`}
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
                  </Button>
                )}
                
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="rounded-full h-12 w-12"
                  onClick={() => {
                    endCall();
                    setIsCallModalOpen(false);
                  }}
                >
                  <Phone className="h-5 w-5 rotate-135" />
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}