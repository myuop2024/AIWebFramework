import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast'; // Assuming this path is correct

// --- Constants for WebSocket Message Types ---
const WS_MSG_TYPES = {
  REGISTER: 'register',
  USERS_LIST: 'users',
  NEW_MESSAGE: 'message',
  CALL_OFFER: 'call-offer',
  CALL_ANSWER: 'call-answer',
  CALL_CANDIDATE: 'call-candidate',
  CALL_END: 'call-end',
} as const;

// --- Type Definitions ---
export type MessageType = 'text' | 'file' | 'image' | 'system';

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: MessageType;
  sentAt: Date; // Consider string if your API returns ISO strings, then parse to Date
  read: boolean;
}

export interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  status: 'online' | 'offline' | 'away';
  profileImage?: string;
  role?: string;
  parish?: string;
}

export interface CallData {
  callerId: number;
  receiverId: number;
  type: 'audio' | 'video';
  offer?: RTCSessionDescriptionInit; // More specific type
  answer?: RTCSessionDescriptionInit; // More specific type
  candidate?: RTCIceCandidateInit | RTCIceCandidate; // More specific type
}

// For WebSocket messages
interface WebSocketMessageBase {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow other properties but prefer more specific types if possible
}

interface WebSocketUsersMessage extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.USERS_LIST;
  users: User[];
}

interface WebSocketNewMessage extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.NEW_MESSAGE;
  message: Message;
}

interface WebSocketCallOfferMessage extends CallData, WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.CALL_OFFER;
}
interface WebSocketCallAnswerMessage extends CallData, WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.CALL_ANSWER;
}
interface WebSocketCallCandidateMessage extends CallData, WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.CALL_CANDIDATE;
}
interface WebSocketCallEndMessage extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.CALL_END;
  callerId?: number; // Optional, for identifying who ended/rejected
  receiverId?: number; // Optional
}

type ParsedWebSocketMessage =
  | WebSocketUsersMessage
  | WebSocketNewMessage
  | WebSocketCallOfferMessage
  | WebSocketCallAnswerMessage
  | WebSocketCallCandidateMessage
  | WebSocketCallEndMessage;


// --- API Response Types (Assumed) ---
interface Conversation {
  userId: number;
  username: string;
  lastMessage: string;
  lastMessageAt: string; // Or Date
  lastMessageType: MessageType;
  unreadCount: number;
  // Add other properties as returned by your API
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

  // Use state for streams to trigger re-renders in consuming components
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ringtoneAudio = useRef<HTMLAudioElement | null>(null); // Ref for ringtone

  // --- WebSocket Connection and Management ---
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout | null = null;
    let wsInstance: WebSocket | null = null;
    let isUnmounting = false;

    const connectWebSocket = () => {
      if (isUnmounting || (wsInstance && wsInstance.readyState === WebSocket.OPEN)) {
        // Don't reconnect if unmounting or already open
        return;
      }

      if (wsInstance) {
        wsInstance.close(); // Ensure old instance is closed before creating new
      }

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log(`Connecting to WebSocket at ${wsUrl}... (User ID: ${userId})`);
        wsInstance = new WebSocket(wsUrl);
        setSocket(wsInstance); // Set socket state early for other parts of the hook

        wsInstance.onopen = () => {
          console.log('WebSocket connected successfully');
          if (wsInstance?.readyState === WebSocket.OPEN) {
            wsInstance.send(JSON.stringify({ type: WS_MSG_TYPES.REGISTER, userId }));
          }
        };

        wsInstance.onclose = (event) => {
          console.log(`WebSocket disconnected with code: ${event.code}, reason: ${event.reason}`);
          setSocket(null); // Clear socket state
          if (!isUnmounting && document.visibilityState !== 'hidden' && !reconnectTimer) {
            console.log('Scheduling WebSocket reconnection...');
            // Implement exponential backoff for better reconnection strategy
            reconnectTimer = setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
            }, 3000 + Math.random() * 2000); // Basic backoff with jitter
          }
        };

        wsInstance.onerror = (error) => {
          console.error('WebSocket error:', error);
          // wsInstance.onclose will likely be called after this, triggering reconnection logic
        };

        wsInstance.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as ParsedWebSocketMessage; // Added type assertion
            console.log('WebSocket message received:', data);

            switch (data.type) {
              case WS_MSG_TYPES.USERS_LIST:
                setOnlineUsers(data.users);
                break;
              case WS_MSG_TYPES.NEW_MESSAGE:
                // Invalidate queries to refresh message list
                // Ensure query keys match those used in useGetMessages
                queryClient.invalidateQueries({ queryKey: [`/api/communications/messages/${data.message.senderId}`] });
                queryClient.invalidateQueries({ queryKey: [`/api/communications/messages/${data.message.receiverId}`] }); // Also invalidate for receiver if current user is receiver
                queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations'] });

                if (data.message.senderId !== userId) {
                  // Find sender from the most recent onlineUsers list or fetch if necessary
                  const currentOnlineUsers = queryClient.getQueryData<User[]>(['/api/communications/online-users']) || onlineUsers;
                  const sender = currentOnlineUsers.find(user => user.id === data.message.senderId);
                  toast({
                    title: `New message from ${sender?.username || `User ${data.message.senderId}`}`,
                    description: data.message.type === 'text'
                      ? (data.message.content.length > 50 ? `${data.message.content.substring(0, 50)}...` : data.message.content)
                      : `New ${data.message.type} message`,
                    variant: 'default',
                  });
                }
                break;
              case WS_MSG_TYPES.CALL_OFFER:
                handleIncomingCall(data as CallData); // Cast to CallData
                break;
              case WS_MSG_TYPES.CALL_ANSWER:
                handleCallAnswer(data as CallData); // Cast to CallData
                break;
              case WS_MSG_TYPES.CALL_CANDIDATE:
                handleIceCandidate(data as CallData); // Cast to CallData
                break;
              case WS_MSG_TYPES.CALL_END:
                handleCallEnd(data.receiverId === userId || data.callerId === userId); // Pass if current user was part of the call
                break;
              default:
                console.warn('Received unknown WebSocket message type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
          }
        };
      } catch (error) {
        console.error('Error initializing WebSocket connection:', error);
        if (!isUnmounting && !reconnectTimer) {
          reconnectTimer = setTimeout(connectWebSocket, 5000); // Retry after a longer delay on init error
        }
      }
    };

    connectWebSocket();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!wsInstance || wsInstance.readyState !== WebSocket.OPEN)) {
        console.log('Tab became visible, ensuring WebSocket is connected...');
        connectWebSocket();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isUnmounting = true;
      console.log('Cleaning up WebSocket connection...');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (wsInstance) {
        wsInstance.onclose = null; // Prevent reconnection logic on manual close
        wsInstance.onerror = null;
        wsInstance.onmessage = null;
        wsInstance.onopen = null;
        wsInstance.close();
      }
      setSocket(null);
      // Clean up WebRTC resources if any are active
      handleCallEnd(true); // Force cleanup on unmount
    };
    // IMPORTANT: Dependencies for WebSocket useEffect.
    // queryClient and toast are generally stable. userId should trigger re-connect if it changes.
    // onlineUsers was removed as it caused too many reconnections.
  }, [userId, queryClient, toast]); // Removed onlineUsers

  // --- React Query Hooks for Data Fetching & Mutations ---

  // Get recent conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[], Error>({
    queryKey: ['/api/communications/conversations', userId], // Added userId to make it user-specific
    queryFn: async () => {
      const response = await fetch(`/api/communications/conversations`); // Assuming API takes userId from session or token
      if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });

  // Factory for creating messages query options
  const getMessagesQueryOptions = useCallback((otherUserId: number | null) => ({
    queryKey: [`/api/communications/messages`, otherUserId], // Simpler, more specific query key
    queryFn: async (): Promise<Message[]> => {
      if (!otherUserId) return [];
      const response = await fetch(`/api/communications/messages/${otherUserId}`); // API implies messages with this other user
      if (!response.ok) throw new Error(`Failed to fetch messages: ${response.statusText}`);
      return response.json();
    },
    staleTime: 10000, // 10 seconds
    enabled: !!otherUserId,
  }), []);

  const useGetMessages = (otherUserId: number | null) => {
    return useQuery<Message[], Error>(getMessagesQueryOptions(otherUserId));
  };

  // Send a message
  const sendMessageMutation = useMutation<Message, Error, { receiverId: number; content: string; type?: MessageType }>({
    mutationFn: async (data) => {
      const response = await fetch('/api/communications/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: userId,
          receiverId: data.receiverId,
          content: data.content,
          type: data.type || 'text',
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to send message' }));
        throw new Error(errorData.message || `Failed to send message: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (newMessage, variables) => {
      // Optimistically update or invalidate
      queryClient.invalidateQueries({ queryKey: [`/api/communications/messages`, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations', userId] });
    },
    // onError handled by the caller (sendMessage function)
  });

  // Mark a message as read (individual)
  const markAsReadMutation = useMutation<void, Error, number>({
    mutationFn: async (messageId) => {
      const response = await fetch(`/api/communications/messages/${messageId}/read`, { method: 'PUT' });
      if (!response.ok) throw new Error('Failed to mark message as read');
      // No need to return response.json() if the body is empty or not used
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api/communications/conversations', userId] });
      // Potentially invalidate specific message list if needed, though conversation list update might cover it
    },
  });

  // Mark all messages from a user as read
  const markAllAsReadMutation = useMutation<void, Error, number>({
    mutationFn: async (otherUserId) => {
      const response = await fetch(`/api/communications/messages/read-all/${otherUserId}`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to mark all messages as read');
    },
    onSuccess: (_, otherUserId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/communications/messages`, otherUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations', userId] });
      console.log(`Marked all messages from user ${otherUserId} as read`);
    },
  });


  // --- Combined Message Sending Logic ---
  const sendMessage = useCallback((receiverId: number, content: string, type: MessageType = 'text') => {
    console.log(`Sending message to ${receiverId}: "${content.substring(0,30)}..." (${type})`);

    sendMessageMutation.mutate(
      { receiverId, content, type },
      {
        onSuccess: (data) => {
          console.log('Message persisted successfully via HTTP:', data);
          // WebSocket send for real-time, if HTTP was successful
          if (socket?.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({
                type: WS_MSG_TYPES.NEW_MESSAGE,
                message: { // Construct a message object similar to what's received
                  id: data.id, // Use ID from HTTP response if available
                  senderId: userId,
                  receiverId,
                  content,
                  type,
                  sentAt: new Date(), // Or use server timestamp from data
                  read: false,
                },
              }));
            } catch (wsError) {
              console.error('Error sending message via WebSocket after HTTP success:', wsError);
            }
          } else {
            console.warn('WebSocket not connected. Message persisted via HTTP.');
          }
        },
        onError: (error) => {
          console.error('Error sending message via HTTP:', error);
          toast({
            title: 'Message Not Sent',
            description: error.message || 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  }, [socket, userId, sendMessageMutation, toast]); // queryClient removed as mutation handles invalidation


  // --- WebRTC Call Handling ---

  const playRingtone = () => {
    if (!ringtoneAudio.current) {
      ringtoneAudio.current = new Audio('/sounds/ringtone.mp3'); // Ensure this path is correct
      ringtoneAudio.current.loop = true;
    }
    ringtoneAudio.current.play().catch(err => console.error('Error playing ringtone:', err));
  };

  const stopRingtone = () => {
    if (ringtoneAudio.current) {
      ringtoneAudio.current.pause();
      ringtoneAudio.current.currentTime = 0; // Reset for next play
    }
  };

  const handleIncomingCall = useCallback((data: CallData) => {
    // Prevent handling if already in a call or if it's a self-call
    if (activeCall || incomingCall || data.callerId === userId) {
        console.warn("Already in a call or duplicate incoming call ignored.");
        // Optionally send a "busy" signal back
        if (socket?.readyState === WebSocket.OPEN && data.callerId !== userId) {
            socket.send(JSON.stringify({ type: 'call-busy', receiverId: data.callerId, callerId: userId }));
        }
        return;
    }
    setIncomingCall(data);
    playRingtone();
  }, [activeCall, incomingCall, userId, socket]);

  const handleCallAnswer = useCallback(async (data: CallData) => {
    stopRingtone();
    if (peerConnection.current && data.answer) {
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Remote description set successfully after answer');
        // The call is now established
        setActiveCall(prev => prev ? {...prev, answer: data.answer} : null); // Update active call state
      } catch (error) {
        console.error('Error setting remote description after answer:', error);
        toast({ title: "Call Connection Error", description: "Failed to establish call.", variant: "destructive" });
        handleCallEnd(true);
      }
    }
  }, [toast]);


  const handleIceCandidate = useCallback((data: CallData) => {
    if (peerConnection.current && data.candidate) {
      try {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(e => console.error('Error adding received ICE candidate:', e));
      } catch (error) {
        console.error('Error creating received ICE candidate object:', error);
      }
    }
  }, []);


  const cleanupPeerConnection = () => {
    if (peerConnection.current) {
      peerConnection.current.onicecandidate = null;
      peerConnection.current.ontrack = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
  };

  const handleCallEnd = useCallback((isCurrentUserInvolved = true) => {
    stopRingtone();
    if (isCurrentUserInvolved) { // Only cleanup if this user was part of the call
        cleanupPeerConnection();
        setActiveCall(null);
        setIncomingCall(null); // Clear incoming call as well
        console.log('Call ended and resources cleaned up.');
    }
  }, [localStream, remoteStream]); // Dependencies for streams if they are directly used in cleanup

  const initializePeerConnection = useCallback((callReceiverId: number, callType: 'audio' | 'video', isInitiator: boolean) => {
    cleanupPeerConnection(); // Ensure any old connection is closed

    const pc = new RTCPeerConnection({
      iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ],
    });
    peerConnection.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: WS_MSG_TYPES.CALL_CANDIDATE,
          candidate: event.candidate,
          receiverId: callReceiverId, // The other party
          callerId: userId, // This user
        }));
      }
    };

    pc.ontrack = (event) => {
      const newRemoteStream = new MediaStream();
      event.streams[0].getTracks().forEach(track => newRemoteStream.addTrack(track));
      setRemoteStream(newRemoteStream);
    };

    // If not initiator, remote stream might already be set up by offer
    if (isInitiator) {
        setRemoteStream(new MediaStream()); // Initialize empty remote stream for initiator
    }


    return pc;
  }, [socket, userId, cleanupPeerConnection]); // Added cleanupPeerConnection

  const startCall = async (receiverId: number, type: 'audio' | 'video') => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        toast({ title: "Cannot Start Call", description: "Not connected to server.", variant: "destructive" });
        return null;
    }
    if (activeCall || incomingCall) {
        toast({ title: "Cannot Start Call", description: "You are already in a call or have an incoming call.", variant: "destructive" });
        return null;
    }

    try {
      const pc = initializePeerConnection(receiverId, type, true);

      const mediaConstraints = { audio: true, video: type === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.send(JSON.stringify({
        type: WS_MSG_TYPES.CALL_OFFER,
        callerId: userId,
        receiverId,
        type,
        offer,
      }));

      setActiveCall({ callerId: userId, receiverId, type, offer });
      return { localStream: stream, remoteStream }; // Return current remoteStream state
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Call Failed',
        description: (error as Error).message || 'Check camera/microphone permissions.',
        variant: 'destructive',
      });
      handleCallEnd(true); // Cleanup on error
      return null;
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !socket || socket.readyState !== WebSocket.OPEN) {
        toast({ title: "Cannot Answer Call", description: incomingCall ? "Not connected to server." : "No incoming call.", variant: "destructive"});
        return null;
    }
    stopRingtone();

    try {
      const pc = initializePeerConnection(incomingCall.callerId, incomingCall.type, false);

      const mediaConstraints = { audio: true, video: incomingCall.type === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer!)); // Offer must exist
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.send(JSON.stringify({
        type: WS_MSG_TYPES.CALL_ANSWER,
        callerId: incomingCall.callerId,
        receiverId: userId,
        answer,
        type: incomingCall.type, // Include call type in answer message
      }));

      setActiveCall({ ...incomingCall, receiverId: userId, answer }); // Current user is receiver
      setIncomingCall(null);
      return { localStream: stream, remoteStream }; // Return current remoteStream state
    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: 'Call Answer Failed',
        description: (error as Error).message || 'Check camera/microphone permissions.',
        variant: 'destructive',
      });
      handleCallEnd(true); // Cleanup on error
      return null;
    }
  };

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingtone();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: WS_MSG_TYPES.CALL_END, // Use CALL_END to signify rejection before connection
        callerId: incomingCall.callerId, // Who was calling
        receiverId: userId, // Who is rejecting
        reason: 'rejected'
      }));
    }
    setIncomingCall(null);
  }, [incomingCall, socket, userId]);

  const endCall = useCallback(() => {
    if (!activeCall) return;
    // Determine the other party
    const otherPartyId = activeCall.callerId === userId ? activeCall.receiverId : activeCall.callerId;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: WS_MSG_TYPES.CALL_END,
        callerId: userId, // This user initiated the end
        receiverId: otherPartyId,
        reason: 'ended'
      }));
    }
    handleCallEnd(true); // Clean up local resources immediately
  }, [activeCall, socket, userId, handleCallEnd]);


  return {
    conversations,
    conversationsLoading,
    onlineUsers,
    useGetMessages,
    sendMessage,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    activeCall,
    incomingCall,
    localStream, // Now a state variable
    remoteStream, // Now a state variable
    isSocketConnected: socket?.readyState === WebSocket.OPEN,
  };
}