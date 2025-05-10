import { useEffect, useState, useRef } from 'react';
import { useCommunication } from '@/hooks/use-communication';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { 
  PhoneCall, 
  Video, 
  MessageSquare, 
  Users, 
  User, 
  Monitor, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  SendHorizontal, 
  FileUp,
  X
} from 'lucide-react';

interface CommunicationCenterProps {
  userId: number;
}

export function CommunicationCenter({ userId }: CommunicationCenterProps) {
  const { 
    isConnected, 
    onlineUsers, 
    conversations, 
    startCall, 
    acceptCall, 
    endCall, 
    sendDirectMessage,
    activeCall,
    localStream,
    peerConnections
  } = useCommunication(userId);
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [activeTab, setActiveTab] = useState('messages');
  const [showCallControls, setShowCallControls] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  
  // Get chat messages for selected user
  const { data: messages } = useQuery({
    queryKey: ['/api/communication/messages', selectedUserId?.toString()],
    enabled: !!selectedUserId,
  });
  
  // Handle camera/microphone state changes
  useEffect(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      const videoTracks = localStream.getVideoTracks();
      
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = isAudioEnabled;
      }
      
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = isVideoEnabled;
      }
    }
  }, [isAudioEnabled, isVideoEnabled, localStream]);
  
  // Set up video elements when streams are available
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    
    // If we have an active call, attempt to find the remote stream
    if (activeCall && remoteVideoRef.current) {
      const connection = peerConnections[activeCall.userId];
      if (connection && connection.stream) {
        remoteVideoRef.current.srcObject = connection.stream;
      }
    }
  }, [localStream, activeCall, peerConnections]);
  
  // Handle incoming call
  useEffect(() => {
    if (activeCall?.isIncoming) {
      setShowCallControls(true);
      setActiveTab('calls');
    }
  }, [activeCall]);
  
  // Handle message sending
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedUserId) return;
    
    sendDirectMessage(selectedUserId, messageText);
    setMessageText('');
  };
  
  // Toggle microphone on/off
  const toggleMicrophone = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };
  
  // Toggle camera on/off
  const toggleCamera = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };
  
  // Initiate a call
  const handleStartCall = (targetUserId: number, withVideo: boolean) => {
    startCall(targetUserId, withVideo);
    setShowCallControls(true);
    setActiveTab('calls');
  };
  
  // Accept an incoming call
  const handleAcceptCall = () => {
    if (activeCall?.isIncoming) {
      acceptCall(activeCall.userId);
    }
  };
  
  // End the active call
  const handleEndCall = () => {
    if (activeCall) {
      endCall(activeCall.userId);
      setShowCallControls(false);
    }
  };
  
  if (!isConnected) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-center text-muted-foreground">
            Connecting to communication service...
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Communication Center
          <Badge variant="outline" className="ml-auto">
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4">
          <TabsTrigger value="messages" className="flex-1">
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex-1">
            <Users className="mr-2 h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex-1">
            <PhoneCall className="mr-2 h-4 w-4" />
            Calls
          </TabsTrigger>
        </TabsList>
        
        {/* Messages Tab */}
        <TabsContent value="messages" className="flex-1 flex flex-col m-0 p-0">
          <div className="grid grid-cols-3 h-full border-t">
            {/* Conversations List */}
            <div className="col-span-1 border-r">
              <ScrollArea className="h-[calc(100vh-250px)]">
                {conversations?.length ? (
                  conversations.map((conversation) => (
                    <div 
                      key={conversation.partnerId}
                      className={`p-3 cursor-pointer hover:bg-muted flex items-center 
                        ${selectedUserId === conversation.partnerId ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedUserId(conversation.partnerId)}
                    >
                      <Avatar className="h-9 w-9 mr-2">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${conversation.partnerUsername}`} />
                        <AvatarFallback>{conversation.partnerUsername.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <p className="font-medium truncate">{conversation.partnerUsername}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conversation.lastMessageContent}</p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <Badge className="ml-2">{conversation.unreadCount}</Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No conversations yet
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Chat Area */}
            <div className="col-span-2 flex flex-col h-full">
              {selectedUserId ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b flex justify-between items-center">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage 
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${
                            onlineUsers.find(u => u.id === selectedUserId)?.username || 'User'
                          }`} 
                        />
                        <AvatarFallback>
                          {(onlineUsers.find(u => u.id === selectedUserId)?.username || 'User')
                            .substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {onlineUsers.find(u => u.id === selectedUserId)?.username || 
                            conversations?.find(c => c.partnerId === selectedUserId)?.partnerUsername || 
                            'User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {onlineUsers.find(u => u.id === selectedUserId)?.status || 'offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleStartCall(selectedUserId, false)}
                        title="Audio Call"
                      >
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleStartCall(selectedUserId, true)}
                        title="Video Call"
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-3">
                    {messages?.length ? (
                      messages.map((message: any) => (
                        <div
                          key={message.id}
                          className={`mb-3 flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.senderId === userId
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">No messages yet</p>
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Message Input */}
                  <div className="p-3 border-t flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Attach File"
                      onClick={() => toast({
                        title: "Coming Soon",
                        description: "File sharing will be available soon",
                      })}
                    >
                      <FileUp className="h-4 w-4" />
                    </Button>
                    <Input
                      className="flex-1"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                      }}
                    />
                    <Button onClick={handleSendMessage}>
                      <SendHorizontal className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No conversation selected</h3>
                    <p className="text-muted-foreground mt-2">
                      Select a conversation from the list or start a new one
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 m-0 p-4 border-t">
          <h3 className="font-medium mb-2">Online Users</h3>
          <ScrollArea className="h-[calc(100vh-250px)]">
            {onlineUsers.filter(user => user.id !== userId).length ? (
              onlineUsers
                .filter(user => user.id !== userId)
                .map((user) => (
                  <div key={user.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
                          <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.status || 'online'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setActiveTab('messages');
                          }}
                          title="Message"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartCall(user.id, false)}
                          title="Audio Call"
                        >
                          <PhoneCall className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartCall(user.id, true)}
                          title="Video Call"
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Separator className="mt-2" />
                  </div>
                ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2" />
                <p>No users online</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        {/* Calls Tab */}
        <TabsContent value="calls" className="flex-1 m-0 p-0 border-t">
          {showCallControls ? (
            <div className="h-full flex flex-col">
              {/* Call Header */}
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${activeCall?.username || 'User'}`} 
                    />
                    <AvatarFallback>{(activeCall?.username || 'User').substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{activeCall?.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeCall?.isIncoming && !peerConnections[activeCall.userId] 
                        ? 'Incoming call...' 
                        : 'In call'}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={handleEndCall}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Call Content */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center relative">
                {activeCall?.isIncoming && !peerConnections[activeCall.userId] ? (
                  // Incoming call UI
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-4">Incoming call from {activeCall.username}</h3>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleAcceptCall} className="bg-green-600 hover:bg-green-700">
                        <PhoneCall className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button variant="destructive" onClick={handleEndCall}>
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Active call UI with videos
                  <>
                    {/* Remote Video (Full Size) */}
                    <div className="w-full h-full bg-black rounded-lg overflow-hidden">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Local Video (Picture in Picture) */}
                    <div className="absolute bottom-4 right-4 w-1/4 aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </>
                )}
              </div>
              
              {/* Call Controls */}
              {!activeCall?.isIncoming || peerConnections[activeCall?.userId || 0] ? (
                <div className="p-4 border-t flex justify-center gap-4">
                  <Button
                    size="icon"
                    variant={isAudioEnabled ? "outline" : "destructive"}
                    onClick={toggleMicrophone}
                  >
                    {isAudioEnabled ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant={isVideoEnabled ? "outline" : "destructive"}
                    onClick={toggleCamera}
                  >
                    {isVideoEnabled ? (
                      <VideoIcon className="h-4 w-4" />
                    ) : (
                      <VideoOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => toast({
                      title: "Coming Soon",
                      description: "Screen sharing will be available soon",
                    })}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={handleEndCall}
                  >
                    <PhoneCall className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <PhoneCall className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No active calls</h3>
                <p className="text-muted-foreground mt-2">
                  Start a call from the contacts tab or messages
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}