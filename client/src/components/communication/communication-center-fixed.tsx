import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Separator } from '@/components/ui/separator'; // Not used in the final version
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow, parseISO } from 'date-fns'; // Added parseISO for robust date handling
import {
  MessageSquare, Phone, Video, Send, Paperclip, Image as ImageIcon, // Renamed Image to ImageIcon to avoid conflict
  User, UserPlus, Users, X, Volume2, VolumeX, Camera, CameraOff, Search,
  Download, Check, CheckCheck // Added Check, CheckCheck for read receipts
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCommunication, type Message, type User as CommunicationUser, type Conversation } from '@/hooks/use-communication'; // Adjusted imports
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner'; // Assuming Spinner is a valid component

interface CommunicationCenterProps {
  userId: number;
  hideHeader?: boolean; // Optional prop to hide the header tabs
}

// Main component for the Communication Center
export default function CommunicationCenter({ userId, hideHeader = false }: CommunicationCenterProps) {
  // State for the current logged-in user's ID
  const currentUserId = userId;
  // State for the currently active chat (user ID of the other person)
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
  // State for the message input field
  const [messageInput, setMessageInput] = useState('');
  // State for managing the visibility of the call modal
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  // State to indicate if a file is being dragged over the chat area
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  // State for local audio mute status in a call
  const [isMuted, setIsMuted] = useState(false);
  // State for local video enabled status in a call
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  // State for search query in the conversations list
  const [searchQuery, setSearchQuery] = useState('');
  // State for search query in the contacts list and new conversation dialog
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');
  // State for managing the visibility of the new conversation/user search dialog
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Refs for various DOM elements
  const messageEndRef = useRef<HTMLDivElement>(null); // For scrolling to the latest message
  const fileInputRef = useRef<HTMLInputElement>(null); // For the file input
  const localVideoRef = useRef<HTMLVideoElement>(null); // For the local video stream in a call
  const remoteVideoRef = useRef<HTMLVideoElement>(null); // For the remote video stream in a call

  // Destructuring values and functions from the useCommunication custom hook
  const {
    conversations,          // List of current user's conversations
    conversationsLoading,   // Loading state for conversations
    onlineUsers,            // List of users currently online (real-time from WebSocket)
    useGetMessages,         // Hook to fetch messages for a specific chat
    sendMessage,            // Function to send a message
    markAllAsRead,          // Function to mark all messages from a user as read
    startCall,              // Function to initiate a call
    answerCall,             // Function to answer an incoming call
    rejectCall,             // Function to reject an incoming call
    endCall,                // Function to end an active call
    activeCall,             // Information about the current active call
    incomingCall,           // Information about an incoming call
    localStream,            // Local media stream (audio/video)
    remoteStream,           // Remote media stream (audio/video)
    isSocketConnected,      // Boolean indicating WebSocket connection status
  } = useCommunication(currentUserId); // Initialize hook with the current user's ID

  // Fetch all users from the API for site-wide search (e.g., in "New Conversation" dialog)
  // This provides basic user info; real-time status is primarily derived from `onlineUsers` state from the hook.
  const { data: allUsersFromApi, isLoading: allUsersLoading } = useQuery<CommunicationUser[]>({
    queryKey: ['/api/communications/online-users'], // React Query key for caching
    queryFn: async () => {
      const response = await fetch('/api/communications/online-users');
      if (!response.ok) throw new Error('Failed to fetch all users from API');
      return response.json();
    },
    staleTime: 60000, // Cache data for 1 minute, as WebSocket `USERS_LIST` provides more frequent updates for status
    refetchOnWindowFocus: false, // Less frequent refetching as WebSocket handles real-time status updates
  });

  // Fetch messages for the currently active chat
  const { data: messages, isLoading: messagesLoading } =
    useGetMessages(activeChatUserId); // `useGetMessages` is from `useCommunication` hook

  // Callback function to get user details by ID.
  // It prioritizes sources for the most up-to-date information, especially online status.
  const getUserById = useCallback((id: number | null | undefined): CommunicationUser | undefined => {
    if (typeof id !== 'number') return undefined; // Ensure ID is a number

    // 1. Prioritize `onlineUsers` from the hook (most up-to-date status from WebSockets)
    const onlineUserFromHook = onlineUsers.find(user => user.id === id);
    if (onlineUserFromHook) {
      return onlineUserFromHook; // This object should have the most accurate 'status'
    }

    // 2. Check `conversations` list (might have user details, but status could be stale if user just went offline)
    const conversationUser = conversations?.find(conv => conv.userId === id);
    if (conversationUser) {
      return { // Construct a CommunicationUser object
        id: conversationUser.userId,
        username: conversationUser.username,
        status: 'offline', // Assume offline if not found in the real-time `onlineUsers` list
        firstName: conversationUser.firstName,
        lastName: conversationUser.lastName,
        profileImage: conversationUser.profileImage,
        // role and parish might also be available on conversationUser if API provides them
      };
    }

    // 3. Check `allUsersFromApi` (initial fetch, status is a snapshot and might be less real-time)
    const userFromApi = allUsersFromApi?.find(user => user.id === id);
    if (userFromApi) {
      // The status from `allUsersFromApi` is based on the last API fetch,
      // which itself checks the backend's communication service.
      return userFromApi;
    }
    return undefined; // User not found in any source
  }, [onlineUsers, conversations, allUsersFromApi]); // Dependencies for the useCallback

  // Get the full user object for the currently active chat partner
  const activeChatUser = activeChatUserId ? getUserById(activeChatUserId) : undefined;

  // Filter conversations based on the search query in the "Chats" tab
  const filteredConversations = conversations?.filter(conversation => {
    const query = searchQuery?.toLowerCase() || '';
    // Search by full name (if available) or username
    const userName = (conversation.firstName && conversation.lastName)
        ? `${conversation.firstName} ${conversation.lastName}`.toLowerCase()
        : conversation.username?.toLowerCase() || '';
    return userName.includes(query);
  }) || []; // Default to an empty array if conversations is undefined

  // Filter ALL users from the API for the "New Conversation" dialog
  // Excludes the current user and enriches with real-time status if available.
  const filteredAllUsersForSearchDialog = allUsersFromApi?.filter(user => {
    if (user.id === currentUserId) return false; // Exclude self from search results
    const query = contactsSearchQuery?.toLowerCase() || '';
    const userName = (user.firstName && user.lastName)
        ? `${user.firstName} ${user.lastName}`.toLowerCase()
        : user.username?.toLowerCase() || '';
    return userName.includes(query);
  }).map(user => { // Enrich with real-time status from `onlineUsers` if available
      const onlineUser = onlineUsers.find(ou => ou.id === user.id);
      return onlineUser ? onlineUser : user; // Prefer the `onlineUser` object if found, as it has live status
  }) || [];

  // Filter ONLINE users for the "Contacts" tab.
  // This list is derived directly from `onlineUsers` (real-time WebSocket data).
  const filteredOnlineContacts = onlineUsers.filter(user => {
    if (user.id === currentUserId) return false; // Exclude self from contacts list
    const query = contactsSearchQuery?.toLowerCase() || '';
     const userName = (user.firstName && user.lastName)
        ? `${user.firstName} ${user.lastName}`.toLowerCase()
        : user.username?.toLowerCase() || '';
    return userName.includes(query);
  });

  // State for the media viewer modal (for images and files)
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [viewedMedia, setViewedMedia] = useState<{
    type: 'image' | 'file';
    content: string; // For image src, or stringified file data
    fileData?: { name: string; size: number; type: string; url?: string }; // `url` for actual download
  } | null>(null);

  // Function to open the media viewer modal
  const openMediaViewer = (message: Message) => {
    if (message.type === 'image') {
      setViewedMedia({ type: 'image', content: message.content });
      setIsMediaViewerOpen(true);
    } else if (message.type === 'file') {
      try {
        // Assuming message.content for 'file' type is a JSON string: { name, size, type, url }
        const fileData = JSON.parse(message.content);
        setViewedMedia({ type: 'file', content: message.content, fileData });
        setIsMediaViewerOpen(true);
      } catch (e) {
        console.error('Failed to parse file data for viewer:', e, message.content);
        // Fallback if parsing fails
        setViewedMedia({ type: 'file', content: "Error displaying file info.", fileData: { name: "Invalid File Data", size: 0, type: "" } });
        setIsMediaViewerOpen(true);
      }
    }
  };

  // Helper function to format file size into readable units
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    // Add more units like MB, GB if necessary
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Function to render message content based on its type (text, image, file, system)
  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'image':
        return (
          <div className="mt-1"> {/* Small top margin for image messages */}
            <img
              src={message.content} // Assuming content is base64 data URL or a direct image URL
              alt="Shared image"
              className="max-w-[250px] max-h-[250px] rounded-md object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openMediaViewer(message)}
              // Fallback image if the source fails to load
              onError={(e) => (e.currentTarget.src = 'https://placehold.co/200x200/ccc/666?text=Image+Error')}
            />
          </div>
        );
      case 'file':
        try {
          // Expect file content to be a JSON string with { name, size, type, url (optional) }
          const fileData = JSON.parse(message.content);
          return (
            <div
              className="mt-1 flex items-center gap-2 p-2.5 bg-background dark:bg-slate-700 rounded-md cursor-pointer hover:bg-muted dark:hover:bg-slate-600 transition-colors"
              onClick={() => openMediaViewer(message)}
            >
              <Paperclip className="h-5 w-5 text-primary shrink-0" /> {/* File icon */}
              <div className="overflow-hidden"> {/* Container to handle text overflow */}
                <p className="text-sm font-medium truncate">{fileData.name || 'Attached File'}</p>
                <p className="text-xs text-muted-foreground">
                  {fileData.size ? formatFileSize(fileData.size) : 'Size unknown'}
                </p>
              </div>
            </div>
          );
        } catch (e) {
          // Fallback if JSON parsing fails or content is not as expected
          return <p className="text-sm text-red-500">Error displaying file: Invalid format.</p>;
        }
      case 'system': // For system messages (e.g., "User X joined the call")
        return <p className="text-xs italic text-muted-foreground px-2 py-1">{message.content}</p>;
      default: // 'text' messages
        return <p className="whitespace-pre-wrap break-words">{message.content}</p>; // Allows line breaks and wraps long words
    }
  };

  // Effect to scroll to the bottom of the message list when new messages arrive
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]); // Dependency: re-run when `messages` array changes

  // Effect to mark messages as read when a chat is opened/active
  useEffect(() => {
    if (activeChatUserId && messages?.length) {
      // Filter for unread messages sent by the active chat partner to the current user
      const unreadMessagesFromSender = messages.filter(m =>
        m.senderId === activeChatUserId && m.receiverId === currentUserId && !m.read
      );
      if (unreadMessagesFromSender.length > 0) {
        console.log(`[CommCenter] Marking all ${unreadMessagesFromSender.length} messages from ${activeChatUserId} as read.`);
        markAllAsRead(activeChatUserId); // API call to mark messages as read; backend should notify sender
      }
    }
  }, [activeChatUserId, messages, markAllAsRead, currentUserId]); // Dependencies

  // Effect to set up local and remote video streams in the call modal
  useEffect(() => {
    if (localStream && localVideoRef.current) localVideoRef.current.srcObject = localStream;
    if (remoteStream && remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [localStream, remoteStream]); // Dependencies: re-run when streams change

  // Event handlers for drag-and-drop file uploads
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(true); };
  const handleDragLeave = () => setIsDraggingFile(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && activeChatUserId) {
      await handleFileUpload(e.dataTransfer.files[0]); // Process the first dropped file
    }
  };

  // Event handler for file selection via the input element
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeChatUserId) {
      await handleFileUpload(e.target.files[0]); // Process the selected file
      if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input to allow selecting the same file again
    }
  };

  // Function to process and send/upload a file
  const handleFileUpload = async (file: File) => {
    if (!activeChatUserId) return; // Ensure a chat is active

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // Example: 5MB limit
    if (file.size > MAX_FILE_SIZE) {
        alert(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
        return;
    }

    try {
      if (file.type.startsWith('image/')) { // Handle image files
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result && typeof e.target.result === 'string') {
            sendMessage(activeChatUserId, e.target.result, 'image'); // Send base64 data URL as content
          }
        };
        reader.readAsDataURL(file);
      } else { // Handle other file types
        // In a production app, you would upload the `file` to a server/storage,
        // get a downloadable URL, and then send that URL along with file metadata.
        // For this example, we send file metadata as a JSON string.
        // The backend/receiver would need to handle this (e.g., provide a download link if a URL was included).
        const fileInfo = {
            name: file.name,
            size: file.size,
            type: file.type,
            url: "#" // Placeholder: In a real app, this would be the actual download URL after upload.
        };
        sendMessage(activeChatUserId, JSON.stringify(fileInfo), 'file');
      }
    } catch (error) {
      console.error('Error processing file for sending:', error);
      alert('Error processing file. Please try again.');
    }
  };

  // Handler for sending a text message
  const handleSendMessage = () => {
    if (messageInput.trim() && activeChatUserId) {
      sendMessage(activeChatUserId, messageInput.trim()); // Send the trimmed message
      setMessageInput(''); // Clear the input field
    }
  };

  // Handler for Enter key press in the message input to send message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for new line
      e.preventDefault(); // Prevent default Enter behavior (e.g., new line in textarea)
      handleSendMessage();
    }
  };

  // Handler to initiate a call (audio or video)
  const handleStartCall = async (callType: 'audio' | 'video') => {
    if (!activeChatUserId) return;
    const callUser = getUserById(activeChatUserId); // Get details of the user to call
    if (callUser?.status !== 'online') { // Check if the user is online
        alert(`${callUser?.username || 'User'} is not online and cannot be called.`);
        return;
    }
    const callResult = await startCall(activeChatUserId, callType); // `startCall` is from `useCommunication`
    if (callResult) setIsCallModalOpen(true); // Open call modal on success
  };

  // Handler to answer an incoming call
  const handleAnswerCall = async () => {
    const callResult = await answerCall(); // `answerCall` is from `useCommunication`
    if (callResult) setIsCallModalOpen(true); // Open call modal
  };

  // Toggle local audio mute state
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsMuted(!isMuted);
    }
  };

  // Toggle local video enabled state
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Helper to get user initials for avatars
  const getInitials = (firstName?: string, lastName?: string, username?: string): string => {
    if (firstName && lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    if (firstName) return `${firstName.substring(0, Math.min(firstName.length, 2))}`.toUpperCase(); // Use Math.min for short first names
    if (username) return username.substring(0, Math.min(username.length, 2)).toUpperCase();
    return '??'; // Default fallback
  };

  // Helper to format message timestamps (e.g., "2 minutes ago")
  const formatTimestamp = (dateInput: Date | string | undefined): string => {
    if (!dateInput) return '';
    try {
      // Parse date string to Date object if necessary
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date for message timestamp:", dateInput, e);
      return "Invalid date";
    }
  };

  // Helper to format timestamps for conversation list (e.g., "5m")
  const formatConversationTimestamp = (dateInput: Date | string | undefined): string => {
    if (!dateInput) return '';
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      // More concise format for conversation list
      return formatDistanceToNow(date, { addSuffix: false });
    } catch (e) {
      console.error("Error formatting date for conversation list:", dateInput, e);
      return "Invalid date";
    }
  };

  // Function to start a chat with a selected user
  const startChatWithUser = (userToChat: CommunicationUser) => {
    setActiveChatUserId(userToChat.id); // Set the active chat
    // Attempt to switch to the "chats" tab if it's not already active
    const chatsTabTrigger = document.querySelector('button[role="tab"][value="chats"]') as HTMLButtonElement | null;
    if (chatsTabTrigger && chatsTabTrigger.getAttribute('data-state') !== 'active') {
        chatsTabTrigger.click();
    }
    setShowUserSearch(false); // Close the "New Conversation" dialog
    setContactsSearchQuery(''); // Clear the search query from the dialog
  };

  // Conditional rendering for WebSocket connection issues (optional, can be a small indicator)
  // if (!isSocketConnected && !conversationsLoading) {
  //   // This is an example of a more prominent disconnection message.
  //   // You might prefer a smaller, less intrusive indicator.
  // }

  // Main JSX for the CommunicationCenter component
  return (
    <TooltipProvider> {/* Provides context for all tooltips within */}
      <Card className="h-full w-full flex flex-col border-none shadow-none bg-transparent">
        <CardContent className="p-0 h-full flex flex-col overflow-hidden"> {/* Ensure CardContent allows flex layout */}
          <Tabs defaultValue="chats" className="h-full flex flex-col">
            {!hideHeader && ( // Conditionally render header with tabs
              <div className="border-b px-4">
                <TabsList className="justify-start bg-transparent border-none p-0">
                  <TabsTrigger value="chats" className="py-3 text-sm data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
                    <MessageSquare className="h-4 w-4 mr-2" /> Chats
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="py-3 text-sm data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
                    <Users className="h-4 w-4 mr-2" /> Contacts
                  </TabsTrigger>
                </TabsList>
              </div>
            )}

            <div className="flex flex-1 overflow-hidden"> {/* Main flex container for sidebar and chat area */}
              {/* Sidebar for Chats & Contacts */}
              {/* Sidebar is hidden on mobile (md breakpoint) when a chat is active */}
              <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col bg-background dark:bg-slate-800 ${activeChatUserId && 'hidden md:flex'}`}>
                {/* Chats Tab Content */}
                <TabsContent value="chats" className="mt-0 h-full flex flex-col">
                  <div className="p-3"> {/* Search input for conversations */}
                    <div className="relative">
                      <Input
                        placeholder="Search conversations..."
                        className="border bg-muted text-sm pl-9 rounded-full h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <ScrollArea className="flex-grow"> {/* Scrollable area for conversation list */}
                    {conversationsLoading ? (
                      <div className="flex justify-center items-center h-32"><Spinner /></div>
                    ) : filteredConversations.length > 0 ? (
                      <div className="px-2 space-y-1">
                        {filteredConversations.map((conv) => {
                          const userForConv = getUserById(conv.userId); // Get enriched user info for display
                          return (
                            <div
                              key={conv.userId}
                              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${activeChatUserId === conv.userId ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-muted dark:hover:bg-slate-700'}`}
                              onClick={() => setActiveChatUserId(conv.userId)}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={userForConv?.profileImage || `https://avatar.vercel.sh/${userForConv?.username || conv.userId}.png?size=100`} />
                                <AvatarFallback>{getInitials(userForConv?.firstName, userForConv?.lastName, userForConv?.username)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-center">
                                  <p className="font-semibold truncate text-sm">
                                    {userForConv?.firstName && userForConv?.lastName ? `${userForConv.firstName} ${userForConv.lastName}` : userForConv?.username || 'Unknown User'}
                                  </p>
                                  <p className="text-xs text-muted-foreground shrink-0 ml-2">
                                    {formatConversationTimestamp(conv.lastMessageAt)}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground truncate">
                                    {conv.lastMessageType === 'image' ? '🖼️ Image' : conv.lastMessageType === 'file' ? '📎 File' : conv.lastMessage}
                                  </p>
                                  {conv.unreadCount > 0 && (
                                    <Badge /*variant="default_solid"*/ className="h-5 min-w-[20px] text-xs rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground">
                                      {conv.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10 px-4">
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ? 'No conversations match your search.' : 'No conversations yet.'}
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                  <div className="p-3 border-t mt-auto"> {/* "New Conversation" button at the bottom */}
                    <Button variant="outline" className="w-full" onClick={() => { setShowUserSearch(true); setContactsSearchQuery(''); }}>
                      <UserPlus className="h-4 w-4 mr-2" /> New Conversation
                    </Button>
                  </div>
                </TabsContent>

                {/* Contacts Tab Content */}
                <TabsContent value="contacts" className="mt-0 h-full flex flex-col">
                  <div className="p-3"> {/* Search input for contacts */}
                    <div className="relative">
                      <Input
                        placeholder="Search contacts..."
                        className="border bg-muted text-sm pl-9 rounded-full h-9"
                        value={contactsSearchQuery}
                        onChange={(e) => setContactsSearchQuery(e.target.value)}
                      />
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <ScrollArea className="flex-grow">
                    {/* `filteredOnlineContacts` uses `onlineUsers` from the hook for real-time status */}
                    {filteredOnlineContacts.length > 0 ? (
                      <div className="px-2 space-y-1">
                        <p className="text-xs font-medium px-2 pt-2 pb-1 text-muted-foreground">Online Contacts</p>
                        {filteredOnlineContacts.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-muted dark:hover:bg-slate-700"
                            onClick={() => startChatWithUser(user)} // Use dedicated function to start chat
                          >
                            <div className="relative"> {/* Container for avatar and status dot */}
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.profileImage || `https://avatar.vercel.sh/${user.username}.png?size=100`} />
                                <AvatarFallback>{getInitials(user.firstName, user.lastName, user.username)}</AvatarFallback>
                              </Avatar>
                              {/* Online status indicator dot */}
                              <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} title={user.status} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="font-semibold truncate text-sm">
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                       <div className="text-center py-10 px-4">
                        <p className="text-sm text-muted-foreground">
                          {contactsSearchQuery ? 'No contacts match your search.' : 'No online contacts found.'}
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </div>

              {/* Chat Area (Main Content) */}
              {/* Chat area is hidden on mobile if no chat is active, and takes full width if sidebar is hidden */}
              <div className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 ${!activeChatUserId && 'hidden md:flex'}`}>
                {activeChatUser ? ( // If a chat is active, render the chat interface
                  <>
                    {/* Chat Header */}
                    <div className="p-3 border-b flex items-center justify-between bg-background dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                         {/* Back button for mobile to close active chat and show sidebar */}
                         <Button variant="ghost" size="icon" className="md:hidden mr-1" onClick={() => setActiveChatUserId(null)}>
                            <X className="h-5 w-5" />
                        </Button>
                        <div className="relative"> {/* Active chat user's avatar and status */}
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={activeChatUser.profileImage || `https://avatar.vercel.sh/${activeChatUser.username}.png?size=100`} />
                            <AvatarFallback>{getInitials(activeChatUser.firstName, activeChatUser.lastName, activeChatUser.username)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${activeChatUser.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} title={activeChatUser.status} />
                        </div>
                        <div> {/* Active chat user's name and status text */}
                          <p className="font-semibold">
                            {activeChatUser.firstName && activeChatUser.lastName ? `${activeChatUser.firstName} ${activeChatUser.lastName}` : activeChatUser.username}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{activeChatUser.status}</p>
                        </div>
                      </div>
                      <div className="flex gap-1"> {/* Call buttons */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleStartCall('audio')} disabled={activeChatUser.status !== 'online' || !!activeCall || !!incomingCall}>
                              <Phone className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Audio Call</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleStartCall('video')} disabled={activeChatUser.status !== 'online' || !!activeCall || !!incomingCall}>
                              <Video className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Video Call</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Message Display Area */}
                    <div
                      className={`flex-grow overflow-y-auto p-4 space-y-2 ${isDraggingFile ? 'outline-dashed outline-2 outline-primary' : ''}`} // Highlight on drag over
                      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    >
                      {messagesLoading && !messages?.length ? ( // Show spinner only if loading and no messages are present yet
                        <div className="flex justify-center items-center h-full"><Spinner /></div>
                      ) : messages && messages.length > 0 ? (
                        messages.map((message, index) => {
                          const isCurrentUser = message.senderId === currentUserId;
                          const prevMessage = messages[index - 1];
                          const nextMessage = messages[index + 1]; // For message grouping

                          // Determine if avatar should be shown (for received messages, not grouped with previous)
                          const showAvatar = !isCurrentUser && (
                            index === 0 || // First message
                            prevMessage?.senderId !== message.senderId || // Different sender
                            new Date(message.sentAt).getTime() - new Date(prevMessage.sentAt).getTime() > 5 * 60000 // More than 5 mins gap
                          );

                          // Determine message bubble border radius for grouping effect
                          const isFirstInSenderGroup = index === 0 || prevMessage?.senderId !== message.senderId || new Date(message.sentAt).getTime() - new Date(prevMessage.sentAt).getTime() > 1 * 60000;
                          const isLastInSenderGroup = index === messages.length - 1 || nextMessage?.senderId !== message.senderId || new Date(nextMessage.sentAt).getTime() - new Date(message.sentAt).getTime() > 1 * 60000;

                          let borderRadiusClasses = "rounded-xl"; // Default full rounding
                          if(isCurrentUser) { // Sent messages
                            borderRadiusClasses = `${isFirstInSenderGroup ? 'rounded-tr-xl' : 'rounded-tr-md'} ${isLastInSenderGroup ? 'rounded-br-xl' : 'rounded-br-md'} rounded-l-xl`;
                          } else { // Received messages
                            borderRadiusClasses = `${isFirstInSenderGroup ? 'rounded-tl-xl' : 'rounded-tl-md'} ${isLastInSenderGroup ? 'rounded-bl-xl' : 'rounded-bl-md'} rounded-r-xl`;
                          }

                          return (
                            <div key={message.id || index} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-2' : 'mt-0.5'}`}>
                              <div className={`flex items-end gap-2 max-w-[75%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                {showAvatar && activeChatUser && ( // Show avatar for received messages if conditions met
                                  <Avatar className="h-8 w-8 self-end">
                                    <AvatarImage src={activeChatUser.profileImage || `https://avatar.vercel.sh/${activeChatUser.username}.png?size=64`} />
                                    <AvatarFallback>{getInitials(activeChatUser.firstName, activeChatUser.lastName, activeChatUser.username)}</AvatarFallback>
                                  </Avatar>
                                )}
                                {/* Spacer for alignment when avatar is not shown, or for sent messages */}
                                {(!showAvatar && !isCurrentUser) && <div className="w-8 shrink-0"></div>}

                                {/* Message bubble */}
                                <div className={`p-2.5 ${borderRadiusClasses} ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-background dark:bg-slate-700 shadow-sm'}`}>
                                  {renderMessageContent(message)}
                                  {/* Timestamp and read receipt */}
                                  <div className={`text-xs mt-1.5 flex items-center ${isCurrentUser ? 'justify-end text-primary-foreground/80' : 'justify-start text-muted-foreground'}`}>
                                    {formatTimestamp(message.sentAt)}
                                    {isCurrentUser && ( // Show read receipts for sent messages
                                        message.read ? <CheckCheck className="h-3.5 w-3.5 ml-1 text-blue-400" /> : <Check className="h-3.5 w-3.5 ml-1" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : ( // Placeholder if no messages in the chat
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">No messages yet.</p>
                          {activeChatUser && <p className="text-xs text-muted-foreground">Start the conversation with {activeChatUser.username}.</p>}
                        </div>
                      )}
                      <div ref={messageEndRef} /> {/* Element to scroll to */}
                    </div>

                    {/* Message Input Area */}
                    <div className="p-3 border-t bg-background dark:bg-slate-800">
                      <div className="relative flex items-center gap-2">
                        {/* Hidden file input, triggered by button */}
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileInputChange} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Attach File</TooltipContent>
                        </Tooltip>
                        <Input
                          placeholder="Type a message..."
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="flex-1 rounded-full pr-12 h-10" // Padding right for send button
                        />
                        {/* Send button positioned absolutely within the input's relative container */}
                        <Button variant="primary" size="icon" className="absolute right-3 top-1/2 transform -translate-y-1/2 rounded-full h-8 w-8" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : ( // Placeholder if no chat is active
                  <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                    <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Select a chat or start a new one</h3>
                    <p className="text-muted-foreground max-w-xs">Your conversations will appear here when you select them from the list.</p>
                    <Button className="mt-6" onClick={() => { setShowUserSearch(true); setContactsSearchQuery(''); }}>
                      <UserPlus className="h-4 w-4 mr-2" /> New Conversation
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Tabs>
        </CardContent>

        {/* Media Viewer Modal */}
        <Dialog open={isMediaViewerOpen} onOpenChange={setIsMediaViewerOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-4">
            <DialogHeader>
              <DialogTitle className="truncate">
                {viewedMedia?.type === 'image' ? 'Image Preview' : viewedMedia?.fileData?.name || 'File Preview'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-grow flex items-center justify-center overflow-auto py-4">
              {viewedMedia?.type === 'image' ? (
                <img src={viewedMedia.content} alt="Viewed media" className="max-w-full max-h-full object-contain rounded" />
              ) : viewedMedia?.fileData ? (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <Paperclip className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="font-semibold mb-1">{viewedMedia.fileData.name}</p>
                  <p className="text-sm text-muted-foreground mb-1">{formatFileSize(viewedMedia.fileData.size)}</p>
                  <p className="text-sm text-muted-foreground">{viewedMedia.fileData.type}</p>
                </div>
              ) : <p>Cannot preview this file.</p>}
            </div>
            {/* Show download button if it's an image or if the file has a valid (non-placeholder) URL */}
            { (viewedMedia?.type === 'image' || (viewedMedia?.fileData?.url && viewedMedia.fileData.url !== '#')) &&
                <Button
                    onClick={() => {
                        if (!viewedMedia) return;
                        const link = document.createElement('a');
                        link.href = viewedMedia.type === 'image' ? viewedMedia.content : viewedMedia.fileData?.url || '#';
                        link.download = viewedMedia.type === 'image' ? `image-${Date.now()}.png` : viewedMedia.fileData?.name || 'downloaded-file';
                        if (link.href !== '#') { // Prevent download for placeholder URL
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        } else {
                            alert("Download not available for this file at the moment.");
                        }
                    }}
                    variant="outline"
                    className="mt-auto" // Pushes button to bottom in flex container
                >
                    <Download className="h-4 w-4 mr-2" /> Download
                </Button>
            }
          </DialogContent>
        </Dialog>

        {/* Incoming Call Dialog */}
        <Dialog open={!!incomingCall && !isCallModalOpen} onOpenChange={(isOpen) => { if (!isOpen && incomingCall) rejectCall(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">Incoming Call</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-6">
              <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/20"> {/* Enhanced avatar styling */}
                <AvatarImage src={getUserById(incomingCall?.callerId)?.profileImage || `https://avatar.vercel.sh/${getUserById(incomingCall?.callerId)?.username || 'user'}.png?size=128`} />
                <AvatarFallback className="text-3xl">{getInitials(getUserById(incomingCall?.callerId)?.firstName, getUserById(incomingCall?.callerId)?.lastName, getUserById(incomingCall?.callerId)?.username)}</AvatarFallback>
              </Avatar>
              <p className="text-lg font-semibold mb-1">
                {getUserById(incomingCall?.callerId)?.firstName && getUserById(incomingCall?.callerId)?.lastName ? `${getUserById(incomingCall?.callerId)?.firstName} ${getUserById(incomingCall?.callerId)?.lastName}` : getUserById(incomingCall?.callerId)?.username || `User ${incomingCall?.callerId}`}
              </p>
              <p className="text-sm text-muted-foreground mb-8 capitalize">
                {incomingCall?.type} Call
              </p>
              <div className="flex gap-4">
                <Button variant="destructive" size="lg" className="rounded-full px-6 py-3" onClick={() => rejectCall()}>
                  <X className="h-5 w-5 mr-2" /> Decline
                </Button>
                <Button /*variant="success"*/ size="lg" className="rounded-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white" onClick={handleAnswerCall}> {/* Assuming success variant or direct styling */}
                  <Phone className="h-5 w-5 mr-2" /> Accept
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Active Call Dialog */}
        <Dialog open={isCallModalOpen} onOpenChange={(open) => { if (!open) { endCall(); setIsCallModalOpen(false); } }}>
          <DialogContent className="max-w-lg"> {/* Slightly wider for video */}
            <DialogHeader>
              <DialogTitle className="capitalize">
                {activeCall?.type} Call with {getUserById(activeCall?.callerId === currentUserId ? activeCall?.receiverId : activeCall?.callerId)?.username || 'User'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Video display area */}
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {activeCall?.type === 'video' && remoteStream ? ( // Show remote video if available
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : ( // Fallback to avatar if no remote video or audio call
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={getUserById(activeCall?.callerId === currentUserId ? activeCall?.receiverId : activeCall?.callerId)?.profileImage || `https://avatar.vercel.sh/${getUserById(activeCall?.callerId === currentUserId ? activeCall?.receiverId : activeCall?.callerId)?.username || 'user'}.png?size=128`} />
                    <AvatarFallback className="text-5xl">{getInitials(getUserById(activeCall?.callerId === currentUserId ? activeCall?.receiverId : activeCall?.callerId)?.firstName, getUserById(activeCall?.callerId === currentUserId ? activeCall?.receiverId : activeCall?.callerId)?.lastName, getUserById(activeCall?.callerId === currentUserId ? activeCall?.receiverId : activeCall?.callerId)?.username)}</AvatarFallback>
                  </Avatar>
                )}
                {/* Local video preview (picture-in-picture style) */}
                {activeCall?.type === 'video' && localStream && (
                  <div className="absolute bottom-3 right-3 w-1/4 max-w-[120px] aspect-[3/4] bg-black rounded-md overflow-hidden border-2 border-background shadow-lg">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              {/* Call control buttons */}
              <div className="flex justify-center gap-4 pt-2">
                <Button variant={isMuted ? "destructive" : "outline"} size="icon" className="h-12 w-12 rounded-full" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </Button>
                {activeCall?.type === 'video' && ( // Show video toggle only for video calls
                  <Button variant={!isVideoEnabled ? "destructive" : "outline"} size="icon" className="h-12 w-12 rounded-full" onClick={toggleVideo}>
                    {isVideoEnabled ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
                  </Button>
                )}
                <Button /*variant="destructive_solid"*/ size="icon" className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white" onClick={() => { endCall(); setIsCallModalOpen(false); }}>
                  <Phone className="h-6 w-6 transform rotate-[135deg]" /> {/* Rotated phone icon for hang up */}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Search Dialog for "New Conversation" */}
        <Dialog open={showUserSearch} onOpenChange={(isOpen) => { setShowUserSearch(isOpen); if (!isOpen) setContactsSearchQuery(''); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start a new conversation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="relative px-1 mb-3">
                <Input
                  placeholder="Search by name or username..."
                  value={contactsSearchQuery}
                  onChange={(e) => setContactsSearchQuery(e.target.value)}
                  className="pl-9 rounded-full h-10"
                />
                <Search className="h-4 w-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              </div>
              <ScrollArea className="max-h-[calc(70vh-120px)] min-h-[200px] px-1"> {/* Dynamic height for scroll area */}
                {allUsersLoading ? (
                  <div className="flex justify-center items-center py-8"><Spinner /></div>
                ) : filteredAllUsersForSearchDialog.length > 0 ? (
                  <div className="space-y-1">
                    {filteredAllUsersForSearchDialog.map((user) => ( // `user` here is from `allUsersFromApi` enriched with `onlineUsers` status
                      <Button
                        key={user.id}
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto" // Ensure button takes full width and content alignment
                        onClick={() => startChatWithUser(user)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.profileImage || `https://avatar.vercel.sh/${user.username}.png?size=100`} />
                              <AvatarFallback>{getInitials(user.firstName, user.lastName, user.username)}</AvatarFallback>
                            </Avatar>
                            {/* Status dot uses the status from the (potentially enriched) user object */}
                            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} title={user.status} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-sm">
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground text-sm">
                      {contactsSearchQuery ? 'No users found matching your search.' : 'No other users available to chat.'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  );
}