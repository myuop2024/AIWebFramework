import { useEffect, useRef, useState, useCallback } from "react";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import { PeerJSConnection } from "./peerjs-helper";

// Message types
export type MessageType = 'text' | 'file' | 'notification' | 'system';

export interface ChatMessage {
  id?: string;
  type: MessageType;
  senderId?: number;
  receiverId?: number;
  content: string;
  timestamp: Date;
  messageId?: number;
  fileInfo?: FileInfo | null;
}

// File information for sharing
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  data?: string | ArrayBuffer | null;
}

// User status - online/offline
export interface UserStatus {
  userId: number;
  status: 'online' | 'offline';
}

// Call information
export interface CallInfo {
  callId: string;
  callerId: number;
  receiverId: number;
  callType: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  startTime?: Date;
  endTime?: Date;
}

// Communication hook options
interface UseCommunicationOptions {
  userId?: number | null;
  onMessage?: (message: ChatMessage) => void;
  onStatusChange?: (status: UserStatus) => void;
  onCallState?: (callInfo: CallInfo) => void;
  onFileReceived?: (fileInfo: FileInfo) => void;
  autoReconnect?: boolean;
}

// Define our WebSocket type for our use case
export type WebSocketType = WebSocket;

export function useCommunication(options: UseCommunicationOptions = {}) {
  const {
    userId,
    onMessage,
    onStatusChange,
    onCallState,
    onFileReceived,
    autoReconnect = true
  } = options;
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  
  // Socket reference
  const socketRef = useRef<WebSocketType | null>(null);
  
  // Call state
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerJSRef = useRef<PeerJSConnection | null>(null);
  
  // File transfer state
  const [fileTransfers, setFileTransfers] = useState<Map<string, FileInfo>>(new Map());
  
  // Connection management
  const isConnectingRef = useRef(false);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 3;
  
  // Function to safely cleanup any pending connection attempts
  const cleanupPendingConnections = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);
  
  // Reset connection state
  const resetConnectionState = useCallback(() => {
    isConnectingRef.current = false;
    reconnectAttemptRef.current = 0;
    cleanupPendingConnections();
  }, [cleanupPendingConnections]);
  
  // Safely disconnect socket
  const safeDisconnectSocket = useCallback(() => {
    try {
      if (socketRef.current) {
        // Check if WebSocket is still open or connecting
        if (socketRef.current.readyState === WebSocket.OPEN || 
            socketRef.current.readyState === WebSocket.CONNECTING) {
          console.log('Closing WebSocket connection...');
          socketRef.current.close();
        }
        socketRef.current = null;
      }
    } catch (err) {
      console.error('Error safely disconnecting socket:', err);
    }
  }, []);
  
  // End an active call
  const endCall = useCallback((): boolean => {
    if (!activeCall) {
      return false;
    }
    
    try {
      // Close PeerJS connection - it handles media stream cleanup
      if (peerJSRef.current) {
        peerJSRef.current.endCall();
        peerJSRef.current = null;
      } else {
        // Manual cleanup if PeerJS not initialized
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        
        setRemoteStream(null);
      }
      
      // Update call status
      const updatedCall: CallInfo = {
        ...activeCall,
        status: 'ended',
        endTime: new Date()
      };
      
      if (onCallState) {
        onCallState(updatedCall);
      }
      
      // Clean up call state after a delay
      setTimeout(() => {
        setActiveCall(null);
      }, 1000);
      
      return true;
    } catch (err) {
      setError('Failed to end call properly');
      console.error('Call end error:', err);
      return false;
    }
  }, [activeCall, localStream, onCallState]);
  
  // Disconnect from the Socket.io server
  const disconnect = useCallback(() => {
    // Clean up any active call
    if (activeCall) {
      endCall();
    }
    
    // Use the safe disconnect method
    safeDisconnectSocket();
    setIsConnected(false);
  }, [activeCall, safeDisconnectSocket, endCall]);
  
  // Initialize PeerJS connection
  const initializePeerConnection = useCallback(async (
    peerId: number, 
    callType: 'audio' | 'video',
    isInitiator: boolean
  ): Promise<boolean> => {
    try {
      if (!socketRef.current) {
        setError('Socket connection not established');
        return false;
      }
      
      // Create PeerJS connection
      const peerConnection = new PeerJSConnection(socketRef.current);
      peerJSRef.current = peerConnection;
      
      // Initialize with media options
      const stream = await peerConnection.initializeCall(peerId, callType, isInitiator);
      
      // Set local stream
      setLocalStream(stream);
      
      // Handle remote stream
      peerConnection.onRemoteStream((remoteMediaStream) => {
        setRemoteStream(remoteMediaStream);
      });
      
      return true;
    } catch (err) {
      setError('Failed to establish call connection');
      console.error('PeerJS initialization error:', err);
      
      // Clean up any partial connection
      if (peerJSRef.current) {
        peerJSRef.current.endCall();
        peerJSRef.current = null;
      }
      
      return false;
    }
  }, []);
  
  // Connect to WebSocket server with improved error handling
  const connect = useCallback(() => {
    // Don't proceed if no user ID is available
    if (!userId) {
      console.debug('Not connecting: No userId available');
      return;
    }
    
    // Don't create a new connection if one already exists
    if (socketRef.current) {
      console.debug('Not connecting: Socket already exists');
      return;
    }
    
    try {
      // Create new WebSocket connection using the native WebSocket API
      console.debug('Attempting to connect to WebSocket server with path: /ws');
      
      // Check if WebSocket is supported
      if (!('WebSocket' in window)) {
        console.error('WebSocket is not supported by this browser');
        setError('WebSocket is not supported by this browser');
        return;
      }
      
      // Set up the WebSocket connection with the correct protocol based on https/http
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log(`Connecting to WebSocket at: ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      
      // Store the native WebSocket in the ref
      socketRef.current = socket;
      
      // Debug connection details
      console.log('WebSocket connection attempt', {
        url: wsUrl,
        userId,
        currentSocketState: socket.readyState
      });
      
      // Connection opened
      socket.addEventListener('open', () => {
        console.log('WebSocket connection successful');
        setIsConnected(true);
        setError(null);
        
        // Authenticate with user ID
        console.log(`Sending auth event with userId: ${userId}`);
        // Use send with JSON string instead of emit
        socket.send(JSON.stringify({
          type: 'auth',
          userId: userId
        }));
        console.log('Auth event sent');
      });
      
      // Handle connection close
      socket.addEventListener('close', (event) => {
        console.log('WebSocket closed, code:', event.code, 'reason:', event.reason);
        setIsConnected(false);
        
        // Clean up any active calls
        if (activeCall) {
          endCall();
        }
        
        // Set socket reference to null after disconnection
        if (socketRef.current) {
          socketRef.current = null;
        }
        
        // For ALL disconnect reasons, don't attempt automatic reconnection
        // This breaks the reconnection loop by letting the parent useEffect
        // handle reconnection only when appropriate
        console.log(`WebSocket disconnected (${event.reason}), no automatic reconnection`);
        
        // Reset connecting state to allow new connection attempts from parent logic
        isConnectingRef.current = false;
      });
      
      // Handle connection errors 
      socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        
        setError(`Connection error`);
        setIsConnected(false);
      });
      
      // Handle incoming messages (all message types come through here)
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case 'notification':
              if (onMessage) {
                onMessage({
                  id: uuidv4(),
                  type: 'notification',
                  content: data.content,
                  timestamp: new Date(data.timestamp)
                });
              }
              break;
              
            case 'message':
              if (onMessage) {
                const message: ChatMessage = {
                  id: uuidv4(),
                  type: 'text',
                  senderId: data.senderId,
                  receiverId: data.receiverId,
                  content: data.content,
                  timestamp: new Date(data.timestamp),
                  messageId: data.messageId || Date.now()
                };
                
                onMessage(message);
              }
              break;
              
            case 'error':
              setError(data.content);
              break;
            
            case 'user:status':
              const { userId: statusUserId, status } = data as UserStatus;
              
              // Update online users list
              if (status === 'online') {
                setOnlineUsers(prev => {
                  if (!prev.includes(statusUserId)) {
                    return [...prev, statusUserId];
                  }
                  return prev;
                });
              } else {
                setOnlineUsers(prev => prev.filter(id => id !== statusUserId));
              }
              
              // Forward status change to callback
              if (onStatusChange) {
                onStatusChange(data as UserStatus);
              }
              break;
              
            case 'online:users':
              setOnlineUsers(data.userIds || []);
              break;
              
            case 'call:incoming':
              const { callerId, callType } = data;
              
              // Create new call info
              const newCall: CallInfo = {
                callId: uuidv4(),
                callerId,
                receiverId: userId as number,
                callType,
                status: 'ringing'
              };
              
              setActiveCall(newCall);
              
              if (onCallState) {
                onCallState(newCall);
              }
              break;
              
            case 'call:response':
              if (!activeCall || activeCall.receiverId !== data.responderId) {
                break;
              }
              
              if (data.accepted) {
                // Call was accepted
                const updatedCall: CallInfo = {
                  ...activeCall,
                  status: 'accepted',
                  startTime: new Date()
                };
                
                setActiveCall(updatedCall);
                
                if (onCallState) {
                  onCallState(updatedCall);
                }
                
                // Initialize PeerJS connection as the caller
                initializePeerConnection(activeCall.receiverId, activeCall.callType, true);
              } else {
                // Call was rejected
                const updatedCall: CallInfo = {
                  ...activeCall,
                  status: 'rejected'
                };
                
                setActiveCall(updatedCall);
                
                if (onCallState) {
                  onCallState(updatedCall);
                }
                
                // Clean up call state
                setTimeout(() => {
                  setActiveCall(null);
                }, 1000);
              }
              break;
              
            case 'file:incoming':
              // Add to file transfers
              const fileInfo: FileInfo = {
                ...data.fileInfo,
                id: data.fileInfo.id || uuidv4()
              };
              
              setFileTransfers(prev => {
                const newMap = new Map(prev);
                newMap.set(fileInfo.id, fileInfo);
                return newMap;
              });
              
              // Notify through callback
              if (onFileReceived) {
                onFileReceived(fileInfo);
              }
              
              // Also notify via message
              if (onMessage) {
                onMessage({
                  id: uuidv4(),
                  type: 'file',
                  senderId: data.senderId,
                  content: `Shared a file: ${fileInfo.name}`,
                  timestamp: new Date(),
                  fileInfo
                });
              }
              break;
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      });
      
    } catch (err) {
      setError('Failed to establish communication connection');
      console.error('Communication connection error:', err);
    }
  }, [userId, activeCall, onMessage, onStatusChange, onCallState, onFileReceived, endCall, initializePeerConnection]);
  
  // Send a text message
  const sendMessage = useCallback((receiverId: number, content: string): boolean => {
    if (!socketRef.current || !isConnected) {
      setError('Not connected to communication server');
      return false;
    }
    
    try {
      // Use WebSocket send with JSON stringify
      socketRef.current.send(JSON.stringify({
        type: 'message',
        receiverId,
        content
      }));
      
      return true;
    } catch (err) {
      setError('Failed to send message');
      console.error('Message sending error:', err);
      return false;
    }
  }, [isConnected]);
  
  // Initialize an audio or video call
  const initiateCall = useCallback(async (receiverId: number, callType: 'audio' | 'video'): Promise<boolean> => {
    if (!socketRef.current || !isConnected) {
      setError('Not connected to communication server');
      return false;
    }
    
    // Check if recipient is online
    if (!onlineUsers.includes(receiverId)) {
      setError('User is offline');
      return false;
    }
    
    // Create a new call
    const newCall: CallInfo = {
      callId: uuidv4(),
      callerId: userId as number,
      receiverId,
      callType,
      status: 'ringing'
    };
    
    setActiveCall(newCall);
    
    try {
      // Send call request to recipient
      socketRef.current.send(JSON.stringify({
        type: 'call:init',
        receiverId,
        callType
      }));
      
      if (onCallState) {
        onCallState(newCall);
      }
      
      return true;
    } catch (err) {
      setError('Failed to initiate call');
      console.error('Call initiation error:', err);
      return false;
    }
  }, [isConnected, userId, onlineUsers, onCallState]);
  
  // Accept an incoming call
  const acceptCall = useCallback(async (): Promise<boolean> => {
    if (!activeCall || !socketRef.current || !isConnected) {
      setError('No active call to accept');
      return false;
    }
    
    try {
      // Update call status
      const updatedCall: CallInfo = {
        ...activeCall,
        status: 'accepted',
        startTime: new Date()
      };
      
      setActiveCall(updatedCall);
      
      // Send acceptance to caller
      socketRef.current.send(JSON.stringify({
        type: 'call:response',
        callerId: activeCall.callerId,
        accepted: true
      }));
      
      if (onCallState) {
        onCallState(updatedCall);
      }
      
      // Initialize peer connection as the call receiver
      await initializePeerConnection(activeCall.callerId, activeCall.callType, false);
      
      return true;
    } catch (err) {
      setError('Failed to accept call');
      console.error('Call acceptance error:', err);
      return false;
    }
  }, [activeCall, isConnected, onCallState, initializePeerConnection]);
  
  // Reject an incoming call
  const rejectCall = useCallback((): boolean => {
    if (!activeCall || !socketRef.current || !isConnected) {
      setError('No active call to reject');
      return false;
    }
    
    try {
      // Update call status
      const updatedCall: CallInfo = {
        ...activeCall,
        status: 'rejected'
      };
      
      setActiveCall(updatedCall);
      
      // Send rejection to caller
      socketRef.current.send(JSON.stringify({
        type: 'call:response',
        callerId: activeCall.callerId,
        accepted: false
      }));
      
      if (onCallState) {
        onCallState(updatedCall);
      }
      
      // Clean up call state
      setTimeout(() => {
        setActiveCall(null);
      }, 1000);
      
      return true;
    } catch (err) {
      setError('Failed to reject call');
      console.error('Call rejection error:', err);
      return false;
    }
  }, [activeCall, isConnected, onCallState]);
  
  // Share a file
  const shareFile = useCallback(async (receiverId: number, file: File): Promise<boolean> => {
    if (!socketRef.current || !isConnected) {
      setError('Not connected to communication server');
      return false;
    }
    
    try {
      // Create file info
      const fileId = uuidv4();
      const fileInfo: FileInfo = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type
      };
      
      // Read file as data URL for direct sharing
      const reader = new FileReader();
      
      // Wait for file to be read
      const fileData = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      
      // Add data to file info
      fileInfo.data = fileData;
      
      // Send file data to recipient
      socketRef.current.send(JSON.stringify({
        type: 'file:share',
        receiverId,
        fileInfo
      }));
      
      // Add to local file transfers
      setFileTransfers(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, fileInfo);
        return newMap;
      });
      
      // Notify via message
      if (onMessage) {
        onMessage({
          id: uuidv4(),
          type: 'file',
          senderId: userId as number, // Type assertion to satisfy type checker
          receiverId,
          content: `You shared a file: ${file.name}`,
          timestamp: new Date(),
          fileInfo
        });
      }
      
      return true;
    } catch (err) {
      setError('Failed to share file');
      console.error('File sharing error:', err);
      return false;
    }
  }, [isConnected, userId, onMessage]);
  
  // Download a shared file
  const downloadFile = useCallback((fileId: string): boolean => {
    try {
      const fileInfo = fileTransfers.get(fileId);
      
      if (!fileInfo || !fileInfo.data) {
        setError('File not found or no data available');
        return false;
      }
      
      // Use FileSaver to download the file
      const dataUrlParts = (fileInfo.data as string).split(',');
      const byteString = atob(dataUrlParts[1]);
      const mimeType = dataUrlParts[0].split(':')[1].split(';')[0];
      
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeType });
      saveAs(blob, fileInfo.name);
      
      return true;
    } catch (err) {
      setError('Failed to download file');
      console.error('File download error:', err);
      return false;
    }
  }, [fileTransfers]);
  
  // Use a ref to track if component is mounted to prevent updates after unmount
  const isMountedRef = useRef(true);
  
  // Keep track of the connection attempt count to prevent infinite loops
  const connectionAttemptCountRef = useRef(0);
  const MAX_CONNECTION_ATTEMPTS = 3;
  
  // Last connection attempt timestamp for rate limiting reconnects
  const lastConnectionAttemptRef = useRef<number>(0);
  const CONNECTION_ATTEMPT_COOLDOWN = 5000; // 5 seconds between reconnection attempts
  
  // Use another ref to track if we're actively in a connection cycle
  const isReconnectingRef = useRef<boolean>(false);
  
  // Connect and disconnect based on user ID changes with connection tracking
  useEffect(() => {
    // Set mounted flag - will be used in cleanup
    isMountedRef.current = true;
    
    // Function to attempt connection with proper tracking and cleanup
    const attemptConnection = () => {
      // Prevent connection attempts if component is unmounted
      if (!isMountedRef.current) return;
      
      // Enforce maximum connection attempts and rate limiting
      if (connectionAttemptCountRef.current >= MAX_CONNECTION_ATTEMPTS) {
        console.log(`Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached, stopping`);
        isConnectingRef.current = false;
        isReconnectingRef.current = false;
        return;
      }
      
      // Check if enough time has passed since the last attempt
      const now = Date.now();
      const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;
      
      if (timeSinceLastAttempt < CONNECTION_ATTEMPT_COOLDOWN) {
        console.log(`Connection attempt on cooldown. Waiting ${Math.ceil((CONNECTION_ATTEMPT_COOLDOWN - timeSinceLastAttempt)/1000)}s`);
        
        // Reschedule after cooldown period
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
        }
        
        connectTimeoutRef.current = setTimeout(attemptConnection, 
          CONNECTION_ATTEMPT_COOLDOWN - timeSinceLastAttempt);
        return;
      }
      
      // Update last attempt timestamp
      lastConnectionAttemptRef.current = now;
      
      // Increment attempt counter
      connectionAttemptCountRef.current++;
      console.log(`Connection attempt ${connectionAttemptCountRef.current}/${MAX_CONNECTION_ATTEMPTS}`);
      
      try {
        // Always ensure any previous socket is properly closed
        safeDisconnectSocket();
        
        // Create socket and register events
        connect();
        
        // With native WebSockets, connection is automatic after creation
        if (socketRef.current) {
          console.log('WebSocket connecting automatically');
          
          // Set a timeout to check if connection succeeded
          setTimeout(() => {
            if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
              console.log('Connection timeout - WebSocket did not connect within expected timeframe');
              safeDisconnectSocket();
              
              // If we're still mounting, try again
              if (isMountedRef.current && connectionAttemptCountRef.current < MAX_CONNECTION_ATTEMPTS) {
                console.log('Scheduling another connection attempt');
                connectTimeoutRef.current = setTimeout(attemptConnection, CONNECTION_ATTEMPT_COOLDOWN);
              }
            }
          }, 3000); // 3 second connection timeout
        }
      } catch (err) {
        console.error('Connection error in useEffect:', err);
        isConnectingRef.current = false;
      } finally {
        // Clear the timeout reference
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
      }
    };
    
    // Only attempt connection if userId exists
    if (userId) {
      // Don't attempt if already connecting or connected with a valid socket
      if (!isConnectingRef.current && !isConnected && !socketRef.current) {
        console.log('Initializing socket connection');
        
        // Set connecting flag to prevent multiple connection attempts
        isConnectingRef.current = true;
        
        // Reset connection attempt counter if we're not in a reconnection cycle
        if (!isReconnectingRef.current) {
          connectionAttemptCountRef.current = 0;
          isReconnectingRef.current = true;
        }
        
        // Schedule a connection attempt with delay to prevent rapid reconnection
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
        }
        
        // Use a shorter delay for initial connection
        connectTimeoutRef.current = setTimeout(attemptConnection, 1000);
      }
    } else {
      // If no userId, ensure we're disconnected and clean up
      cleanupPendingConnections();
      safeDisconnectSocket();
      resetConnectionState();
      connectionAttemptCountRef.current = 0;
      isReconnectingRef.current = false;
    }
    
    // Cleanup on component unmount
    return () => {
      // Mark component as unmounted to prevent state updates
      isMountedRef.current = false;
      
      // Clear any pending connection attempts
      cleanupPendingConnections();
      
      // Disconnect socket if it exists
      safeDisconnectSocket();
      
      // Reset connection state
      resetConnectionState();
      
      // Reset connection attempt counter
      connectionAttemptCountRef.current = 0;
      isReconnectingRef.current = false;
    };
  }, [userId, isConnected, connect, cleanupPendingConnections, resetConnectionState, safeDisconnectSocket]);
  
  return {
    isConnected,
    error,
    connect,
    disconnect,
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
  };
}