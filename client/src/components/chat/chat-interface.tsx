import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCommunication, type ChatMessage, type UserStatus, type FileInfo, type CallInfo } from "@/lib/websocket";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  UserRound, 
  Send, 
  AlertCircle, 
  Loader2, 
  PhoneCall, 
  Video, 
  File, 
  Paperclip, 
  X,
  Mic,
  MicOff, 
  VideoOff, 
  Download,
  MessageSquare
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { formatFileSize } from "@/lib/utils";

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
  const [contactList, setContactList] = useState<ChatContact[]>([]);
  const [callDialogOpen, setCallDialogOpen] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Communication hook
  const {
    isConnected,
    error,
    onlineUsers,
    sendMessage,
    activeCall,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    fileTransfers,
    shareFile,
    downloadFile
  } = useCommunication({
    userId: user?.id || null,
    onMessage: (message) => {
      // Check if this message is related to the selected contact
      if (message.type === "text" || message.type === "file") {
        if (message.senderId === selectedContact?.id || message.receiverId === selectedContact?.id) {
          setChatMessages(prev => [...prev, message]);
        }
      } else if (message.type === "notification" || message.type === "system") {
        // Always show system and notification messages
        setChatMessages(prev => [...prev, message]);
      }
    },
    onStatusChange: (status) => {
      // Update contact online status
      setContactList(prev => prev.map(contact => {
        if (contact.id === status.userId) {
          return {
            ...contact,
            isOnline: status.status === 'online'
          };
        }
        return contact;
      }));
    },
    onCallState: (callInfo) => {
      // Open call dialog for incoming/outgoing calls
      if (callInfo.status === 'ringing' || callInfo.status === 'accepted') {
        setCallDialogOpen(true);
      } else if (callInfo.status === 'ended' || callInfo.status === 'rejected') {
        setCallDialogOpen(false);
        
        // Reset audio/video controls
        setIsAudioMuted(false);
        setIsVideoOff(false);
      }
    },
    onFileReceived: (fileInfo) => {
      // We already handle this in the onMessage callback
    }
  });

  // Fetch contacts from the server
  const { data: contactsData, isLoading: isContactsLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      // Exclude the current user
      const res = await apiRequest('GET', '/api/users');
      const users = await res.json();
      return users.filter((u: any) => u.id !== user?.id);
    },
    enabled: !!user?.id
  });

  // Fetch chat history when contact is selected
  const { data: messageHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['/api/messages', selectedContact?.id],
    enabled: !!selectedContact?.id,
  });

  // Set chat history when it's loaded
  useEffect(() => {
    if (messageHistory && Array.isArray(messageHistory)) {
      const formattedMessages = messageHistory.map((msg: any) => ({
        id: msg.id.toString(),
        type: msg.type === 'file' ? 'file' as const : 'text' as const,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        timestamp: new Date(msg.sentAt),
        messageId: msg.id,
        fileInfo: msg.fileMetadata ? JSON.parse(msg.fileMetadata) : null
      }));
      setChatMessages(formattedMessages);
    } else {
      // Reset messages when no history or on contact change
      setChatMessages([]);
    }
  }, [messageHistory]);

  // Set contacts when data is loaded
  useEffect(() => {
    if (contactsData) {
      const formattedContacts: ChatContact[] = contactsData.map((c: any) => ({
        id: c.id,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.username,
        role: c.role || 'Observer',
        avatarUrl: c.profileImage,
        isOnline: onlineUsers.includes(c.id)
      }));
      
      // Add support contacts
      formattedContacts.push({
        id: 1001, // Special ID for system support
        name: "Election Center Support",
        role: "Support Staff",
        isOnline: true,
      });
      
      setContactList(formattedContacts);
      
      // Select default contact if none selected
      if (!selectedContact && formattedContacts.length > 0) {
        setSelectedContact(formattedContacts[0]);
      }
    }
  }, [contactsData, onlineUsers, selectedContact]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (!selectedContact || !message.trim() || !isConnected) return;

    const sent = sendMessage(selectedContact.id, message);
    if (sent) {
      // Add message to local chat
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'text',
          senderId: user?.id,
          receiverId: selectedContact.id,
          content: message,
          timestamp: new Date()
        }
      ]);
      setMessage("");
      chatInputRef.current?.focus();
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Handle initiating a call
  const handleCallInitiate = (callType: 'audio' | 'video') => {
    if (!selectedContact) return;
    
    initiateCall(selectedContact.id, callType);
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  
  // Handle file sharing
  const handleFileShare = async () => {
    if (!selectedContact || !selectedFile) return;
    
    const sent = await shareFile(selectedContact.id, selectedFile);
    if (sent) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Handle file download
  const handleFileDownload = (fileId: string) => {
    downloadFile(fileId);
  };
  
  // Toggle audio mute
  const handleToggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isAudioMuted;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };
  
  // Toggle video off
  const handleToggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };
  
  // Set media streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  return (
    <>
      <Card className="flex flex-col h-[calc(100vh-180px)]">
        <CardHeader className="pb-3">
          <CardTitle>Communication Center</CardTitle>
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
                          <div className="flex items-center">
                            <p className="text-xs text-gray-500">{selectedContact.role}</p>
                            {selectedContact.isOnline && (
                              <span className="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleCallInitiate('audio')}
                          disabled={!isConnected || !selectedContact.isOnline}
                          title={selectedContact.isOnline ? "Audio Call" : "User is offline"}
                        >
                          <PhoneCall className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleCallInitiate('video')}
                          disabled={!isConnected || !selectedContact.isOnline}
                          title={selectedContact.isOnline ? "Video Call" : "User is offline"}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    {isHistoryLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <MessageSquare className="h-12 w-12 mb-4" />
                        <p>No messages yet</p>
                        <p className="text-sm mt-1">Send a message to start the conversation</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatMessages.map((msg, i) => {
                          const isUser = msg.senderId === user?.id;
                          return (
                            <div
                              key={msg.id || i}
                              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                                  isUser ? 'bg-primary text-white' : 'bg-secondary text-primary-foreground'
                                }`}
                              >
                                {msg.type === 'file' && msg.fileInfo && (
                                  <div className="mb-2 p-2 bg-white/10 rounded flex items-center">
                                    <File className="h-8 w-8 mr-2" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{msg.fileInfo.name}</p>
                                      <p className="text-xs">{formatFileSize(msg.fileInfo.size)}</p>
                                    </div>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="ml-2"
                                      onClick={() => handleFileDownload(msg.fileInfo?.id || '')}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${isUser ? 'text-primary-foreground/80' : 'text-primary-foreground/70'}`}>
                                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                  
                  {/* File attachment preview */}
                  {selectedFile && (
                    <div className="px-4 py-2 border-t">
                      <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
                        <div className="flex items-center">
                          <File className="h-5 w-5 mr-2 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedFile(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleFileShare}
                            disabled={!isConnected}
                          >
                            <Send className="h-4 w-4 mr-1" /> Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Chat input */}
                  <div className="px-4 py-3 border-t">
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!isConnected}
                        title="Attach file"
                      >
                        <Paperclip className="h-4 w-4" />
                        <input
                          type="file"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                        />
                      </Button>
                      <Input
                        ref={chatInputRef}
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={!isConnected}
                        className="flex-1 mx-2"
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9"
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
                {isContactsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {contactList.map((contact) => (
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
                                <UserRound className="h-4 w-4" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{contact.name}</p>
                              {contact.lastMessageTime && (
                                <span className="text-xs text-gray-500">
                                  {contact.lastMessageTime.toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm text-gray-500 truncate">
                                {contact.role}
                              </p>
                              {contact.isOnline ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Online
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                  Offline
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {contact.lastMessage && (
                          <p className="mt-2 text-sm text-gray-600 truncate">
                            {contact.lastMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
        {!isConnected && (
          <CardFooter className="border-t py-2 px-4">
            <div className="flex items-center text-yellow-600 text-sm w-full">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>Connecting to communication server...</span>
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeCall?.status === 'ringing' && activeCall.callerId === user?.id
                ? `Calling ${selectedContact?.name || '...'}` 
                : activeCall?.status === 'ringing' && activeCall.callerId !== user?.id
                ? `Incoming call from ${contactList.find(c => c.id === activeCall?.callerId)?.name || 'Unknown'}`
                : activeCall?.status === 'accepted'
                ? `Call in progress`
                : 'Call'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center">
            {/* Video container */}
            {activeCall?.callType === 'video' && (
              <div className="relative w-full aspect-video bg-gray-900 rounded-lg mb-4 overflow-hidden">
                {/* Remote video (main) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Local video (picture-in-picture) */}
                <div className="absolute bottom-2 right-2 w-1/4 aspect-video bg-gray-800 rounded overflow-hidden border-2 border-white">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            {/* Audio only call */}
            {activeCall?.callType === 'audio' && (
              <div className="py-6 flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  {selectedContact?.avatarUrl ? (
                    <AvatarImage src={selectedContact.avatarUrl} alt={selectedContact.name || ''} />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {selectedContact?.name?.charAt(0) || <UserRound className="h-12 w-12" />}
                    </AvatarFallback>
                  )}
                </Avatar>
                <h3 className="text-xl font-semibold">
                  {selectedContact?.name || contactList.find(c => c.id === activeCall?.callerId)?.name || 'Unknown'}
                </h3>
                <p className="text-gray-500 mt-1">
                  {activeCall?.status === 'ringing' 
                    ? activeCall.callerId === user?.id 
                      ? 'Calling...' 
                      : 'Incoming call...'
                    : 'Audio call in progress'
                  }
                </p>
              </div>
            )}
            
            {/* Call controls */}
            <div className="flex justify-center space-x-4 py-4">
              {/* Mute button (for active calls) */}
              {activeCall?.status === 'accepted' && (
                <Button
                  size="icon"
                  variant={isAudioMuted ? "destructive" : "outline"}
                  className="rounded-full h-12 w-12"
                  onClick={handleToggleMute}
                >
                  {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
              )}
              
              {/* Video toggle (for video calls) */}
              {activeCall?.status === 'accepted' && activeCall.callType === 'video' && (
                <Button
                  size="icon"
                  variant={isVideoOff ? "destructive" : "outline"}
                  className="rounded-full h-12 w-12"
                  onClick={handleToggleVideo}
                >
                  {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
              )}
              
              {/* Accept/Reject/End call */}
              {activeCall?.status === 'ringing' && activeCall.receiverId === user?.id ? (
                // Recipient controls for incoming call
                <>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="rounded-full h-12 w-12"
                    onClick={() => rejectCall()}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                  <Button
                    size="icon"
                    variant="default"
                    className="rounded-full h-12 w-12 bg-green-600 hover:bg-green-700"
                    onClick={() => acceptCall()}
                  >
                    <PhoneCall className="h-6 w-6" />
                  </Button>
                </>
              ) : (
                // End call button (for caller or active call)
                <Button
                  size="icon"
                  variant="destructive"
                  className="rounded-full h-12 w-12"
                  onClick={() => endCall()}
                >
                  <PhoneCall className="h-6 w-6" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}