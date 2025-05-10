import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

// Message types
export type MessageType = 'text' | 'file' | 'image' | 'system';

// Message interface
export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: MessageType;
  sentAt: Date;
  read: boolean;
}

// User interface for online/offline status
export interface User {
  id: number;
  username: string;
  status: 'online' | 'offline' | 'away';
}

// Call data for audio/video calls
export interface CallData {
  callerId: number;
  receiverId: number;
  type: 'audio' | 'video';
  offer?: any;
  answer?: any;
  candidate?: any;
}

/**
 * Hook for handling communication functionality
 */
export function useCommunication(userId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);

  // Connect to WebSocket server
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      // Send user ID to identify the connection
      newSocket.send(JSON.stringify({ type: 'register', userId }));
    };

    newSocket.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          console.log('Attempting to reconnect WebSocket...');
          setSocket(null);
        }
      }, 3000);
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);

      switch (data.type) {
        case 'users':
          setOnlineUsers(data.users);
          break;
        case 'message':
          // Invalidate queries to refresh message list
          queryClient.invalidateQueries({ queryKey: [`/api/communications/messages/${data.message.senderId}/${userId}`] });
          queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations'] });
          
          // Show toast notification for new message if it's not from current user
          if (data.message.senderId !== userId) {
            const sender = onlineUsers.find(user => user.id === data.message.senderId);
            toast({
              title: `New message from ${sender?.username || 'User'}`,
              description: data.message.content.length > 50 ? 
                `${data.message.content.substring(0, 50)}...` : 
                data.message.content,
              variant: 'default'
            });
          }
          break;
        case 'call-offer':
          handleIncomingCall(data);
          break;
        case 'call-answer':
          handleCallAnswer(data);
          break;
        case 'call-candidate':
          handleIceCandidate(data);
          break;
        case 'call-end':
          handleCallEnd();
          break;
      }
    };

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userId, queryClient, toast, onlineUsers]);

  // Get recent conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/communications/conversations'],
    queryFn: async () => {
      const response = await fetch('/api/communications/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      return data;
    },
    staleTime: 30000 // 30 seconds
  });

  // Get messages between two users
  const getMessages = (otherUserId: number) => {
    return useQuery({
      queryKey: [`/api/communications/messages/${userId}/${otherUserId}`],
      queryFn: async () => {
        const response = await fetch(`/api/communications/messages/${userId}/${otherUserId}`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        return data;
      },
      staleTime: 10000 // 10 seconds
    });
  };

  // Send a message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: number; content: string; type?: MessageType }) => {
      const response = await fetch('/api/communications/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: userId,
          receiverId: data.receiverId,
          content: data.content,
          type: data.type || 'text',
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch messages between these users
      queryClient.invalidateQueries({ 
        queryKey: [`/api/communications/messages/${userId}/${variables.receiverId}`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/communications/conversations'] 
      });
    },
  });

  // Mark a message as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/communications/messages/${messageId}/read`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark message as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations'] });
    },
  });

  // Mark all messages from a user as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      const response = await fetch(`/api/communications/messages/read-all/${otherUserId}/${userId}`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark all messages as read');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/communications/messages/${userId}/${variables}`] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations'] });
    },
  });

  // Send a message via the WebSocket
  const sendMessage = useCallback((receiverId: number, content: string, type: MessageType = 'text') => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'message',
        message: {
          senderId: userId,
          receiverId,
          content,
          type,
        },
      }));
    }
    
    // Also send via HTTP for persistence
    sendMessageMutation.mutate({ receiverId, content, type });
  }, [socket, userId, sendMessageMutation]);

  // Handle incoming call
  const handleIncomingCall = (data: any) => {
    setIncomingCall(data);
    // Play ringtone
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(err => console.error('Error playing ringtone:', err));
    // Store audio element to stop it later
    (window as any).ringtone = audio;
  };

  // Handle call answer
  const handleCallAnswer = async (data: any) => {
    // Stop ringtone if it's playing
    if ((window as any).ringtone) {
      (window as any).ringtone.pause();
      (window as any).ringtone = null;
    }

    if (peerConnection.current && data.answer) {
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Remote description set successfully after answer');
      } catch (error) {
        console.error('Error setting remote description after answer:', error);
      }
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = (data: any) => {
    if (peerConnection.current && data.candidate) {
      try {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(e => console.error('Error adding ice candidate:', e));
      } catch (error) {
        console.error('Error creating ICE candidate:', error);
      }
    }
  };

  // Handle call end
  const handleCallEnd = () => {
    // Stop ringtone if it's playing
    if ((window as any).ringtone) {
      (window as any).ringtone.pause();
      (window as any).ringtone = null;
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Stop media streams
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    if (remoteStream.current) {
      remoteStream.current.getTracks().forEach(track => track.stop());
      remoteStream.current = null;
    }

    setActiveCall(null);
    setIncomingCall(null);
  };

  // Start a call
  const startCall = async (receiverId: number, type: 'audio' | 'video') => {
    try {
      // Create a new RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnection.current = pc;

      // Get local media stream
      const constraints = {
        audio: true,
        video: type === 'video',
      };
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);

      // Add tracks to the peer connection
      localStream.current.getTracks().forEach(track => {
        if (localStream.current && peerConnection.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });

      // Set up remote stream
      remoteStream.current = new MediaStream();
      
      // Handle ICE candidate events
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'call-candidate',
            candidate: event.candidate,
            receiverId,
            callerId: userId,
          }));
        }
      };

      // Handle track events to get remote stream
      pc.ontrack = (event) => {
        if (remoteStream.current) {
          event.streams[0].getTracks().forEach(track => {
            if (remoteStream.current) {
              remoteStream.current.addTrack(track);
            }
          });
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send the offer to the receiver
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'call-offer',
          callerId: userId,
          receiverId,
          type,
          offer,
        }));
      }

      setActiveCall({
        callerId: userId,
        receiverId,
        type,
        offer,
      });

      return { localStream: localStream.current, remoteStream: remoteStream.current };
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Call Failed',
        description: 'Could not start the call. Please check your camera and microphone permissions.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Answer a call
  const answerCall = async () => {
    if (!incomingCall) return;

    try {
      // Stop ringtone if it's playing
      if ((window as any).ringtone) {
        (window as any).ringtone.pause();
        (window as any).ringtone = null;
      }

      // Create a new RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnection.current = pc;

      // Get local media stream
      const constraints = {
        audio: true,
        video: incomingCall.type === 'video',
      };
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);

      // Add tracks to the peer connection
      localStream.current.getTracks().forEach(track => {
        if (localStream.current && peerConnection.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });

      // Set up remote stream
      remoteStream.current = new MediaStream();

      // Handle ICE candidate events
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'call-candidate',
            candidate: event.candidate,
            receiverId: incomingCall.callerId,
            callerId: userId,
          }));
        }
      };

      // Handle track events to get remote stream
      pc.ontrack = (event) => {
        if (remoteStream.current) {
          event.streams[0].getTracks().forEach(track => {
            if (remoteStream.current) {
              remoteStream.current.addTrack(track);
            }
          });
        }
      };

      // Set remote description from the offer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send the answer to the caller
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'call-answer',
          callerId: incomingCall.callerId,
          receiverId: userId,
          answer,
        }));
      }

      setActiveCall(incomingCall);
      setIncomingCall(null);

      return { localStream: localStream.current, remoteStream: remoteStream.current };
    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: 'Call Failed',
        description: 'Could not answer the call. Please check your camera and microphone permissions.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Reject a call
  const rejectCall = () => {
    if (!incomingCall) return;

    // Stop ringtone if it's playing
    if ((window as any).ringtone) {
      (window as any).ringtone.pause();
      (window as any).ringtone = null;
    }

    // Send call-end signal to the caller
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'call-end',
        callerId: incomingCall.callerId,
        receiverId: userId,
      }));
    }

    setIncomingCall(null);
  };

  // End a call
  const endCall = () => {
    if (!activeCall) return;

    // Send call-end signal to the other user
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'call-end',
        callerId: userId,
        receiverId: activeCall.callerId === userId ? activeCall.receiverId : activeCall.callerId,
      }));
    }

    handleCallEnd();
  };

  return {
    conversations,
    conversationsLoading,
    onlineUsers,
    getMessages,
    sendMessage,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    activeCall,
    incomingCall,
    localStream: localStream.current,
    remoteStream: remoteStream.current,
  };
}