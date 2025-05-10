import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { storage } from "../storage";
import logger from "../utils/logger";

interface UserConnection {
  userId: number;
  username: string;
  socketId: string;
  peerId?: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  lastActivity: Date;
}

/**
 * CommunicationService manages real-time communication between users
 * Handles video, audio, file transfers, and screen sharing
 */
export class CommunicationService {
  private io: SocketIOServer;
  private userConnections: Map<number, UserConnection> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  
  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      path: '/comm-socket',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupSocketHandlers();
    logger.info('Communication service initialized');
  }
  
  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket connected: ${socket.id}`);
      
      // Authentication and user registration
      socket.on('register', async (data: { userId: number, peerId?: string }) => {
        try {
          const { userId, peerId } = data;
          
          if (!userId) {
            socket.emit('register:error', { message: 'User ID is required' });
            return;
          }
          
          // Get user info from database
          const user = await storage.getUser(userId);
          if (!user) {
            socket.emit('register:error', { message: 'User not found' });
            return;
          }
          
          // Save user connection
          this.userConnections.set(userId, {
            userId,
            username: user.username,
            socketId: socket.id,
            peerId,
            status: 'online',
            lastActivity: new Date()
          });
          
          socket.join(`user:${userId}`);
          
          // Notify the client that registration was successful
          socket.emit('register:success', { userId, username: user.username });
          
          // Broadcast new user online status to others
          this.broadcastUserStatus(userId, 'online');
          
          logger.info(`User registered to communication service: ${user.username} (${userId})`);
        } catch (error) {
          logger.error('Error in socket registration:', error);
          socket.emit('register:error', { message: 'Server error during registration' });
        }
      });
      
      // Change user status
      socket.on('status', (data: { status: 'online' | 'busy' | 'away' | 'offline' }) => {
        const userId = this.getUserIdBySocketId(socket.id);
        if (!userId) return;
        
        const connection = this.userConnections.get(userId);
        if (connection) {
          connection.status = data.status;
          connection.lastActivity = new Date();
          this.userConnections.set(userId, connection);
          
          // Broadcast status change
          this.broadcastUserStatus(userId, data.status);
        }
      });
      
      // Handle signaling for WebRTC
      socket.on('signal', (data: { to: number, signal: any, from: number }) => {
        const { to, signal, from } = data;
        const targetConnection = this.userConnections.get(to);
        
        if (targetConnection) {
          this.io.to(`user:${to}`).emit('signal', {
            from,
            signal
          });
          logger.debug(`Signal relayed from ${from} to ${to}`);
        }
      });
      
      // Create or join a room
      socket.on('room:join', (data: { roomId: string }) => {
        const { roomId } = data;
        const userId = this.getUserIdBySocketId(socket.id);
        if (!userId) return;
        
        // Create room if it doesn't exist
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
        }
        
        // Add user to room
        socket.join(roomId);
        this.rooms.get(roomId)?.add(socket.id);
        
        // Notify everyone in the room
        const usersInRoom = this.getUsersInRoom(roomId);
        this.io.to(roomId).emit('room:users', { roomId, users: usersInRoom });
        
        logger.info(`User ${userId} joined room ${roomId}`);
      });
      
      // Leave a room
      socket.on('room:leave', (data: { roomId: string }) => {
        const { roomId } = data;
        const userId = this.getUserIdBySocketId(socket.id);
        if (!userId) return;
        
        this.leaveRoom(socket, roomId);
      });
      
      // Direct message
      socket.on('message:direct', async (data: { to: number, content: string, type: string }) => {
        const { to, content, type } = data;
        const from = this.getUserIdBySocketId(socket.id);
        
        if (!from) return;
        
        try {
          // Store message in database
          const message = await storage.createMessage({
            senderId: from,
            recipientId: to,
            content,
            messageType: type,
            status: 'sent'
          });
          
          // Send to recipient
          this.io.to(`user:${to}`).emit('message:direct', {
            id: message.id,
            from,
            content,
            type,
            timestamp: message.createdAt
          });
          
          // Confirm delivery to sender
          socket.emit('message:sent', {
            id: message.id,
            to,
            timestamp: message.createdAt
          });
          
        } catch (error) {
          logger.error('Error sending direct message:', error);
          socket.emit('message:error', { message: 'Failed to send message' });
        }
      });
      
      // File transfer notification
      socket.on('file:request', (data: { to: number, fileInfo: any }) => {
        const { to, fileInfo } = data;
        const from = this.getUserIdBySocketId(socket.id);
        if (!from) return;
        
        this.io.to(`user:${to}`).emit('file:request', {
          from,
          fileInfo
        });
      });
      
      // Screen sharing notification
      socket.on('screen:start', (data: { roomId: string }) => {
        const { roomId } = data;
        const userId = this.getUserIdBySocketId(socket.id);
        if (!userId) return;
        
        this.io.to(roomId).emit('screen:started', { userId });
      });
      
      // Screen sharing stop notification
      socket.on('screen:stop', (data: { roomId: string }) => {
        const { roomId } = data;
        const userId = this.getUserIdBySocketId(socket.id);
        if (!userId) return;
        
        this.io.to(roomId).emit('screen:stopped', { userId });
      });
      
      // Update PeerId
      socket.on('peer:update', (data: { peerId: string }) => {
        const userId = this.getUserIdBySocketId(socket.id);
        if (!userId) return;
        
        const connection = this.userConnections.get(userId);
        if (connection) {
          connection.peerId = data.peerId;
          this.userConnections.set(userId, connection);
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        const userId = this.getUserIdBySocketId(socket.id);
        if (!userId) return;
        
        // Remove from all rooms
        this.rooms.forEach((members, roomId) => {
          if (members.has(socket.id)) {
            this.leaveRoom(socket, roomId);
          }
        });
        
        // Remove from user connections and broadcast offline status
        this.userConnections.delete(userId);
        this.broadcastUserStatus(userId, 'offline');
        
        logger.info(`User disconnected from communication service: ${userId}`);
      });
    });
  }
  
  private getUserIdBySocketId(socketId: string): number | null {
    for (const [userId, connection] of this.userConnections.entries()) {
      if (connection.socketId === socketId) {
        return userId;
      }
    }
    return null;
  }
  
  private getUsersInRoom(roomId: string): { userId: number, username: string }[] {
    const result: { userId: number, username: string }[] = [];
    const roomMembers = this.rooms.get(roomId);
    
    if (!roomMembers) return result;
    
    for (const socketId of roomMembers) {
      const userId = this.getUserIdBySocketId(socketId);
      if (userId) {
        const connection = this.userConnections.get(userId);
        if (connection) {
          result.push({
            userId: connection.userId,
            username: connection.username
          });
        }
      }
    }
    
    return result;
  }
  
  private leaveRoom(socket: Socket, roomId: string) {
    socket.leave(roomId);
    
    const roomMembers = this.rooms.get(roomId);
    if (roomMembers) {
      roomMembers.delete(socket.id);
      
      // If room is empty, delete it
      if (roomMembers.size === 0) {
        this.rooms.delete(roomId);
        logger.info(`Room deleted: ${roomId}`);
      } else {
        // Otherwise notify remaining users
        const usersInRoom = this.getUsersInRoom(roomId);
        this.io.to(roomId).emit('room:users', { roomId, users: usersInRoom });
      }
    }
    
    const userId = this.getUserIdBySocketId(socket.id);
    logger.info(`User ${userId} left room ${roomId}`);
  }
  
  private broadcastUserStatus(userId: number, status: 'online' | 'busy' | 'away' | 'offline') {
    const user = this.userConnections.get(userId);
    if (!user) return;
    
    this.io.emit('user:status', {
      userId,
      username: user.username,
      status,
      timestamp: new Date()
    });
  }
  
  // Public API
  
  /**
   * Get all online users
   */
  public getOnlineUsers(): { userId: number, username: string, status: string }[] {
    const result: { userId: number, username: string, status: string }[] = [];
    
    for (const [userId, connection] of this.userConnections.entries()) {
      result.push({
        userId,
        username: connection.username,
        status: connection.status
      });
    }
    
    return result;
  }
  
  /**
   * Send a system notification to a specific user
   */
  public sendSystemNotification(userId: number, message: string, type: string = 'info') {
    this.io.to(`user:${userId}`).emit('system:notification', {
      message,
      type,
      timestamp: new Date()
    });
  }
  
  /**
   * Broadcast a system notification to all connected users
   */
  public broadcastSystemNotification(message: string, type: string = 'info') {
    this.io.emit('system:notification', {
      message,
      type,
      timestamp: new Date()
    });
  }
}

// Export a factory function to create the service
export function createCommunicationService(httpServer: HTTPServer): CommunicationService {
  return new CommunicationService(httpServer);
}