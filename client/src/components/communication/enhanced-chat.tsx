import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare, Phone, Video, Send, Search, UserPlus, ArrowLeft,
  PhoneOff, Mic, MicOff, Camera, CameraOff, Volume2, VolumeX
} from 'lucide-react';
import { useCommunication, type Message, type User as CommunicationUser } from '@/hooks/use-communication';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';

interface EnhancedChatProps {
  userId: number;
  hideHeader?: boolean;
}

export function EnhancedChat({ userId, hideHeader = false }: EnhancedChatProps) {
  const currentUserId = userId;
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();

  const {
    conversations,
    conversationsLoading,
    onlineUsers,
    useGetMessages,
    sendMessage,
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
  const { data: allUsers, isLoading: allUsersLoading } = useQuery<CommunicationUser[]>({
    queryKey: ['/api/communications/online-users'],
    queryFn: async () => {
      const response = await fetch('/api/communications/online-users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    staleTime: 10000
  });

  // Get messages for the active chat
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useGetMessages(activeChatUserId);

  // Filter conversations based on search query
  const filteredConversations = (Array.isArray(conversations) ? conversations : []).filter(conversation => {
    if (!conversation || typeof conversation.username !== 'string') return false;
    const query = searchQuery?.toLowerCase() || '';
    return conversation.username.toLowerCase().includes(query);
  });

  // Filter all users for search
  const filteredAllUsers = (allUsers || []).filter(user => {
    const username = user?.username ?? "";
    return username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Helper function to get user by ID
  const getUserById = (id: number) => {
    return allUsers?.find(user => user.id === id);
  };

  // Helper function to get initials
  const getInitials = (user: any) => {
    if (!user) return 'U';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatUserId) return;

    try {
      await sendMessage(activeChatUserId, messageInput, 'text');
      setMessageInput('');
      // Force refetch messages to update UI immediately
      setTimeout(() => refetchMessages(), 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle starting a new conversation
  const handleStartConversation = (user: CommunicationUser) => {
    setActiveChatUserId(user.id);
    setShowUserSearch(false);
    // Force refetch messages for the new conversation
    setTimeout(() => refetchMessages(), 100);
  };

  // Handle call actions
  const handleStartCall = (type: 'audio' | 'video') => {
    if (activeChatUserId) {
      startCall(activeChatUserId, type);
      setIsCallActive(true);
    }
  };

  const handleEndCall = () => {
    endCall();
    setIsCallActive(false);
  };

  const handleAnswerCall = () => {
    if (incomingCall) {
      answerCall();
      setIsCallActive(true);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      rejectCall();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-4xl mx-auto">
      {!hideHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communications Center
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="flex-1 flex overflow-hidden p-0">
        <div className="flex w-full h-full">
          {/* Conversations Sidebar */}
          <div className={`${isMobile && activeChatUserId ? 'hidden' : 'flex'} flex-col w-80 border-r bg-muted/30`}>
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowUserSearch(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {conversationsLoading ? (
                  <div className="flex justify-center p-4">
                    <Spinner />
                  </div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.userId}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        activeChatUserId === conversation.userId
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setActiveChatUserId(conversation.userId)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.username}`} />
                        <AvatarFallback>{getInitials(conversation)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{conversation.username}</p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt))} ago
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    <p>No conversations yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowUserSearch(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Start new chat
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeChatUserId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between bg-background">
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveChatUserId(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${getUserById(activeChatUserId)?.username}`} />
                      <AvatarFallback>{getInitials(getUserById(activeChatUserId))}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{getUserById(activeChatUserId)?.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {onlineUsers.find(u => u.id === activeChatUserId) ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Call Controls */}
                  <div className="flex items-center gap-2">
                    {!isCallActive && !activeCall && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartCall('audio')}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartCall('video')}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {(isCallActive || activeCall) && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsMuted(!isMuted)}
                        >
                          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                        >
                          {isVideoEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleEndCall}
                        >
                          <PhoneOff className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Call Area */}
                {(isCallActive || activeCall) && (
                  <div className="relative bg-black h-64 flex items-center justify-center">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute bottom-4 right-4 w-32 h-24 object-cover rounded border-2 border-white"
                    />
                  </div>
                )}

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex justify-center p-4">
                      <Spinner />
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.senderId === currentUserId
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDistanceToNow(new Date(message.sentAt))} ago
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messageEndRef} />
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                      <p>Start a conversation</p>
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t bg-background">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={!messageInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg">Select a conversation to start messaging</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowUserSearch(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Start new chat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* User Search Dialog */}
      <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-64">
              {allUsersLoading ? (
                <div className="flex justify-center p-4">
                  <Spinner />
                </div>
              ) : filteredAllUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredAllUsers
                    .filter(user => user.id !== currentUserId)
                    .map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleStartConversation(user)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                          <AvatarFallback>{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Observer'}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center p-4 text-muted-foreground">
                  <p>No users found matching your search.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Incoming Call</DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4">
              <Avatar className="h-16 w-16 mx-auto">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${getUserById(incomingCall.callerId)?.username}`} />
                <AvatarFallback>{getInitials(getUserById(incomingCall.callerId))}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getUserById(incomingCall.callerId)?.username}</p>
                <p className="text-sm text-muted-foreground">
                  {incomingCall.callMediaType === 'video' ? 'Video' : 'Audio'} call
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button variant="destructive" onClick={handleRejectCall}>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button variant="default" onClick={handleAnswerCall}>
                  <Phone className="h-4 w-4 mr-2" />
                  Answer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}