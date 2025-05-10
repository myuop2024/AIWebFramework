import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface User {
  id: number;
  username: string;
  status?: 'online' | 'busy' | 'away' | 'offline';
}

interface Message {
  id?: number;
  from: number;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'image' | 'system';
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  partnerId: number;
  partnerUsername: string;
  lastMessageAt: Date;
  lastMessageContent: string;
  unreadCount: number;
}

interface PeerConnection {
  peer: Peer.Instance;
  stream?: MediaStream;
  userId: number;
  username: string;
}

export function useCommunication(userId?: number) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    userId: number;
    username: string;
    isIncoming: boolean;
  } | null>(null);
  const [peerConnections, setPeerConnections] = useState<Record<number, PeerConnection>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [notifications, setNotifications] = useState<{ message: string; type: string }[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Store the socket reference in a ref to access in cleanup
  const socketRef = useRef<Socket | null>(null);
  
  // Get user conversations
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ['/api/communication/conversations'],
    enabled: !!userId && isConnected,
  });

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;
    
    // Determine the correct socket path
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Create socket connection
    const socketInstance = io(`${protocol}//${host}`, {
      path: '/comm-socket',
      transports: ['websocket'],
      upgrade: false,
    });
    
    socketRef.current = socketInstance;
    setSocket(socketInstance);
    
    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected!');
      setIsConnected(true);
    });
    
    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected!');
      setIsConnected(false);
      setIsRegistered(false);
    });
    
    socketInstance.on('user:status', (data: { userId: number; username: string; status: string }) => {
      setOnlineUsers(prev => {
        // If user already exists in the list, update their status
        const exists = prev.some(user => user.id === data.userId);
        if (exists) {
          return prev.map(user => 
            user.id === data.userId 
              ? { ...user, status: data.status as 'online' | 'busy' | 'away' | 'offline' } 
              : user
          );
        }
        // Otherwise add them to the list
        return [...prev, { 
          id: data.userId, 
          username: data.username, 
          status: data.status as 'online' | 'busy' | 'away' | 'offline'
        }];
      });
    });
    
    socketInstance.on('register:success', (data) => {
      console.log('Successfully registered with comms server', data);
      setIsRegistered(true);
    });
    
    socketInstance.on('register:error', (error) => {
      console.error('Registration with comms server failed', error);
      toast({
        title: 'Communication Error',
        description: error.message || 'Failed to connect to communication service',
        variant: 'destructive',
      });
    });
    
    // Handle incoming call signals
    socketInstance.on('signal', (data: { from: number; signal: any }) => {
      handleIncomingSignal(data.from, data.signal);
    });
    
    socketInstance.on('system:notification', (data: { message: string; type: string }) => {
      setNotifications(prev => [...prev, data]);
      toast({
        title: 'Notification',
        description: data.message,
        variant: data.type === 'error' ? 'destructive' : 'default',
      });
    });
    
    socketInstance.on('message:direct', (message: Message) => {
      // Invalidate conversations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/communication/conversations'] });
      
      // If this is from the user we're currently chatting with, invalidate the messages query
      if (activeCall && activeCall.userId === message.from) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/communication/messages', message.from.toString()] 
        });
      }
      
      // Show notification
      toast({
        title: 'New Message',
        description: `${onlineUsers.find(u => u.id === message.from)?.username || 'Someone'}: ${message.content}`,
      });
    });
    
    // Clean up socket connection on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, toast, queryClient, activeCall]);
  
  // Register with the communication server once connected
  useEffect(() => {
    if (isConnected && socket && userId && !isRegistered) {
      socket.emit('register', { userId });
    }
  }, [isConnected, socket, userId, isRegistered]);
  
  // Handle incoming WebRTC signaling
  const handleIncomingSignal = useCallback((fromUserId: number, signal: any) => {
    const peer = peerConnections[fromUserId]?.peer;
    
    if (peer) {
      // Existing connection - pass signal to the peer
      peer.signal(signal);
    } else {
      // New incoming connection
      const fromUser = onlineUsers.find(user => user.id === fromUserId);
      if (!fromUser) return;
      
      // Ask user if they want to accept the call
      setActiveCall({
        userId: fromUserId,
        username: fromUser.username,
        isIncoming: true
      });
      
      toast({
        title: 'Incoming Call',
        description: `${fromUser.username} is calling you...`,
      });
    }
  }, [peerConnections, onlineUsers, toast]);
  
  // Start a call with another user
  const startCall = useCallback(async (targetUserId: number, withVideo: boolean = true) => {
    if (!socket || !userId) return;
    
    try {
      // Request user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: withVideo, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      // Create peer
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream
      });
      
      // Find user info
      const targetUser = onlineUsers.find(user => user.id === targetUserId);
      if (!targetUser) {
        throw new Error('User not found or offline');
      }
      
      // Set up peer event handlers
      peer.on('signal', signal => {
        socket.emit('signal', {
          to: targetUserId,
          from: userId,
          signal
        });
      });
      
      peer.on('error', err => {
        console.error('Peer connection error:', err);
        endCall(targetUserId);
        toast({
          title: 'Call Error',
          description: 'There was an error with the call. Please try again.',
          variant: 'destructive',
        });
      });
      
      // Store the peer connection
      setPeerConnections(prev => ({
        ...prev,
        [targetUserId]: {
          peer,
          stream,
          userId: targetUserId,
          username: targetUser.username
        }
      }));
      
      // Update active call state
      setActiveCall({
        userId: targetUserId,
        username: targetUser.username,
        isIncoming: false
      });
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Call Failed',
        description: 'Could not access camera or microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [socket, userId, onlineUsers, toast]);
  
  // Accept an incoming call
  const acceptCall = useCallback(async (fromUserId: number) => {
    if (!socket || !userId || !activeCall || activeCall.userId !== fromUserId) return;
    
    try {
      // Request user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      // Create peer
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream
      });
      
      // Set up peer event handlers
      peer.on('signal', signal => {
        socket.emit('signal', {
          to: fromUserId,
          from: userId,
          signal
        });
      });
      
      peer.on('error', err => {
        console.error('Peer connection error:', err);
        endCall(fromUserId);
        toast({
          title: 'Call Error',
          description: 'There was an error with the call. Please try again.',
          variant: 'destructive',
        });
      });
      
      // Store the peer connection
      setPeerConnections(prev => ({
        ...prev,
        [fromUserId]: {
          peer,
          stream,
          userId: fromUserId,
          username: activeCall.username
        }
      }));
      
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        title: 'Call Failed',
        description: 'Could not access camera or microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [socket, userId, activeCall, toast]);
  
  // End a call with another user
  const endCall = useCallback((targetUserId: number) => {
    // Clean up peer connection
    if (peerConnections[targetUserId]) {
      peerConnections[targetUserId].peer.destroy();
      
      setPeerConnections(prev => {
        const newConnections = { ...prev };
        delete newConnections[targetUserId];
        return newConnections;
      });
    }
    
    // Reset active call
    if (activeCall && activeCall.userId === targetUserId) {
      setActiveCall(null);
    }
    
    // Stop local media tracks
    if (localStream && Object.keys(peerConnections).length === 1) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }, [peerConnections, activeCall, localStream]);
  
  // Send a direct message to another user
  const sendDirectMessage = useCallback((targetUserId: number, content: string, type: string = 'text') => {
    if (!socket || !userId) return;
    
    socket.emit('message:direct', {
      to: targetUserId,
      content,
      type
    });
  }, [socket, userId]);
  
  // Send a file to another user
  const sendFile = useCallback((targetUserId: number, file: File) => {
    if (!socket || !userId) return;
    
    // First send file info in a signaling message
    socket.emit('file:request', {
      to: targetUserId,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    });
    
    // Then handle the actual file transfer via WebRTC
    // This would typically be handled via the peer data channel
    // For simplicity, we're not implementing the full file transfer logic here
  }, [socket, userId]);
  
  // Start screen sharing
  const startScreenSharing = useCallback(async (roomId: string) => {
    if (!socket || !userId) return;
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false
      });
      
      // Notify others in the room
      socket.emit('screen:start', { roomId });
      
      return stream;
    } catch (error) {
      console.error('Error starting screen sharing:', error);
      toast({
        title: 'Screen Sharing Failed',
        description: 'Could not access your screen. Please check permissions.',
        variant: 'destructive',
      });
      return null;
    }
  }, [socket, userId, toast]);
  
  // Stop screen sharing
  const stopScreenSharing = useCallback((roomId: string, stream: MediaStream) => {
    if (!socket) return;
    
    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());
    
    // Notify others in the room
    socket.emit('screen:stop', { roomId });
  }, [socket]);
  
  // Set user status
  const setUserStatus = useCallback((status: 'online' | 'busy' | 'away' | 'offline') => {
    if (!socket) return;
    
    socket.emit('status', { status });
  }, [socket]);
  
  // Return the communication API
  return {
    isConnected,
    onlineUsers,
    activeCall,
    conversations,
    startCall,
    acceptCall,
    endCall,
    sendDirectMessage,
    sendFile,
    startScreenSharing,
    stopScreenSharing,
    setUserStatus,
    localStream,
    peerConnections,
    notifications
  };
}