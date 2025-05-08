import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import { WebRTCConnection } from "./webrtc-helper";

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
  const webRTCRef = useRef<WebRTCConnection | null>(null);
  
  // File transfer state
  const [fileTransfers, setFileTransfers] = useState<Map<string, FileInfo>>(new Map());
  
  // Connect to the Socket.io server
  const connect = useCallback(() => {
    if (!userId) return;
    
    try {
      // Create new Socket.io connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const socket = io(`${protocol}//${host}/comms`);
      socketRef.current = socket;
      
      // Connection event handlers
      socket.on('connect', () => {
        setIsConnected(true);
        setError(null);
        
        // Authenticate with user ID
        socket.emit('auth', { userId });
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
        setError(`Connection error: ${err.message}`);
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
        
        // If call was accepted, start the WebRTC connection
        if (data.accepted && activeCall.callerId === userId) {
          initializePeerConnection(activeCall.receiverId, activeCall.callType);
        }
      });
      
      // Handle WebRTC signaling
      socket.on('signal', async (data) => {
        try {
          // We don't need to manually handle the signal - 
          // WebRTCConnection handles it for us via socket events
          if (!webRTCRef.current) {
            // If receiving signal before WebRTC is created, create it
            if (activeCall && activeCall.status === 'accepted') {
              await initializePeerConnection(data.senderId, activeCall.callType, data.signal);
            }
          }
        } catch (err) {
          console.error('Signaling error:', err);
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
      
      // Initialize peer connection
      await initializePeerConnection(activeCall.callerId, activeCall.callType);
      
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
      // Close WebRTC connection - it handles media stream cleanup
      if (webRTCRef.current) {
        webRTCRef.current.endCall();
        webRTCRef.current = null;
      } else {
        // Manual cleanup if WebRTC not initialized
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
  
  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(async (
    peerId: number, 
    callType: 'audio' | 'video',
    incomingSignal?: any
  ): Promise<boolean> => {
    try {
      if (!socketRef.current) {
        setError('Socket connection not established');
        return false;
      }
      
      // Create WebRTC connection
      const webRTC = new WebRTCConnection(socketRef.current);
      webRTCRef.current = webRTC;
      
      // Initialize the call
      const stream = await webRTC.initializeCall(
        peerId, 
        callType, 
        !incomingSignal // isInitiator if there's no incoming signal
      );
      
      // Store local stream
      setLocalStream(stream);
      
      // Handle remote stream
      webRTC.onRemoteStream((remoteMediaStream) => {
        setRemoteStream(remoteMediaStream);
      });
      
      return true;
    } catch (err) {
      console.error('Media or peer error:', err);
      setError('Failed to access camera/microphone');
      
      // Clean up the call
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
        
        setTimeout(() => {
          setActiveCall(null);
        }, 1000);
      }
      
      return false;
    }
  }, [activeCall, endCall, onCallState]);
  
  // Share a file with another user
  const shareFile = useCallback(async (
    receiverId: number,
    file: File
  ): Promise<boolean> => {
    if (!socketRef.current || !isConnected) {
      setError('Not connected to communication server');
      return false;
    }
    
    if (!userId) {
      setError('User not authenticated');
      return false;
    }
    
    try {
      // Create a file info object
      const fileId = uuidv4();
      const fileInfo: FileInfo = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type
      };
      
      // Read file as data URL for preview and sharing
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (!e.target?.result) return;
        
        // Update file info with data
        const fileInfoWithData: FileInfo = {
          ...fileInfo,
          data: e.target.result
        };
        
        // Update file transfers
        setFileTransfers(prev => {
          const newMap = new Map(prev);
          newMap.set(fileId, fileInfoWithData);
          return newMap;
        });
        
        // Create a temporary URL for the file
        const blob = new Blob([file], { type: file.type });
        const url = URL.createObjectURL(blob);
        
        const fileInfoToSend: FileInfo = {
          ...fileInfo,
          url // Send URL to recipient
        };
        
        // Send file info to recipient
        socketRef.current?.emit('file:share', {
          receiverId,
          fileInfo: fileInfoToSend
        });
        
        // Also send a message
        sendMessage(receiverId, `Shared a file: ${file.name}`);
        
        // Notify via callback
        if (onMessage) {
          onMessage({
            id: uuidv4(),
            type: 'file',
            senderId: userId, // Safe after the null check above
            receiverId,
            content: `Shared a file: ${file.name}`,
            timestamp: new Date(),
            fileInfo: fileInfoToSend
          });
        }
      };
      
      reader.readAsDataURL(file);
      return true;
    } catch (err) {
      setError('Failed to share file');
      console.error('File sharing error:', err);
      return false;
    }
  }, [isConnected, userId, sendMessage, onMessage]);
  
  // Download a shared file
  const downloadFile = useCallback((fileId: string): boolean => {
    try {
      const fileInfo = fileTransfers.get(fileId);
      
      if (!fileInfo || !fileInfo.data) {
        setError('File not found or no data available');
        return false;
      }
      
      // Convert data URL to blob
      const dataUri = fileInfo.data as string;
      const byteString = atob(dataUri.split(',')[1]);
      const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
      
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      
      // Download the file
      saveAs(blob, fileInfo.name);
      return true;
    } catch (err) {
      setError('Failed to download file');
      console.error('File download error:', err);
      return false;
    }
  }, [fileTransfers]);
  
  // Connect on mount and disconnect on unmount
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);
  
  return {
    // Connection
    isConnected,
    error,
    onlineUsers,
    
    // Messaging
    sendMessage,
    
    // Calls
    activeCall,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    
    // File sharing
    fileTransfers,
    shareFile,
    downloadFile
  };
}
