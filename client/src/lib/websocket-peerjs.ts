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
  
  // Connect to the Socket.io server
  const connect = useCallback(() => {
    if (!userId) return;
    
    try {
      // Create new Socket.io connection
      // Match server configuration (path /socket.io with namespace /comms)
      console.log('Creating Socket.io connection with namespace /comms and path /socket.io');
      
      // Explicitly construct the Socket.io client with the right URL and namespace
      // Initialize Socket.io with the namespace directly, not with a URL
      const socket = io('/comms', {
        path: '/socket.io', // Must match the server's Socket.io path
        transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
        reconnectionAttempts: 5, // Try to reconnect 5 times
        reconnectionDelay: 1000, // Start with a 1 second delay
        timeout: 20000, // 20 seconds connection timeout (increased from 10s)
        autoConnect: true
      });
      
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
      
      // Handle disconnect
      socket.on('disconnect', () => {
        setIsConnected(false);
        
        // Clean up any active calls
        if (activeCall) {
          endCall();
        }
      });
      
      // Handle connection errors
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
        
        // Set a user-friendly error message
        setError(`Connection error: ${errorDetails.message}`);
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
      
      // Handle PeerJS signaling
      socket.on('peerjs-signal', async (data) => {
        try {
          // Process the PeerJS signal - we'll rely on the PeerJSConnection to handle this
          console.log('Received PeerJS signal', data.senderId);
        } catch (err) {
          console.error('PeerJS signaling error:', err);
          setError('Failed to establish call connection');
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
          senderId: userId,
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
  
  // Connect and disconnect based on user ID changes
  useEffect(() => {
    if (userId) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);
  
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