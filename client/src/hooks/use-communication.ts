import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';

// Types for messages
type MessageType = 'text' | 'file' | 'image' | 'system';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: MessageType;
  sentAt: Date;
  read: boolean;
}

interface User {
  id: number;
  username: string;
  status: 'online' | 'offline' | 'away';
}

interface CallData {
  callerId: number;
  receiverId: number;
  type: 'audio' | 'video';
  offer?: any;
  answer?: any;
}

// Socket.io and WebRTC integration with React
export function useCommunication(userId: number) {
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const queryClient = useQueryClient();

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Get conversations from API
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/communications/conversations'],
    enabled: !!userId,
  });

  // Get messages between current user and selected user
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/communications/messages', activeChat],
    enabled: !!activeChat,
  });

  // Get online users
  const { data: users = [] } = useQuery({
    queryKey: ['/api/communications/online-users'],
    enabled: !!userId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: number; content: string; type?: MessageType }) => {
      return fetch('/api/communications/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).then(res => res.json());
    },
    onSuccess: () => {
      // Invalidate the messages cache to refresh the messages list
      queryClient.invalidateQueries({ queryKey: ['/api/communications/messages', activeChat] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations'] });
    },
  });

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    // Use the current URL to connect to the Socket.io server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    socketRef.current = io(`${protocol}//${host}`, {
      path: '/socket',
    });

    // Connect to socket
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);

      // Authenticate with the server
      socket.emit('authenticate', { userId });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('online-users', (users: User[]) => {
      setOnlineUsers(users);
    });

    socket.on('user-status', ({ userId, status }: { userId: number; status: string }) => {
      setOnlineUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, status: status as 'online' | 'offline' | 'away' } 
            : user
        )
      );
    });

    socket.on('new-message', (message: Message) => {
      // Update messages if this is from the active chat
      if (activeChat === message.senderId) {
        queryClient.invalidateQueries({ queryKey: ['/api/communications/messages', activeChat] });
      }

      // Always update conversations list
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations'] });

      // Mark the message as read if it's from the active chat
      if (activeChat === message.senderId) {
        socket.emit('mark-read', { messageIds: [message.id] });
      }
    });

    socket.on('user-typing', ({ userId, isTyping }: { userId: number; isTyping: boolean }) => {
      setTypingUsers(prev => ({
        ...prev,
        [userId]: isTyping,
      }));
    });

    socket.on('message-read', ({ messageId }: { messageId: number }) => {
      // Update the message as read in the cache
      queryClient.setQueryData(['/api/communications/messages', activeChat], (oldData: Message[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        );
      });
    });

    // WebRTC call events
    socket.on('call-offer', (data: CallData) => {
      setIncomingCall(data);
    });

    socket.on('call-answer', ({ from, answer }: { from: number; answer: any }) => {
      if (peerRef.current && currentCall) {
        peerRef.current.signal(answer);
      }
    });

    socket.on('ice-candidate', ({ from, candidate }: { from: number; candidate: any }) => {
      if (peerRef.current) {
        peerRef.current.signal(candidate);
      }
    });

    socket.on('call-end', ({ from }: { from: number }) => {
      endCall();
    });

    socket.on('screen-share-offer', ({ from, offer }: { from: number; offer: any }) => {
      // Handle incoming screen share
    });

    // Clean up
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [userId, activeChat, queryClient]);

  // Sends a text message to another user
  const sendMessage = useCallback((receiverId: number, content: string, type: MessageType = 'text') => {
    if (!socketRef.current || !isConnected) {
      console.warn('Socket not connected, sending via REST API');
      sendMessageMutation.mutate({ receiverId, content, type });
      return;
    }

    socketRef.current.emit('private-message', {
      senderId: userId,
      receiverId,
      content,
      type,
    });
  }, [userId, isConnected, sendMessageMutation]);

  // Sets the active chat user and marks messages as read
  const setActiveChatUser = useCallback((userId: number) => {
    setActiveChat(userId);

    // Mark unread messages as read
    if (messages.length > 0) {
      const unreadMessages = messages
        .filter(msg => msg.senderId === userId && !msg.read)
        .map(msg => msg.id);

      if (unreadMessages.length > 0 && socketRef.current) {
        socketRef.current.emit('mark-read', { messageIds: unreadMessages });
      }
    }
  }, [messages]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((receiverId: number, isTyping: boolean) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing', {
        senderId: userId,
        receiverId,
        isTyping,
      });
    }
  }, [userId, isConnected]);

  // Start a call (audio or video)
  const startCall = useCallback(async (receiverId: number, type: 'audio' | 'video') => {
    if (!socketRef.current || !isConnected) {
      console.error('Socket not connected');
      return;
    }

    try {
      // Get user media based on call type
      const constraints = {
        audio: true,
        video: type === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create peer connection
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream,
      });

      peer.on('signal', (data) => {
        // Send the offer to the receiver
        socketRef.current?.emit('call-offer', {
          callerId: userId,
          receiverId,
          offer: data,
          type,
        });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });

      peer.on('close', () => {
        endCall();
      });

      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        endCall();
      });

      peerRef.current = peer;
      setCurrentCall({ callerId: userId, receiverId, type });

    } catch (error) {
      console.error('Error starting call:', error);
    }
  }, [userId, isConnected]);

  // Answer an incoming call
  const answerCall = useCallback(async () => {
    if (!socketRef.current || !isConnected || !incomingCall) {
      console.error('Cannot answer call: Socket not connected or no incoming call');
      return;
    }

    try {
      // Get user media based on call type
      const constraints = {
        audio: true,
        video: incomingCall.type === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create peer connection
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
      });

      peer.on('signal', (data) => {
        // Send the answer to the caller
        socketRef.current?.emit('call-answer', {
          callerId: incomingCall.callerId,
          receiverId: userId,
          answer: data,
        });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });

      peer.on('close', () => {
        endCall();
      });

      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        endCall();
      });

      // Signal the peer with the offer we received
      if (incomingCall.offer) {
        peer.signal(incomingCall.offer);
      }

      peerRef.current = peer;
      setCurrentCall(incomingCall);
      setIncomingCall(null);

    } catch (error) {
      console.error('Error answering call:', error);
      rejectCall();
    }
  }, [userId, isConnected, incomingCall]);

  // Reject an incoming call
  const rejectCall = useCallback(() => {
    if (socketRef.current && incomingCall) {
      socketRef.current.emit('call-end', {
        callerId: userId,
        receiverId: incomingCall.callerId,
      });
      setIncomingCall(null);
    }
  }, [userId, incomingCall]);

  // End current call
  const endCall = useCallback(() => {
    if (socketRef.current && currentCall) {
      socketRef.current.emit('call-end', {
        callerId: userId,
        receiverId: currentCall.receiverId !== userId ? currentCall.receiverId : currentCall.callerId,
      });
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCurrentCall(null);
  }, [userId, currentCall]);

  // Share screen during a call
  const shareScreen = useCallback(async () => {
    if (!socketRef.current || !isConnected || !currentCall) {
      console.error('Cannot share screen: No active call');
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      
      // Replace video track in the peer connection
      if (peerRef.current && localStreamRef.current) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const senders = peerRef.current._pc.getSenders();
        const videoSender = senders.find((sender: RTCRtpSender) => 
          sender.track?.kind === 'video'
        );
        
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        }

        // Update local stream ref and state
        const newStream = new MediaStream();
        newStream.addTrack(videoTrack);
        localStreamRef.current.getAudioTracks().forEach(track => {
          newStream.addTrack(track);
        });
        
        localStreamRef.current = newStream;
        setLocalStream(newStream);

        // Handle screen share end
        videoTrack.onended = () => {
          // Revert to camera
          navigator.mediaDevices.getUserMedia({ video: true }).then(cameraStream => {
            const cameraTrack = cameraStream.getVideoTracks()[0];
            videoSender.replaceTrack(cameraTrack);
            
            const newLocalStream = new MediaStream();
            newLocalStream.addTrack(cameraTrack);
            localStreamRef.current?.getAudioTracks().forEach(track => {
              newLocalStream.addTrack(track);
            });
            
            localStreamRef.current = newLocalStream;
            setLocalStream(newLocalStream);
          });
        };
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  }, [isConnected, currentCall]);

  return {
    // State
    isConnected,
    onlineUsers: [...onlineUsers, ...users.filter(u => !onlineUsers.some(ou => ou.id === u.id))],
    activeChat,
    typingUsers,
    conversations,
    messages,
    incomingCall,
    currentCall,
    localStream,
    remoteStream,
    
    // Actions
    sendMessage,
    setActiveChatUser,
    sendTypingIndicator,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    shareScreen
  };
}

export default useCommunication;