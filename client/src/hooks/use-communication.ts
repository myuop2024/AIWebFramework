import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast'; // Assuming this path is correct

// --- Constants for WebSocket Message Types ---
const WS_MSG_TYPES = {
  REGISTER: 'register',
  USERS_LIST: 'users',
  NEW_MESSAGE: 'message', // Sent by server when a new message arrives for this user
  MESSAGE_READ: 'message-read', // Sent by server when a message this user sent is read by recipient
  ALL_MESSAGES_READ: 'all-messages-read', // Sent by server when all messages this user sent to someone are read by recipient
  CALL_OFFER: 'call-offer',
  CALL_ANSWER: 'call-answer',
  CALL_CANDIDATE: 'call-candidate',
  CALL_END: 'call-end',
  HEARTBEAT: 'heartbeat', // Client-sent heartbeat
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
  callMediaType: 'audio' | 'video';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit | RTCIceCandidate;
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

interface WebSocketMessageRead extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.MESSAGE_READ;
  messageId: number;
  readBy: number; // User ID of the person who read the message
  // We also need to know who the original sender was to update their view correctly.
  // The backend currently sends messageId and readBy. The client (sender)
  // needs to find this message in its cache and mark it read.
}

interface WebSocketAllMessagesRead extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.ALL_MESSAGES_READ;
  by: number; // User ID of the person who read the messages (receiver of original messages)
  from: number; // User ID of the person whose messages were read (sender of original messages)
}

interface WebSocketCallOfferMessage extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.CALL_OFFER;
  callerId: number;
  receiverId: number;
  callMediaType: 'audio' | 'video';
  offer?: RTCSessionDescriptionInit;
}
interface WebSocketCallAnswerMessage extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.CALL_ANSWER;
  callerId: number;
  receiverId: number;
  callMediaType: 'audio' | 'video';
  answer?: RTCSessionDescriptionInit;
}
interface WebSocketCallCandidateMessage extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.CALL_CANDIDATE;
  callerId: number;
  receiverId: number;
  candidate?: RTCIceCandidateInit | RTCIceCandidate;
}
interface WebSocketCallEndMessage extends WebSocketMessageBase {
  type: typeof WS_MSG_TYPES.CALL_END;
  callerId?: number; // Optional, for identifying who ended/rejected
  receiverId?: number; // Optional
}

type ParsedWebSocketMessage =
  | WebSocketUsersMessage
  | WebSocketNewMessage
  | WebSocketMessageRead
  | WebSocketAllMessagesRead
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

  // Call management functions - moved before usage to fix initialization order
  const handleCallEnd = useCallback((isCurrentUserInvolved = true) => {
    stopRingtone();
    if (isCurrentUserInvolved) { // Only cleanup if this user was part of the call
        cleanupPeerConnection();
        setActiveCall(null);
        setIncomingCall(null); // Clear incoming call as well
    }
  }, [localStream, remoteStream]); // Dependencies for streams if they are directly used in cleanup

  // --- WebSocket Connection and Management ---
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let wsInstance: WebSocket | null = null;
    let isUnmounting = false;

    // Heartbeat to detect silent connection drops
    const startHeartbeat = (ws: WebSocket) => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }

      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            // Send a lightweight ping message with user ID to maintain connection
            ws.send(JSON.stringify({ type: 'heartbeat', userId }));
          } catch (e) {
            console.error('Failed to send heartbeat, connection might be dead:', e);
            ws.close();
          }
        } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          // Reconnect if connection is already closed
          connectWebSocket();
        }
      }, 10000); // Every 10 seconds - more frequent to ensure reliable connection
    };

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
        // Corrected WebSocket URL to match backend service path
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;
        console.log(`Connecting to WebSocket at ${wsUrl}... (User ID: ${userId})`);
        wsInstance = new WebSocket(wsUrl);
        setSocket(wsInstance); // Set socket state early for other parts of the hook

        wsInstance.onopen = () => {
          console.log('WebSocket connected successfully');
          if (wsInstance?.readyState === WebSocket.OPEN) {
            try {
              wsInstance.send(JSON.stringify({ type: WS_MSG_TYPES.REGISTER, userId }));
            } catch (e) {
              console.error("Failed to send register message on WebSocket open:", e);
              // Optionally, handle this error, e.g., by attempting to close and reconnect.
            }
            startHeartbeat(wsInstance);
          }
        };

        wsInstance.onclose = (event) => {
          console.log(`WebSocket disconnected with code: ${event.code}, reason: ${event.reason}`);
          setSocket(null); // Clear socket state

          // Always try to reconnect unless unmounting
          if (!isUnmounting) {
            // Clear any existing reconnection timer
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
            }

            const backoffTime = Math.min(
              30000, // Max 30 seconds
              1000 + Math.floor(Math.random() * 3000) // Base time with jitter
            );

            console.log(`Scheduling WebSocket reconnection in ${backoffTime}ms...`);
            reconnectTimer = setTimeout(() => {
              if (!isUnmounting && (document.visibilityState === 'visible' || document.visibilityState === 'prerender')) {
                console.log('Attempting to reconnect WebSocket...');
                connectWebSocket();
              }
            }, backoffTime);
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
                // Ensure query keys match those used in useGetMessages and conversation queries
                queryClient.invalidateQueries({ queryKey: [`/api/communications/messages`, data.message.senderId] });
                queryClient.invalidateQueries({ queryKey: [`/api/communications/messages`, data.message.receiverId] });
                queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations', userId] }); // User-specific conversation list

                if (data.message.senderId !== userId) {
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
                handleIncomingCall(data); // Pass WebSocketCallOfferMessage directly
                break;
              case WS_MSG_TYPES.CALL_ANSWER:
                handleCallAnswer(data); // Pass WebSocketCallAnswerMessage directly
                break;
              case WS_MSG_TYPES.CALL_CANDIDATE:
                handleIceCandidate(data); // Pass WebSocketCallCandidateMessage directly
                break;
              case WS_MSG_TYPES.CALL_END:
                handleCallEnd(data.receiverId === userId || data.callerId === userId); // Pass if current user was part of the call
                break;
              case WS_MSG_TYPES.MESSAGE_READ: {
                const { messageId, readBy } = data as WebSocketMessageRead;
                console.log(`Received message-read event: messageId ${messageId} read by ${readBy}`);
                // This event means a message *sent by the current user (userId)* to `readBy` was read.
                // Update the cache for messages between `userId` and `readBy`.
                queryClient.setQueryData<Message[]>(
                  [`/api/communications/messages`, readBy], // Query key for messages with the user who read it
                  (oldMessages) =>
                    oldMessages?.map(msg =>
                      msg.id === messageId && msg.senderId === userId && msg.receiverId === readBy
                        ? { ...msg, read: true }
                        : msg
                    ) || []
                );
                // Also invalidate conversations to update unread counts for the current user (though this specific event doesn't change unread for current user)
                // More importantly, it might affect the "last message read status" display in conversation list if that's a feature.
                queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations', userId] });
                break;
              }
              case WS_MSG_TYPES.ALL_MESSAGES_READ: {
                const { by, from } = data as WebSocketAllMessagesRead;
                console.log(`Received all-messages-read event: messages from ${from} read by ${by}`);
                // This event means all messages sent by `from` (current user if from === userId) to `by` were read.
                if (from === userId) {
                  // Messages sent by me to user `by` were all read.
                  queryClient.setQueryData<Message[]>(
                    [`/api/communications/messages`, by], // Query key for messages with user `by`
                    (oldMessages) =>
                      oldMessages?.map(msg =>
                        msg.senderId === userId && msg.receiverId === by
                          ? { ...msg, read: true }
                          : msg
                      ) || []
                  );
                  queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations', userId] });
                }
                break;
              }
              default:
                console.warn('Received unknown WebSocket message type:', (data as WebSocketMessageBase).type);
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
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
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
  }, [userId, queryClient, toast]);

  // --- React Query Hooks for Data Fetching & Mutations ---

  // Get recent conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[], Error>({
    queryKey: ['/api/communications/conversations', userId],
    queryFn: async () => {
      const response = await fetch(`/api/communications/conversations`);
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
          // senderId: userId, // Backend determines senderId from authenticated user
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
      // Invalidate relevant queries.
      // The backend POST handler should send a WS message to the recipient.
      // The sender's UI updates via these invalidations.
      queryClient.invalidateQueries({ queryKey: [`/api/communications/messages`, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: [`/api/communications/messages`, userId] }); // Also invalidate sender's message list with receiver for consistency
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations', userId] });
    },
    // onError handled by the caller (sendMessage function)
  });

  // Mark a message as read (individual)
  // Backend has PATCH /api/communications/messages/read with body { messageIds: [messageId] }
  const markAsReadMutation = useMutation<void, Error, { messageId: number }>({
    mutationFn: async ({ messageId }) => {
      const response = await fetch(`/api/communications/messages/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: [messageId] }),
      });
      if (!response.ok) throw new Error('Failed to mark message as read');
    },
    onSuccess: (_, variables) => {
      // Need to know the other user involved to correctly invalidate message cache.
      // This part is tricky without more context on how `markAsRead` is used.
      // For now, just invalidating conversations.
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations', userId] });
      // Potentially: queryClient.invalidateQueries({ queryKey: [`/api/communications/messages`, otherUserId] });
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
          // Client-side WebSocket send after HTTP POST is removed.
          // Backend's POST handler is responsible for notifying the recipient.
          // Sender's UI updates via query invalidation specified in sendMessageMutation.onSuccess.
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
  }, [sendMessageMutation, toast]); // Removed socket, userId, queryClient as direct dependencies


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

  const handleIncomingCall = useCallback((data: WebSocketCallOfferMessage) => {
    // Prevent handling if already in a call or if it's a self-call
    if (activeCall || incomingCall || data.callerId === userId) {
        console.warn("Already in a call or duplicate incoming call ignored.");
        // Optionally send a "busy" signal back
        if (socket?.readyState === WebSocket.OPEN && data.callerId !== userId) {
            socket.send(JSON.stringify({ type: 'call-busy', receiverId: data.callerId, callerId: userId }));
        }
        return;
    }
    // Construct CallData for incomingCall state
    setIncomingCall({ 
        callerId: data.callerId,
        receiverId: data.receiverId,
        callMediaType: data.callMediaType,
        offer: data.offer
    });
    playRingtone();
  }, [activeCall, incomingCall, userId, socket]);

  const handleCallAnswer = useCallback(async (data: WebSocketCallAnswerMessage) => {
    stopRingtone();
    if (peerConnection.current && data.answer) {
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Remote description set successfully after answer');
        // The call is now established
        setActiveCall(prev => prev ? {
             ...prev, 
             answer: data.answer, 
             // Ensure callMediaType from previous activeCall state (originating from offer) is preserved or correctly set
             callMediaType: prev.callMediaType 
            } : null); 
      } catch (error) {
        console.error('Error setting remote description after answer:', error);
        toast({ title: "Call Connection Error", description: "Failed to establish call.", variant: "destructive" });
        handleCallEnd(true); // handleCallEnd is called here
      }
    }
  }, [toast, handleCallEnd]);


  const handleIceCandidate = useCallback((data: WebSocketCallCandidateMessage) => {
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
        callMediaType: type,
        offer,
      }));

      setActiveCall({ callerId: userId, receiverId, callMediaType: type, offer });
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
      const pc = initializePeerConnection(incomingCall.callerId, incomingCall.callMediaType, false);

      const mediaConstraints = { audio: true, video: incomingCall.callMediaType === 'video' };
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
        callMediaType: incomingCall.callMediaType, // Include callMediaType in answer message
      }));

      setActiveCall({ ...incomingCall, receiverId: userId, answer }); // callMediaType is already in incomingCall
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