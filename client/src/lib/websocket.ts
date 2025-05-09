import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
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

// Define a more specific socket type to help TypeScript
type SocketIOType = Socket<any, any>;

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
  const socketRef = useRef<SocketIOType | null>(null);
  
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
        socketRef.current.disconnect();
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
  
  // Connect to the Socket.io server with improved error handling
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
      // Create new Socket.io connection
      console.debug('Attempting to connect to Socket.io server with path: /comms, socket.io path: /socket.io');
      
      // Determine best transport order based on browser capabilities
      const supportsWebSockets = 'WebSocket' in window && 
                                window.WebSocket.CLOSING === 2;
      
      const transports = supportsWebSockets ? 
        ['websocket', 'polling'] : 
        ['polling', 'websocket'];
      
      console.log(`Using transport order: [${transports.join(', ')}]`);
      
      // Initialize Socket.io with the namespace directly and enhanced options
      // Use fewer options to reduce complexity and potential conflicts
      const socket = io('/comms', {
        path: '/socket.io',
        transports,
        timeout: 20000,
        autoConnect: false,  // Important: We'll manually connect after setup
        reconnection: false,  // We'll handle reconnection ourselves
        forceNew: true,      // Create a new connection each time
        query: { 
          userId: userId,    // Send userId with initial connection
          clientTime: Date.now() 
        }
      });
      
      // Debug connection details
      console.log('Socket.io connection details:', {
        namespace: '/comms',
        path: '/socket.io',
        origin: window.location.origin
      });
      
      console.log('Socket.io connection attempt', {
        namespace: '/comms',
        path: '/socket.io',
        userId,
        currentSocketState: socketRef.current ? 'exists' : 'null'
      });
      
      socketRef.current = socket;
      
      // Connection event handlers
      socket.on('connect', () => {
        console.log('Socket.io connection successful, socketId:', socket.id);
        setIsConnected(true);
        setError(null);
        
        // Authenticate with user ID
        console.log(`Sending auth event with userId: ${userId}`);
        socket.emit('auth', { userId });
        console.log('Auth event sent');
      });
      
      // Handle disconnect with enhanced reconnection prevention
      socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected, reason:', reason);
        setIsConnected(false);
        
        // Clean up any active calls
        if (activeCall) {
          endCall();
        }
        
        // Set socket reference to null after disconnection
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        
        // For ALL disconnect reasons, don't attempt automatic reconnection
        // This breaks the reconnection loop by letting the parent useEffect
        // handle reconnection only when appropriate
        console.log(`Socket disconnected (${reason}), no automatic reconnection`);
        
        // Reset connecting state to allow new connection attempts from parent logic
        isConnectingRef.current = false;
        
        // For certain types of disconnects, we might want to add a larger delay
        // before allowing reconnection, handled in the parent useEffect
      });
      
      // Handle connection errors with enhanced recovery
      socket.on('connect_error', (err) => {
        console.error('Socket.io connection error:', err);
        
        // Safely extract error properties
        const errorDetails = {
          message: err.message || 'Unknown error',
          type: (err as any).type,
          description: (err as any).description,
          context: (err as any).context,
          stack: err.stack,
          connected: socket.connected,
          disconnected: socket.disconnected
        };
        
        console.error('Socket.io connection error details:', errorDetails);
        setError(`Connection error: ${errorDetails.message}`);
      });
      
      // Handle notifications
      socket.on('notification', (data) => {
        if (onMessage) {
          onMessage({
            id: uuidv4(),
            type: 'notification',
            content: data.content,
            timestamp: new Date(data.timestamp)
          });
        }
      });
      
      // Handle messages
      socket.on('message', (data) => {
        if (onMessage) {
          const message: ChatMessage = {
            id: uuidv4(),
            type: 'text',
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            timestamp: new Date(data.timestamp),
            messageId: data.messageId
          };
          
          onMessage(message);
        }
      });
      
      // Handle errors
      socket.on('error', (data) => {
        setError(data.message);
      });
      
      // Handle online users
      socket.on('online:users', (data) => {
        setOnlineUsers(data);
      });
      
      // Handle user status changes
      socket.on('user:status', (data: UserStatus) => {
        const { userId, status } = data;
        
        // Update online users list
        if (status === 'online') {
          setOnlineUsers(prev => {
            if (!prev.includes(userId)) {
              return [...prev, userId];
            }
            return prev;
          });
        } else {
          setOnlineUsers(prev => prev.filter(id => id !== userId));
        }
        
        // Forward status change to callback
        if (onStatusChange) {
          onStatusChange(data);
        }
      });
      
      // Handle incoming calls
      socket.on('call:incoming', (data) => {
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
      });
      
      // Handle call responses
      socket.on('call:response', (data) => {
        if (!activeCall || activeCall.receiverId !== data.receiverId) {
          return;
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
      });
      
      // Handle incoming files
      socket.on('file:incoming', async (data) => {
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
      socketRef.current.emit('message', {
        receiverId,
        content
      });
      
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
      socketRef.current.emit('call:init', {
        receiverId,
        callType
      });
      
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
      socketRef.current.emit('call:response', {
        callerId: activeCall.callerId,
        accepted: true
      });
      
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
      socketRef.current.emit('call:response', {
        callerId: activeCall.callerId,
        accepted: false
      });
      
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
      socketRef.current.emit('file:share', {
        receiverId,
        fileInfo
      });
      
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
  
  // Connect and disconnect based on user ID changes with connection tracking
  useEffect(() => {
    // Set mounted flag - will be used in cleanup
    isMountedRef.current = true;
    
    // Function to attempt connection with proper tracking and cleanup
    const attemptConnection = () => {
      // Prevent connection attempts if component is unmounted
      if (!isMountedRef.current) return;
      
      // Enforce maximum connection attempts
      if (connectionAttemptCountRef.current >= MAX_CONNECTION_ATTEMPTS) {
        console.log(`Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached, stopping`);
        isConnectingRef.current = false;
        return;
      }
      
      // Increment attempt counter
      connectionAttemptCountRef.current++;
      console.log(`Connection attempt ${connectionAttemptCountRef.current}/${MAX_CONNECTION_ATTEMPTS}`);
      
      try {
        // Create socket and register events
        connect();
        
        // Manually connect after all event handlers are registered
        if (socketRef.current) {
          console.log('Manually connecting socket');
          socketRef.current.connect();
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
        
        // Reset connection attempt counter
        connectionAttemptCountRef.current = 0;
        
        // Schedule a connection attempt with delay to prevent rapid reconnection
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
        }
        
        connectTimeoutRef.current = setTimeout(attemptConnection, 1000);
      }
    } else {
      // If no userId, ensure we're disconnected and clean up
      cleanupPendingConnections();
      safeDisconnectSocket();
      resetConnectionState();
      connectionAttemptCountRef.current = 0;
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