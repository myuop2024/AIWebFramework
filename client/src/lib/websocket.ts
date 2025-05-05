import { useEffect, useRef, useState, useCallback } from "react";

export type ChatMessageType = 'message' | 'notification' | 'status';

export interface ChatMessage {
  type: ChatMessageType;
  senderId?: number;
  receiverId?: number;
  content: string;
  timestamp: Date;
  messageId?: number;
}

interface WebSocketHookOptions {
  onMessage?: (message: ChatMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  userId?: number | null;
  autoReconnect?: boolean;
}

export function useWebSocket(options: WebSocketHookOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    userId,
    autoReconnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!userId || socketRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // Determine protocol based on current connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        
        // Send authentication message
        socket.send(JSON.stringify({
          type: 'auth',
          userId
        }));
        
        if (onConnect) onConnect();
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Convert timestamp string to Date object
          if (message.timestamp) {
            message.timestamp = new Date(message.timestamp);
          }
          if (onMessage) onMessage(message);
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (onDisconnect) onDisconnect();
        
        // Auto reconnect logic
        if (autoReconnect) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000) as unknown as number;
        }
      };

      socket.onerror = (err) => {
        setError("WebSocket connection error");
        console.error("WebSocket error:", err);
      };
    } catch (err) {
      setError("Failed to establish WebSocket connection");
      console.error("WebSocket connection error:", err);
    }
  }, [userId, onConnect, onDisconnect, onMessage, autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
  }, []);

  const sendMessage = useCallback((receiverId: number, content: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("WebSocket not connected");
      return false;
    }

    try {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        senderId: userId,
        receiverId,
        content,
        timestamp: new Date()
      }));
      return true;
    } catch (err) {
      setError("Failed to send message");
      console.error("Send message error:", err);
      return false;
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  return {
    isConnected,
    error,
    sendMessage,
    connect,
    disconnect
  };
}
