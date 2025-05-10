import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { storage } from '../storage';

interface ConnectedUser {
  userId: number;
  socketId: string;
  username: string;
}

export class CommunicationService {
  private io: SocketIOServer;
  private connectedUsers: ConnectedUser[] = [];

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      path: '/socket',
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupSocketHandlers();
    console.log('Communication service initialized');
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New socket connection:', socket.id);

      // Authenticate user
      socket.on('authenticate', async ({ userId }) => {
        try {
          // Get user from database
          const user = await storage.getUser(userId);
          
          if (!user) {
            console.error('Authentication failed: User not found', userId);
            socket.disconnect();
            return;
          }

          console.log(`User authenticated: ${user.username} (${userId})`);
          
          // Add user to connected users list
          this.connectedUsers.push({
            userId,
            socketId: socket.id,
            username: user.username
          });

          // Broadcast user's online status to others
          this.broadcastUserStatus(userId, true);
          
          // Send connected users list to newly connected user
          const onlineUsers = this.getOnlineUsers();
          socket.emit('online-users', onlineUsers);
          
          // Join user's private room for direct messages
          socket.join(`user:${userId}`);
        } catch (error) {
          console.error('Authentication error:', error);
          socket.disconnect();
        }
      });

      // Handle private messages
      socket.on('private-message', async (data) => {
        try {
          const { senderId, receiverId, content, type = 'text' } = data;
          
          // Create message in database
          const message = await storage.createMessage({
            senderId,
            receiverId,
            content,
            type,
            read: false,
            sentAt: new Date()
          });

          // Send to receiver if online
          this.io.to(`user:${receiverId}`).emit('new-message', message);
          
          // Confirm to sender
          socket.emit('message-sent', { 
            messageId: message.id,
            receiverId,
            status: 'sent'
          });
        } catch (error) {
          console.error('Error sending private message:', error);
          socket.emit('message-error', { error: 'Failed to send message' });
        }
      });

      // Handle message read status updates
      socket.on('mark-read', async ({ messageIds }) => {
        try {
          if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return;
          }

          for (const messageId of messageIds) {
            const message = await storage.markMessageAsRead(messageId);
            if (message) {
              // Notify sender that message was read
              this.io.to(`user:${message.senderId}`).emit('message-read', { 
                messageId: message.id,
                readAt: new Date()
              });
            }
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // Handle typing indicators
      socket.on('typing', ({ senderId, receiverId, isTyping }) => {
        this.io.to(`user:${receiverId}`).emit('user-typing', {
          userId: senderId,
          isTyping
        });
      });

      // Handle WebRTC signaling
      socket.on('call-offer', (data) => {
        const { callerId, receiverId, offer, type } = data;
        this.io.to(`user:${receiverId}`).emit('call-offer', {
          callerId,
          receiverId,
          offer,
          type
        });
      });

      socket.on('call-answer', (data) => {
        const { callerId, receiverId, answer } = data;
        this.io.to(`user:${callerId}`).emit('call-answer', {
          from: receiverId,
          answer
        });
      });

      socket.on('ice-candidate', (data) => {
        const { callerId, receiverId, candidate } = data;
        const targetUserId = receiverId === data.senderId ? callerId : receiverId;
        this.io.to(`user:${targetUserId}`).emit('ice-candidate', {
          from: data.senderId,
          candidate
        });
      });

      socket.on('call-end', (data) => {
        const { callerId, receiverId } = data;
        this.io.to(`user:${receiverId}`).emit('call-end', {
          from: callerId
        });
      });

      socket.on('screen-share-start', (data) => {
        const { senderId, receiverId, stream } = data;
        this.io.to(`user:${receiverId}`).emit('screen-share-start', {
          from: senderId,
          stream
        });
      });

      socket.on('screen-share-end', (data) => {
        const { senderId, receiverId } = data;
        this.io.to(`user:${receiverId}`).emit('screen-share-end', {
          from: senderId
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
        
        // Find user by socket id
        const user = this.connectedUsers.find(u => u.socketId === socket.id);
        
        if (user) {
          // Remove user from connected users list
          this.connectedUsers = this.connectedUsers.filter(u => u.socketId !== socket.id);
          
          // Broadcast user's offline status
          this.broadcastUserStatus(user.userId, false);
        }
      });
    });
  }

  private broadcastUserStatus(userId: number, isOnline: boolean) {
    this.io.emit('user-status', {
      userId,
      status: isOnline ? 'online' : 'offline'
    });
  }

  private getUserSocketId(userId: number): string | undefined {
    const user = this.connectedUsers.find(u => u.userId === userId);
    return user?.socketId;
  }

  private getOnlineUsers() {
    return this.connectedUsers.map(user => ({
      id: user.userId,
      username: user.username,
      status: 'online'
    }));
  }

  // Public methods for external use
  
  public sendSystemMessage(userId: number, content: string) {
    try {
      // Get socket ID by user ID
      const socketId = this.getUserSocketId(userId);
      
      if (socketId) {
        this.io.to(socketId).emit('system-message', {
          content,
          timestamp: new Date()
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error sending system message:', error);
      return false;
    }
  }

  public broadcastSystemMessage(content: string, excludeUserIds: number[] = []) {
    try {
      this.connectedUsers
        .filter(user => !excludeUserIds.includes(user.userId))
        .forEach(user => {
          this.io.to(user.socketId).emit('system-message', {
            content,
            timestamp: new Date()
          });
        });
      
      return true;
    } catch (error) {
      console.error('Error broadcasting system message:', error);
      return false;
    }
  }

  public getUserStatus(userId: number): 'online' | 'offline' {
    return this.connectedUsers.some(u => u.userId === userId) ? 'online' : 'offline';
  }

  public getActiveUsers(): number[] {
    return this.connectedUsers.map(u => u.userId);
  }
}

// Factory function to create communication service
export function createCommunicationService(server: Server): CommunicationService {
  return new CommunicationService(server);
}