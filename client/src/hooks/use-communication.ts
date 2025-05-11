
import { useState, useEffect, useCallback, useRef } from 'react';
import { clientStorage } from '../storage';

// Types
export interface User {
  id: number;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  status: 'online' | 'offline' | 'away';
  profileImage?: string | null;
  role?: string | null;
  parish?: string | null;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  read: boolean;
  sentAt: Date;
}

export interface Conversation {
  userId: number;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  lastMessage: string;
  lastMessageType: string;
  unreadCount: number;
  lastMessageAt: Date;
  profileImage?: string | null;
}

// WebSocket message types
export const WS_MSG_TYPES = {
  CONNECT: 'connect',
  USERS: 'users',
  NEW_MESSAGE: 'message',
  MESSAGE_READ: 'message-read',
  ALL_MESSAGES_READ: 'all-messages-read',
  USER_STATUS: 'user-status',
  ERROR: 'error',
};

export function useCommunication(userId: number) {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [readMessages, setReadMessages] = useState<{messageId: number, readBy: number}[]>([]);
  const [allReadNotifications, setAllReadNotifications] = useState<{by: number, from: number}[]>([]);
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  
  // Function to calculate exponential backoff delay
  const getReconnectDelay = () => {
    const attempt = Math.min(reconnectAttempts.current, 5); // Cap at 5 for max delay
    const delay = baseReconnectDelay * Math.pow(2, attempt) + Math.random() * 1000;
    return Math.min(delay, 30000); // Max 30 seconds
  };
  
  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (socket) {
      // Close existing connection if any
      socket.close();
    }
    
    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = window.location.host;
    const wsUrl = `${protocol}//${baseUrl}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}... (User ID: ${userId})`);
    
    try {
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = () => {
        console.log('WebSocket connected successfully');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Send initial connection message with user ID
        newSocket.send(JSON.stringify({
          type: WS_MSG_TYPES.CONNECT,
          userId: userId
        }));
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          switch (data.type) {
            case WS_MSG_TYPES.USERS:
              setOnlineUsers(data.users);
              break;
            case WS_MSG_TYPES.NEW_MESSAGE:
              setLastMessage(data.message);
              break;
            case WS_MSG_TYPES.MESSAGE_READ:
              setReadMessages(prev => [...prev, { messageId: data.messageId, readBy: data.readBy }]);
              break;
            case WS_MSG_TYPES.ALL_MESSAGES_READ:
              setAllReadNotifications(prev => [...prev, { by: data.by, from: data.from }]);
              break;
            case WS_MSG_TYPES.ERROR:
              setError(data.message || 'Unknown WebSocket error');
              break;
            default:
              // Handle unknown message type
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      newSocket.onclose = (event) => {
        console.log(`WebSocket disconnected with code: ${event.code}, reason: ${event.reason}`);
        setConnected(false);
        
        // Attempt to reconnect unless this was a normal close (1000) or max attempts reached
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = getReconnectDelay();
          console.log(`Scheduling WebSocket reconnection in ${Math.round(delay)}ms...`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Maximum reconnection attempts reached. Please refresh the page.');
        }
      };
      
      newSocket.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
      };
      
      setSocket(newSocket);
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [userId, socket]);
  
  // Clean up function
  const cleanUp = useCallback(() => {
    console.log('Cleaning up WebSocket connection...');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'Component unmounted');
    }
  }, [socket]);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (userId) {
      connectWebSocket();
    }
    
    // Set up global error handler for unhandled WebSocket errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('WebSocket')) {
        setError(`Global WebSocket error: ${event.message}`);
      }
    };
    
    window.addEventListener('error', handleGlobalError);
    console.log('Global error handlers initialized');
    
    return () => {
      cleanUp();
      window.removeEventListener('error', handleGlobalError);
    };
  }, [userId, connectWebSocket, cleanUp]);
  
  // Send a message
  const sendMessage = useCallback(async (receiverId: number, content: string, type: 'text' | 'file' | 'image' | 'system' = 'text') => {
    try {
      // First save the message to the database through the REST API
      const message = await clientStorage.createMessage({
        receiverId,
        content,
        type
      });
      
      // If successfully saved, we don't need to do anything else as the server
      // will broadcast this message through the WebSocket connection
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      throw error;
    }
  }, []);
  
  // Mark a message as read
  const markMessageAsRead = useCallback(async (messageId: number) => {
    try {
      return await clientStorage.markMessageAsRead(messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
      setError('Failed to mark message as read');
      throw error;
    }
  }, []);
  
  // Mark all messages from a user as read
  const markAllMessagesAsRead = useCallback(async (senderId: number) => {
    try {
      return await clientStorage.markAllMessagesAsRead(senderId, userId);
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      setError('Failed to mark all messages as read');
      throw error;
    }
  }, [userId]);
  
  // Get messages between current user and another user
  const getMessagesBetweenUsers = useCallback(async (otherUserId: number) => {
    try {
      return await clientStorage.getMessagesBetweenUsers(userId, otherUserId);
    } catch (error) {
      console.error('Error getting messages:', error);
      setError('Failed to get messages');
      throw error;
    }
  }, [userId]);
  
  // Get recent conversations
  const getRecentConversations = useCallback(async () => {
    try {
      return await clientStorage.getRecentConversations(userId);
    } catch (error) {
      console.error('Error getting conversations:', error);
      setError('Failed to get conversations');
      throw error;
    }
  }, [userId]);
  
  // Get all users (for user selection)
  const getAllUsers = useCallback(async () => {
    try {
      return await clientStorage.getAllUsers();
    } catch (error) {
      console.error('Error getting all users:', error);
      setError('Failed to get users');
      throw error;
    }
  }, []);
  
  // Reset notification state for a specific message or all messages
  const resetNotification = useCallback((messageId?: number) => {
    if (messageId) {
      setLastMessage(prev => 
        prev && prev.id === messageId ? null : prev
      );
    } else {
      setLastMessage(null);
    }
  }, []);
  
  return {
    connected,
    onlineUsers,
    lastMessage,
    readMessages,
    allReadNotifications,
    error,
    sendMessage,
    markMessageAsRead,
    markAllMessagesAsRead,
    getMessagesBetweenUsers,
    getRecentConversations,
    getAllUsers,
    resetNotification,
    reconnect: connectWebSocket,
    endConnection: cleanUp,
  };
}

// Export types for server-side communication routes
export type { User, Message, Conversation };
