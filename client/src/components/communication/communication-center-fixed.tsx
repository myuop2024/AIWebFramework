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
  Download, Clock
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
  const { data: allUsers, isLoading: allUsersLoading } = useQuery<CommunicationUser[]>({ // Added type for clarity
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
  const filteredConversations = conversations?.filter(conversation => {
    // Ensure conversation and username exist before attempting to use them
    if (!conversation || typeof conversation.username !== 'string') return false;
    const query = searchQuery?.toLowerCase() || ''; // searchQuery can be null/undefined, provide default
    return conversation.username.toLowerCase().includes(query);
  }) || [];

  // Filter contacts based on search query
  // This is the likely location of the original error if user.username is undefined
  const filteredContacts = onlineUsers.filter(user => {
    // FIX: Use nullish coalescing to provide a default empty string if username is undefined or null
    // This prevents calling .toLowerCase() on undefined.
    const username = user?.username ?? "";
    // contactsSearchQuery is initialized as '', so .toLowerCase() is safe on it.
    return username.toLowerCase().includes(contactsSearchQuery.toLowerCase());
  });

  // Filter all users based on search query
  const filteredAllUsers = allUsers?.filter(user => {
    // FIX: Ensure user.username is treated as a string before .toLowerCase()
    // and provide a default for the whole expression if allUsers is not yet available.
    const username = user?.username ?? "";
    // contactsSearchQuery is initialized as '', so .toLowerCase() is safe on it.
    return username.toLowerCase().includes(contactsSearchQuery.toLowerCase());
  }) || []; // Ensure filteredAllUsers is an empty array if allUsers is undefined (e.g., during loading)

  // State for media viewer modal
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [viewedMedia, setViewedMedia] = useState<{
    type: 'image' | 'file';
    content: string;
    fileData?: { name: string; size: number; type: string };
  } | null>(null);

  // Open media viewer
  const openMediaViewer = (message: Message) => {
    if (message.type === 'image') {
      setViewedMedia({
        type: 'image',
        content: message.content
      });
      setIsMediaViewerOpen(true);
    } else if (message.type === 'file') {
      try {
        const fileData = JSON.parse(message.content);
        setViewedMedia({
          type: 'file',
          content: message.content,
          fileData
        });
        setIsMediaViewerOpen(true);
      } catch (e) {
        console.error('Failed to parse file data', e);
      }
    }
  };

  // Format file size with appropriate units
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
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
              className="max-w-[200px] max-h-[200px] rounded-md object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openMediaViewer(message)}
            />
          </div>
        );
      case 'file':
        try {
          const fileData = JSON.parse(message.content);
          return (
            <div
              className="mt-2 flex items-center gap-2 p-2 bg-secondary rounded-md cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => openMediaViewer(message)}
            >
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
    if (!username || typeof username !== 'string') return 'UN'; // Check type for safety
    return username.substring(0, 2).toUpperCase();
  };

    const getInitialsFullName = (firstName?: string, lastName?: string): string => {
        if (!firstName || !lastName) {
            return "UN";
        }
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

  // Format message time
  const formatMessageTime = (date: Date | string) => { // Allow string for flexibility if API returns string dates
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Get user by ID
  const getUserById = (id: number): CommunicationUser | undefined => {
    if (typeof id !== 'number') return undefined; // Basic type check

    const onlineUser = onlineUsers.find(user => user.id === id);
    if (onlineUser) return onlineUser;

    const conversation = conversations?.find(conv => conv.userId === id);
    if (conversation) {
      return {
        id: conversation.userId,
        username: conversation.username, // Assuming username exists and is string from conversation type
        status: 'offline' ,// This user is from conversations, likely offline if not in onlineUsers
           firstName: conversation.firstName,
            lastName: conversation.lastName
      };
    }

    const allUser = allUsers?.find(user => user.id === id);
    if (allUser) {
      return { // Construct a CommunicationUser object
        id: allUser.id,
        username: allUser.username, // Assuming username exists from API type
        status: allUser.status || 'offline', // Ensure status is present
          firstName: allUser.firstName,
          lastName: allUser.lastName
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
    setContactsSearchQuery(''); // Clear search query after selecting a user
  };

  // Reset active chat if conversation not found or user becomes invalid
  useEffect(() => {
    if (activeChatUserId) {
      const userExistsInConversations = conversations?.some(c => c.userId === activeChatUserId);
      const userExistsInOnline = onlineUsers.some(u => u.id === activeChatUserId);
      const userExistsInAllUsers = allUsers?.some(u => u.id === activeChatUserId);

      if (!userExistsInConversations && !userExistsInOnline && !userExistsInAllUsers) {
        // If user is not found anywhere, reset active chat
        // This logic might need adjustment based on how users are populated/removed
        // For now, we only reset if not in current conversations list
        if (!userExistsInConversations && conversations && conversations.length > 0) {
             // setActiveChatUserId(null); // Commented out to prevent losing chat if user briefly disconnects
        }
      }
    }
  }, [conversations, onlineUsers, allUsers, activeChatUserId]);


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

          <div className="flex h-full overflow-hidden"> {/* Main flex container for sidebars and chat area */}
            {/* Chats Tab Content (Left Sidebar) */}
            <TabsContent value="chats" className="mt-0 w-full md:w-72 h-full border-r flex flex-col data-[state=inactive]:hidden">
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
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors mb-1 ${activeChatUserId === conversation.userId
                            ? 'bg-secondary'
                            : 'hover:bg-secondary/50'
                          }`}
                        onClick={() => setActiveChatUserId(conversation.userId)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.profileImage || `/api/users/${conversation.userId}/profile-image`} />
                          <AvatarFallback>{getInitials(conversation.firstName && conversation.lastName ? 
                            `${conversation.firstName} ${conversation.lastName}` : conversation.username)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-start">
                            <p className="font-medium truncate">{conversation.firstName && conversation.lastName ? 
                              `${conversation.firstName} ${conversation.lastName}` : conversation.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                addSuffix: false,
                                includeSeconds: true // Consider removing for brevity if too frequent
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
                        Start a new chat from Contacts or by searching users.
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  className="w-full flex items-center"
                  onClick={() => { setShowUserSearch(true); setContactsSearchQuery(''); }} // Clear search for new conversation
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            </TabsContent>

            {/* Contacts Tab Content (Left Sidebar) */}
            <TabsContent value="contacts" className="mt-0 w-full md:w-72 h-full border-r flex flex-col data-[state=inactive]:hidden">
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
                {onlineUsers.length === 0 && !contactsSearchQuery ? (
                    <div className="flex justify-center items-center h-32">
                         <p className="text-sm text-muted-foreground">No contacts available</p>
                    </div>
                ) : filteredContacts.length > 0 ? (
                  <div className="px-2">
                    {/* Online Users */}
                    {filteredContacts.filter(user => user.status === 'online').length > 0 && (
                        <p className="text-xs font-medium px-2 pt-2 pb-1 text-muted-foreground">Online</p>
                    )}
                    {filteredContacts.filter(user => user.status === 'online').map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-secondary/50"
                        onClick={() => startChat(user.id)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.profileImage || `/api/users/${user.id}/profile-image`} />
                             <AvatarFallback>{getInitialsFullName(user.firstName, user.lastName)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            user.status === 'online' ? 'bg-green-500' : 
                            user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.status === 'online' ? 'Active now' :
                              user.status === 'away' ? 'Away' : 'Offline'}
                          </p>
                          {user.role && (
                            <Badge variant="outline" className="text-xs mt-1 py-0 h-5">
                              {user.role}
                            </Badge>
                          )}
                          {user.parish && (
                            <Badge variant="secondary" className="text-xs mt-1 ml-1 py-0 h-5">
                              {user.parish}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Offline Users */}
                    {filteredContacts.filter(user => user.status !== 'online').length > 0 && (
                        <p className="text-xs font-medium px-2 pt-4 pb-1 text-muted-foreground">Offline</p>
                    )}
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

            {/* Chat Area (Main Content) */}
            <div className="flex-grow flex flex-col h-full">
              {activeChatUserId && activeChatUser ? (
                <>
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={activeChatUser.profileImage || `/api/users/${activeChatUser.id}/profile-image`} />
                          <AvatarFallback>{getInitials(activeChatUser.firstName && activeChatUser.lastName ? 
                            `${activeChatUser.firstName} ${activeChatUser.lastName}` : activeChatUser.username)}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          activeChatUser.status === 'online' ? 'bg-green-500' : 
                          activeChatUser.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{activeChatUser.firstName && activeChatUser.lastName ? 
                              `${activeChatUser.firstName} ${activeChatUser.lastName}` : activeChatUser.username}</p>
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
                    className={`flex-grow overflow-y-auto p-4 ${isDraggingFile ? 'bg-primary-50' : ''}`} // Ensure primary-50 is defined in Tailwind config or use a default like bg-blue-50
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
                          const prevMessage = messages[index - 1];
                          const showAvatar = index === 0 ||
                            (prevMessage && prevMessage.senderId !== message.senderId) ||
                            (prevMessage && new Date(message.sentAt).getTime() - new Date(prevMessage.sentAt).getTime() > 120000);

                          return (
                            <div
                              key={message.id}
                              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[75%]`}>
                                {!isCurrentUser && showAvatar && activeChatUser && ( // Added activeChatUser check
                                  <Avatar className="h-8 w-8 mr-0 self-end mb-1"> {/* Adjusted margin for alignment */}
                                    <AvatarImage src={activeChatUser.profileImage || `/api/users/${activeChatUser.id}/profile-image`} />
                                    <AvatarFallback>{getInitials(activeChatUser.username)}</AvatarFallback>
                                  </Avatar>
                                )}
                                 {isCurrentUser && showAvatar && (
                                     <div className="w-8 h-8 ml-0 self-end mb-1"></div> // Placeholder for alignment
                                 )}
                                 {!showAvatar && ( // Add placeholder for consistent spacing when avatar is not shown
                                    <div className={`w-8 ${isCurrentUser ? 'ml-2' : 'mr-2'}`}></div>
                                 )}


                                <div>
                                  <div
                                    className={`rounded-lg p-3 ${isCurrentUser
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary'
                                      }`}
                                  >
                                    {renderMessageContent(message)}
                                  </div>
                                  <div
                                    className={`text-xs text-muted-foreground mt-1 ${isCurrentUser ? 'text-right' : 'text-left'
                                      }`}
                                  >
                                    {formatMessageTime(message.sentAt)}
                                    {isCurrentUser && message.read && (
                                      <span className="ml-1">✓</span>
                                    )}
                                  </div>
                                </div>
                                {/* Current user avatar placeholder removed, handled by spacing div or actual avatar */}
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
                        {activeChatUser && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Start a conversation with {activeChatUser.username}
                            </p>
                        )}
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
                        multiple={false} // Explicitly single file
                        accept="image/*,application/pdf,.doc,.docx,.txt,.zip" // Example file types
                      />
                      <Input
                        placeholder={`Message ${activeChatUser?.username || 'selected user'}...`}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pr-32" // Increased padding for more buttons
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => fileInputRef.current?.click()}
                                    >
                                      <Paperclip className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Attach file</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {/* Removed duplicate Image button, Paperclip can handle all files */}
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
                    </div>                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-4">
                  <div className="bg-secondary rounded-full p-6 mb-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Your messages</h3>
                  <p className="text-muted-foreground text-center max-w-xs">
                    Select a conversation to view your messages, or start a new one.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => { setShowUserSearch(true); setContactsSearchQuery(''); }}
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

      {/* Media Viewer Modal */}
      <Dialog open={isMediaViewerOpen} onOpenChange={setIsMediaViewerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {viewedMedia?.type === 'image' ? 'Image' :
                viewedMedia?.fileData?.name || 'File'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center">
            {viewedMedia?.type === 'image' ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={viewedMedia.content}
                  alt="Full-size image"
                  className="max-w-full max-h-[70vh] object-contain rounded-md"
                />
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewedMedia.content;
                    link.download = 'image-' + Date.now() + '.jpg';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
                </Button>
              </div>
            ) : viewedMedia?.fileData ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="bg-secondary p-8 rounded-lg flex flex-col items-center">
                  <Paperclip className="h-16 w-16 mb-4 text-primary" />
                  <h3 className="text-lg font-medium mb-2">{viewedMedia.fileData.name}</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <p className="text-muted-foreground">File size:</p>
                    <p className="font-medium">{formatFileSize(viewedMedia.fileData.size)}</p>

                    <p className="text-muted-foreground">File type:</p>
                    <p className="font-medium">{viewedMedia.fileData.type}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    // In a real implementation, you would have a download URL
                    // For now, we'll just demonstrate the UI
                    alert('Download functionality would be implemented here');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>
            ) : (
              <p>File information not available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming call dialog */}
      <Dialog open={!!incomingCall && !isCallModalOpen} onOpenChange={(isOpen) => { if (!isOpen && incomingCall) rejectCall(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incoming Call</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${getUserById(incomingCall?.callerId || 0)?.username || incomingCall?.callerId || 'default'
                }`} />
              <AvatarFallback>
                {getInitials(getUserById(incomingCall?.callerId || 0)?.username)}
              </AvatarFallback>
            </Avatar>
            <p className="text-xl font-semibold mb-1">
              {getUserById(incomingCall?.callerId || 0)?.username || `User ${incomingCall?.callerId || 'Unknown'}`}
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              {incomingCall?.type === 'video' ? 'Video call' : 'Audio call'}
            </p>
            <div className="flex gap-4">
              <Button
                variant="destructive"
                size="lg" // Made buttons larger
                className="rounded-full px-6 py-3"
                onClick={() => rejectCall()}
              >
                <X className="h-5 w-5 mr-2" /> Decline
              </Button>
              <Button
                variant="default"
                size="lg" // Made buttons larger
                className="rounded-full bg-green-500 hover:bg-green-600 px-6 py-3"
                onClick={handleAnswerCall}
              >
                <Phone className="h-5 w-5 mr-2" /> Accept
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
        <DialogContent className="sm:max-w-lg"> {/* Made dialog slightly wider for video */}
          <DialogHeader>
            <DialogTitle>
              {activeCall?.type === 'video' ? 'Video Call' : 'Audio Call'} with {getUserById(activeCall?.receiverId || activeCall?.callerId || 0)?.username || 'User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {activeCall?.type === 'video' && remoteStream && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
              {/* Placeholder when video/remote stream is not available */}
              {(!remoteStream || activeCall?.type !== 'video') && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <Avatar className="h-24 w-24"> {/* Larger avatar */}
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${getUserById(activeCall?.receiverId || activeCall?.callerId || 0)?.username || ''
                        }`}
                    />
                    <AvatarFallback className="text-3xl">
                      {getInitials(getUserById(activeCall?.receiverId || activeCall?.callerId || 0)?.username)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              {activeCall?.type === 'video' && localStream && (
                <div className="absolute bottom-2 right-2 w-1/4 max-w-[120px] aspect-video bg-black rounded-lg overflow-hidden border-2 border-background">
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
                className={`h-12 w-12 rounded-full ${isMuted ? 'bg-destructive hover:bg-destructive/80 text-white' : ''}`}
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
              {activeCall?.type === 'video' && (
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-12 w-12 rounded-full ${!isVideoEnabled ? 'bg-destructive hover:bg-destructive/80 text-white' : ''}`}
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
                </Button>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => {
                  endCall();
                  setIsCallModalOpen(false);
                }}
              >
                <Phone className="h-6 w-6 transform rotate-[135deg]" /> {/* Rotated for hang up icon */}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User search dialog */}
      <Dialog open={showUserSearch} onOpenChange={(isOpen) => {
        setShowUserSearch(isOpen);
        if (!isOpen) setContactsSearchQuery(''); // Clear search on close
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative px-1">
              <Input
                placeholder="Search for a user..."
                value={contactsSearchQuery}
                onChange={(e) => setContactsSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="h-4 w-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
            <ScrollArea className="max-h-[300px] px-1"> {/* Added ScrollArea */}
              {allUsersLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Spinner />
                </div>
              ) : filteredAllUsers && filteredAllUsers.length > 0 ? (
                <div className="space-y-1">
                  {filteredAllUsers.filter(user => user.id !== userId).map((user) => ( // Exclude self
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
                            <AvatarImage src={user.profileImage || `/api/users/${user.id}/profile-image`} />
                             <AvatarFallback>{getInitialsFullName(user.firstName, user.lastName)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            user.status === 'online' ? 'bg-green-500' : 
                            user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</p>
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
                  <p className="text-muted-foreground">
                    {contactsSearchQuery ? 'No users found matching your search.' : 'No other users found.'}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}