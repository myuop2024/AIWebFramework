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
  Download, Clock, ArrowLeft, Play, Trash2, StopCircle, Share2
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
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastChannels, setBroadcastChannels] = useState<{ sms: boolean; whatsapp: boolean; telegram: boolean }>({ sms: true, whatsapp: false, telegram: false });
  const [broadcastStatus, setBroadcastStatus] = useState<{ sms?: string; whatsapp?: string; telegram?: string }>({});

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

  // Voice Memo State
  const [voiceMemos, setVoiceMemos] = useState<{ id: string, url: string, created: number }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load memos from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voiceMemos');
      if (saved) setVoiceMemos(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading voice memos from localStorage:', e);
      // Optionally show a toast here if you have a toast system
      // toast({ title: 'Storage Error', description: 'Could not load voice memos from storage.', variant: 'destructive' });
    }
  }, []);
  // Save memos to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('voiceMemos', JSON.stringify(voiceMemos));
    } catch (e) {
      console.error('Error saving voice memos to localStorage:', e);
      // Optionally show a toast here if you have a toast system
      // toast({ title: 'Storage Error', description: 'Could not save voice memos to storage.', variant: 'destructive' });
    }
  }, [voiceMemos]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return alert('Audio recording not supported');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new window.MediaRecorder(stream);
    setMediaRecorder(recorder);
    setRecordedChunks([]);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setVoiceMemos((prev) => [
        { id: Date.now().toString(), url, created: Date.now() },
        ...prev
      ]);
      setRecordedChunks([]);
    };
    recorder.start();
    setIsRecording(true);
  };
  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
  };
  const deleteMemo = (id: string) => {
    setVoiceMemos((prev) => prev.filter((m) => m.id !== id));
  };

  const handleBroadcast = async () => {
    setBroadcastStatus({});
    // Simulate sending
    const status: any = {};
    if (broadcastChannels.sms) status.sms = 'Sending...';
    if (broadcastChannels.whatsapp) status.whatsapp = 'Sending...';
    if (broadcastChannels.telegram) status.telegram = 'Sending...';
    setBroadcastStatus({ ...status });
    setTimeout(() => {
      if (broadcastChannels.sms) status.sms = 'Sent';
      if (broadcastChannels.whatsapp) status.whatsapp = 'Sent';
      if (broadcastChannels.telegram) status.telegram = 'Sent';
      setBroadcastStatus({ ...status });
    }, 1200);
  };

  // Add language mapping (mocked for now)
  const userLanguages: Record<number, string> = {};
  allUsers?.forEach(user => { userLanguages[user.id] = user.language || 'en'; });
  const languageLabels: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French', ar: 'Arabic', ru: 'Russian', zh: 'Chinese', sw: 'Swahili' };
  const [newChatLanguage, setNewChatLanguage] = useState('en');

  return (
    <Card className="h-full border-none shadow-none">
      <CardContent className="p-0 h-full min-h-0 overflow-hidden">
        <div className="h-full min-h-0 flex flex-col overflow-hidden">
          {!hideHeader && (
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 rounded-none border-b bg-transparent">
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
                  <TabsTrigger value="voice-memos" className="data-[state=active]:bg-background">
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Memos
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Sidebar */}
            <div className={`${isMobile && activeChatUserId ? 'hidden' : 'flex flex-col w-80'} border-r bg-background/50`}>
              {/* Search */}
              <div className="p-4 border-b flex justify-between items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="icon" className="ml-2" onClick={() => setBroadcastOpen(true)} title="Broadcast Message">
                  <Share2 className="h-5 w-5" />
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
                              <div className="flex items-center gap-2">
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                                <Badge variant="outline" className="text-xs">
                                  {languageLabels[userLanguages[conversation.userId] || 'en']}
                                </Badge>
                              </div>
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
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
            <div className="flex items-center gap-2">
              <span className="text-xs">Channel Language:</span>
              <select value={newChatLanguage} onChange={e => setNewChatLanguage(e.target.value)} className="border rounded px-2 py-1 text-xs">
                {Object.entries(languageLabels).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
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
                        onClick={() => {
                          // Mock: set language for this chat
                          userLanguages[user.id] = newChatLanguage;
                          handleStartConversation(user);
                        }}
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
                        <Badge variant="outline" className="ml-2 text-xs">
                          {languageLabels[newChatLanguage]}
                        </Badge>
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

      {/* Voice Memos Tab */}
      {activeTab === 'voice-memos' && (
        <div className="flex flex-col h-full p-4">
          <div className="mb-4 flex items-center gap-2">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? 'destructive' : 'default'}
              className="gap-2"
            >
              {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {isRecording ? 'Stop Recording' : 'Record Voice Memo'}
            </Button>
            {isRecording && <span className="text-red-500 animate-pulse ml-2">Recording...</span>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {voiceMemos.length === 0 ? (
              <div className="text-center text-muted-foreground mt-8">No voice memos yet.</div>
            ) : (
              <ul className="space-y-4">
                {voiceMemos.map((memo) => (
                  <li key={memo.id} className="flex items-center gap-3 border-b pb-2">
                    <audio ref={audioPlayerRef} src={memo.url} controls className="w-64" />
                    <span className="text-xs text-gray-500">{new Date(memo.created).toLocaleString()}</span>
                    <Button variant="ghost" size="icon" onClick={() => deleteMemo(memo.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Multi-channel Broadcast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              placeholder="Enter your message..."
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={broadcastChannels.sms} onChange={e => setBroadcastChannels(c => ({ ...c, sms: e.target.checked }))} /> SMS
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={broadcastChannels.whatsapp} onChange={e => setBroadcastChannels(c => ({ ...c, whatsapp: e.target.checked }))} /> WhatsApp
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={broadcastChannels.telegram} onChange={e => setBroadcastChannels(c => ({ ...c, telegram: e.target.checked }))} /> Telegram
              </label>
            </div>
            <Button onClick={handleBroadcast} disabled={!broadcastMessage.trim() || (!broadcastChannels.sms && !broadcastChannels.whatsapp && !broadcastChannels.telegram)}>
              Send Broadcast
            </Button>
            <div className="space-y-1">
              {broadcastChannels.sms && <div>SMS: {broadcastStatus.sms || '-'}</div>}
              {broadcastChannels.whatsapp && <div>WhatsApp: {broadcastStatus.whatsapp || '-'}</div>}
              {broadcastChannels.telegram && <div>Telegram: {broadcastStatus.telegram || '-'}</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Export alias for backward compatibility
export const CommunicationCenter = CommunicationCenterFixed;