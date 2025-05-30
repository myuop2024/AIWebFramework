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
  User, UserPlus, Users, X, Volume2, VolumeX, Camera, CameraOff, Search,
  Download, Clock, ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCommunication, type Message, type User as CommunicationUser } from '@/hooks/use-communication';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';

interface CommunicationCenterProps {
  userId: number;
  hideHeader?: boolean;
}

export function CommunicationCenterFixed({ userId, hideHeader = false }: CommunicationCenterProps) {
  const currentUserId = userId;
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("chats");
  const isMobile = useIsMobile();
  const [messageInput, setMessageInput] = useState('');
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const { data: messages, isLoading: messagesLoading } = useGetMessages(activeChatUserId);

  // Filter conversations based on search query
  const filteredConversations = conversations?.filter(conversation => {
    if (!conversation || typeof conversation.username !== 'string') return false;
    const query = searchQuery?.toLowerCase() || '';
    return conversation.username.toLowerCase().includes(query);
  }) || [];

  // Filter contacts based on search query
  const filteredContacts = onlineUsers.filter(user => {
    const username = user?.username ?? "";
    return username.toLowerCase().includes(contactsSearchQuery.toLowerCase());
  });

  // Filter all users based on search query
  const filteredAllUsers = allUsers?.filter(user => {
    const username = user?.username ?? "";
    return username.toLowerCase().includes(contactsSearchQuery.toLowerCase());
  }) || [];

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

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatUserId) return;

    try {
      await sendMessage(activeChatUserId, messageInput, 'text');
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle starting a new conversation
  const handleStartConversation = (user: CommunicationUser) => {
    setActiveChatUserId(user.id);
    setActiveTab('chats');
    setShowUserSearch(false);
  };

  return (
    <Card className="h-full border-none shadow-none">
      <CardContent className="p-0 h-full">
        <div className="h-full flex flex-col">
          {!hideHeader && (
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-transparent">
                  <TabsTrigger value="chats" className="data-[state=active]:bg-background">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chats
                  </TabsTrigger>
                  <TabsTrigger value="calls" className="data-[state=active]:bg-background">
                    <Phone className="h-4 w-4 mr-2" />
                    Calls
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="data-[state=active]:bg-background">
                    <Users className="h-4 w-4 mr-2" />
                    Contacts
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          
          <div className="flex-1 flex">
            {/* Sidebar */}
            <div className={`border-r bg-background/50 ${isMobile && activeChatUserId ? 'hidden' : 'w-80'} flex flex-col`}>
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
                        className={`p-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                          activeChatUserId === conversation.userId ? 'bg-accent' : ''
                        }`}
                        onClick={() => setActiveChatUserId(conversation.userId)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.username}`} />
                            <AvatarFallback>{getInitials(conversation)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{conversation.username}</p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
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
            <div className="flex-1 flex flex-col">
              {activeChatUserId ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b flex items-center justify-between">
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
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startCall(activeChatUserId, 'audio')}
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
                              size="sm"
                              onClick={() => startCall(activeChatUserId, 'video')}
                            >
                              <Video className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Video call</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Messages */}
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
                                {formatDistanceToNow(new Date(message.createdAt))} ago
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
                  <form onSubmit={handleSendMessage} className="p-4 border-t">
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
                value={contactsSearchQuery}
                onChange={(e) => setContactsSearchQuery(e.target.value)}
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
                  <p>{contactsSearchQuery ? 'No users found matching your search.' : 'No other users found.'}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Export alias for backward compatibility
export const CommunicationCenter = CommunicationCenterFixed;