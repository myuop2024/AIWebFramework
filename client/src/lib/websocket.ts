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

export function useCommunication(options: UseCommunicationOptions = {}) {
  const {
    userId,
    onMessage,
    onStatusChange,
    onCallState,
    onFileReceived,
    autoReconnect = true,
  } = options;
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  
  // Socket reference
  const socketRef = useRef<Socket | null>(null);
  
  // Call state
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerJSRef = useRef<PeerJSConnection | null>(null);
  
  // File transfer state
  const [fileTransfers, setFileTransfers] = useState<Map<string, FileInfo>>(new Map());
  
  // Connect to the Socket.io server with improved error handling
  const connect = useCallback(() => {
    if (!userId) return;
    
    try {
      // Create new Socket.io connection
      // Match server configuration (path /socket.io with namespace /comms)
      console.log('Creating Socket.io connection with namespace /comms and path /socket.io');
      
      // Create a function to handle socket creation with better error handling
      const createSocket = () => {
        try {
          // Determine best transport order based on browser capabilities
          // Some environments perform better with specific transport orders
          const supportsWebSockets = 'WebSocket' in window && 
                                    window.WebSocket.CLOSING === 2; // Check for proper WebSocket implementation
          
          // Determine the appropriate transport order based on capabilities and previous errors
          const transports = supportsWebSockets ? 
            ['websocket', 'polling'] : // Prefer WebSocket if properly supported
            ['polling', 'websocket']; // Fall back to polling first otherwise
          
          console.log(`Using transport order: [${transports.join(', ')}]`);
          
          // Initialize Socket.io with the namespace directly and enhanced options
          const socket = io('/comms', {
            path: '/socket.io', // Must match the server's Socket.io path
            transports, // Use determined transport order
            reconnectionAttempts: 20, // Increased reconnection attempts for better resilience
            reconnectionDelay: 1000, // Start with a 1 second delay
            reconnectionDelayMax: 15000, // Maximum delay between reconnection attempts
            timeout: 90000, // 90 seconds connection timeout for slower networks
            autoConnect: true,
            forceNew: true, // Force a new connection to avoid reusing problematic connections
            randomizationFactor: 0.5, // Add randomization to reconnection attempts
            reconnection: true, // Explicitly enable reconnection
            upgrade: true, // Enable transport upgrades
            rememberUpgrade: true, // Remember successful transport upgrades
            extraHeaders: {}, // No extra headers needed, but included for future extension
            query: { clientTime: Date.now() } // Add timestamp to help with debugging
          });
          
          return socket;
        } catch (err) {
          console.error('Error creating socket connection:', err);
          setError(`Failed to create connection: ${err instanceof Error ? err.message : String(err)}`);
          return null;
        }
      };
      
      // Create socket with error handling
      const socket = createSocket();
      
      // If socket creation fails, abort
      if (!socket) {
        console.error('Failed to create socket, aborting connection');
        return;
      }
      
      // Debug connection details
      console.log('Socket.io connection details:', {
        namespace: '/comms',
        path: '/socket.io',
        origin: window.location.origin
      });
      
      // Log that we're attempting to connect
      console.debug('Attempting to connect to Socket.io server with path: /comms, socket.io path: /socket.io');
      
      // Log to help debug the connection issues
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
      
      // Handle disconnect with enhanced reconnection
      socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected, reason:', reason);
        setIsConnected(false);
        
        // Clean up any active calls
        if (activeCall) {
          endCall();
        }
        
        // Skip reconnection for voluntary disconnects to prevent reconnection loops
        if (reason === 'io client disconnect') {
          console.log('Client-initiated disconnect, not attempting reconnection');
          return;
        }
        
        // Handle specific disconnect reasons with custom recovery strategies
        // See: https://socket.io/docs/v4/client-socket-instance/#disconnect
        if (reason === 'io server disconnect') {
          // Server has forcefully disconnected us, we need to manually reconnect
          console.log('Server forced disconnect, attempting manual reconnection...');
          
          // Add delay to avoid immediate reconnection attempts which may fail
          setTimeout(() => {
            try {
              socket.connect();
            } catch (reconnectErr) {
              console.error('Error during manual reconnection after server disconnect:', reconnectErr);
              setError('Connection lost. Please refresh the page to reconnect.');
            }
          }, 2000); // 2 second delay
        } else if (reason === 'transport error') {
          // Transport errors may need special handling
          console.log('Transport error detected, attempting to switch transports');
          
          // Try to recover with different transport
          if (socket.io.opts && socket.io.opts.transports) {
            const currentTransports = socket.io.opts.transports as string[];
            
            // Check if websocket is the first transport
            if (currentTransports.indexOf('websocket') === 0) {
              console.log('Switching from WebSocket-first to polling-first transport');
              socket.io.opts.transports = ['polling', 'websocket'] as any;
            } else {
              console.log('Switching from polling-first to WebSocket-only transport');
              socket.io.opts.transports = ['websocket'] as any;
            }
          }
          
          // Socket.io will try to reconnect automatically for "transport error"
        } else if (reason === 'ping timeout') {
          // Ping timeout may indicate network instability
          console.log('Ping timeout detected, connection may be unstable');
          setError('Connection unstable. Attempting to reconnect...');
          
          // Socket.io will try to reconnect automatically for "ping timeout"
        }
      });
      
      // Handle connection errors with enhanced recovery
      socket.on('connect_error', (err) => {
        console.error('Socket.io connection error:', err);
        
        // Safely extract error properties - some are not standard Error properties
        const errorDetails = {
          message: err.message || 'Unknown error',
          // TypeScript might complain about these properties, but they might exist in Socket.io errors
          type: (err as any).type,
          description: (err as any).description,
          context: (err as any).context,
          stack: err.stack,
          socketId: socket.id,
          connected: socket.connected,
          disconnected: socket.disconnected
        };
        
        console.error('Socket.io connection error details:', errorDetails);
        
        // Check for specific HTTP 502 errors
        const is502Error = 
          errorDetails.description === 502 || 
          (errorDetails.message && errorDetails.message.includes('502')) ||
          (errorDetails.context && 
           typeof errorDetails.context === 'object' && 
           errorDetails.context.chobitsuRequest && 
           errorDetails.context.chobitsuRequest.description === 502);
        
        if (is502Error) {
          console.log('Detected HTTP 502 error, implementing special recovery strategy');
          
          // For 502 errors, we'll force a new connection approach
          // First, attempt to close the current connection if it exists
          try {
            if (!socket.disconnected) {
              socket.disconnect();
            }
          } catch (closeErr) {
            console.error('Error closing socket during 502 recovery:', closeErr);
          }
          
          // Set a more specific error message
          setError('Connection issue detected. Attempting to reconnect...');
          
          // Instead of letting socket.io handle reconnection automatically,
          // we'll manually reconnect after a brief delay to give the server time to recover
          setTimeout(() => {
            try {
              // Force reconnection with a different transport order
              // This can help bypass issues with the current transport method
              socket.io.opts.transports = ['websocket'];
              socket.connect();
              
              console.log('Manual reconnection attempt initiated after 502 error');
            } catch (reconnectErr) {
              console.error('Error during manual reconnection:', reconnectErr);
              
              // If manual reconnection fails, provide user with instructions
              setError('Connection issues persist. You may need to refresh the page.');
            }
          }, 3000); // 3 second delay before reconnection attempt
        } else {
          // For other errors, use standard error handling
          setError(`Connection error: ${errorDetails.message}`);
        }
      });
      
      // Add more detailed connection event logging
      socket.io.on('reconnect_attempt', (attempt) => {
        console.debug(`Socket.io reconnection attempt #${attempt}`);
      });
      
      socket.io.on('reconnect', (attempt) => {
        console.debug(`Socket.io reconnected after ${attempt} attempts`);
      });
      
      socket.io.on('reconnect_error', (err) => {
        console.error('Socket.io reconnection error:', err);
      });
      
      socket.io.on('reconnect_failed', () => {
        console.error('Socket.io reconnection failed after maximum attempts');
        setError('Connection failed after multiple attempts. Please check your network connection and refresh the page.');
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
      
      // Handle user status changes
      socket.on('user:status', (data: UserStatus) => {
        if (onStatusChange) {
          onStatusChange(data);
        }
        
        // Update online users list
        setOnlineUsers(prev => {
          if (data.status === 'online' && !prev.includes(data.userId)) {
            return [...prev, data.userId];
          } else if (data.status === 'offline') {
            return prev.filter(id => id !== data.userId);
          }
          return prev;
        });
      });
      
      // Handle online users list
      socket.on('online:users', (userIds: number[]) => {
        setOnlineUsers(userIds);
      });
      
      // Handle incoming calls
      socket.on('call:incoming', (data) => {
        const newCall: CallInfo = {
          callId: uuidv4(),
          callerId: data.callerId,
          receiverId: userId,
          callType: data.callType,
          status: 'ringing'
        };
        
        setActiveCall(newCall);
        
        if (onCallState) {
          onCallState(newCall);
        }
      });
      
      // Handle call responses
      socket.on('call:response', (data) => {
        if (!activeCall) return;
        
        const updatedCall: CallInfo = {
          ...activeCall,
          status: data.accepted ? 'accepted' : 'rejected'
        };
        
        setActiveCall(updatedCall);
        
        if (onCallState) {
          onCallState(updatedCall);
        }
        
        // If call was accepted, start the PeerJS connection
        if (data.accepted && activeCall.callerId === userId) {
          initializePeerConnection(activeCall.receiverId, activeCall.callType, true);
        }
      });
      
      // Handle PeerJS signaling with enhanced error handling
      socket.on('peerjs-signal', async (data) => {
        try {
          console.log('Received PeerJS signal from user', data.senderId, 'type:', data.type || 'unknown');
          
          // Forward the signal to the PeerJS connection helper if it exists
          if (peerJSRef.current) {
            peerJSRef.current.handleSignal(data);
          } else {
            console.warn('Received PeerJS signal but no active PeerJS connection exists');
            
            // If we get a signal but don't have a PeerJS connection and we have an active call
            // it might be necessary to initialize the connection
            if (activeCall && !localStream) {
              console.log('Attempting to initialize peer connection for incoming call');
              initializePeerConnection(data.senderId, activeCall.callType, false);
            }
          }
        } catch (err) {
          console.error('PeerJS signaling error:', err);
          setError('Failed to establish call connection');
        }
      });
      
      // Handle PeerJS signal errors
      socket.on('peerjs-signal-error', (data) => {
        console.error('PeerJS signal error:', data);
        
        // Notify user of error based on type
        if (data.type === 'receiver-offline') {
          // User is offline
          if (activeCall) {
            const updatedCall: CallInfo = {
              ...activeCall,
              status: 'missed',
              endTime: new Date()
            };
            
            setActiveCall(updatedCall);
            
            if (onCallState) {
              onCallState(updatedCall);
            }
          }
          
          // Notify error state
          setError(`Call failed: User is offline`);
          
          // Clean up call resources
          if (peerJSRef.current) {
            peerJSRef.current.endCall();
          }
          setLocalStream(null);
          setRemoteStream(null);
        } else if (data.type === 'forward-failed') {
          // Signal forwarding failed
          setError(`Call failed: Connection error`);
          
          // End the call
          if (activeCall) {
            const updatedCall: CallInfo = {
              ...activeCall,
              status: 'ended',
              endTime: new Date()
            };
            
            setActiveCall(updatedCall);
            
            if (onCallState) {
              onCallState(updatedCall);
            }
          }
          
          // Clean up call resources
          if (peerJSRef.current) {
            peerJSRef.current.endCall();
          }
          setLocalStream(null);
          setRemoteStream(null);
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
  }, [userId, activeCall, onMessage, onStatusChange, onCallState, onFileReceived]);
  
  // Disconnect from the Socket.io server
  const disconnect = useCallback(() => {
    // Clean up any active call
    if (activeCall) {
      endCall();
    }
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  }, [activeCall]);
  
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
  }, [activeCall, isConnected, onCallState]);
  
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
  
  // Manage connection state and debounce connections to prevent rapid reconnects
  const isConnectingRef = useRef(false);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Function to safely cleanup any pending connection attempts
  const cleanupPendingConnections = () => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  };
  
  // Connect and disconnect based on user ID changes with connection tracking
  useEffect(() => {
    // Return early if already connecting or we have a pending connect attempt
    if (isConnectingRef.current || connectTimeoutRef.current) {
      return;
    }
    
    // Only attempt connection if userId exists and we're not already connected
    if (userId && !isConnected && !socketRef.current) {
      // Set connecting flag to prevent multiple connection attempts
      isConnectingRef.current = true;
      
      // Clean up any existing socket to ensure fresh connection
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
          socketRef.current = null;
        } catch (err) {
          console.error('Error cleaning up existing socket:', err);
        }
      }
      
      // Delay connection attempt slightly to prevent rapid reconnection cycles
      connectTimeoutRef.current = setTimeout(() => {
        try {
          connect();
        } catch (err) {
          console.error('Connection error in useEffect:', err);
        } finally {
          // Reset connecting flag regardless of success/failure
          isConnectingRef.current = false;
          connectTimeoutRef.current = null;
        }
      }, 500); // Half-second delay to debounce connection attempts
    } else if (!userId) {
      // If no userId, ensure we're disconnected
      cleanupPendingConnections();
      disconnect();
    }
    
    // Cleanup on component unmount
    return () => {
      cleanupPendingConnections();
      disconnect();
    };
  }, [userId, isConnected, connect, disconnect]);
  
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