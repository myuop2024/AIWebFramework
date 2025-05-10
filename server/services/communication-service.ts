import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { storage } from '../storage';

// Function for API routes to create/access the service
let communicationServiceInstance: CommunicationService | null = null;

export function createCommunicationService(server: Server): CommunicationService {
  if (!communicationServiceInstance) {
    communicationServiceInstance = new CommunicationService(server);
  }
  return communicationServiceInstance;
}

// Store connected users with their socket IDs
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
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      path: '/socket'
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // Handle user authentication
      socket.on('authenticate', async (data: { userId: number }) => {
        try {
          const { userId } = data;
          if (!userId) {
            console.error('Invalid authentication data:', data);
            return;
          }

          const user = await storage.getUser(userId);
          if (!user) {
            console.error('User not found for ID:', userId);
            return;
          }

          // Add user to connected users
          this.connectedUsers.push({
            userId,
            socketId: socket.id,
            username: user.username
          });

          // Join a room with their user ID
          socket.join(`user:${userId}`);

          // Broadcast user online status
          this.broadcastUserStatus(userId, true);

          console.log(`User ${userId} authenticated and connected`);
          
          // Send the list of online users to the newly connected user
          socket.emit('online-users', this.getOnlineUsers());
        } catch (error) {
          console.error('Error in authenticate:', error);
        }
      });

      // Handle private messages
      socket.on('private-message', async (data: { senderId: number; receiverId: number; content: string; type?: string }) => {
        try {
          const { senderId, receiverId, content, type = 'text' } = data;
          
          // Save message to database
          const message = await storage.createMessage({
            senderId,
            receiverId,
            content,
            type: type as 'text' | 'file' | 'image' | 'system',
            sentAt: new Date(),
            read: false
          });

          // Emit to sender for confirmation
          socket.emit('message-sent', message);

          // Emit to recipient if they're online
          const recipientSocketId = this.getUserSocketId(receiverId);
          if (recipientSocketId) {
            this.io.to(`user:${receiverId}`).emit('new-message', message);
          }
        } catch (error) {
          console.error('Error in private-message:', error);
          socket.emit('message-error', { error: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing', (data: { senderId: number; receiverId: number; isTyping: boolean }) => {
        const { senderId, receiverId, isTyping } = data;
        this.io.to(`user:${receiverId}`).emit('user-typing', { userId: senderId, isTyping });
      });

      // Handle video/audio call offers
      socket.on('call-offer', (data: { callerId: number; receiverId: number; offer: any; type: 'video' | 'audio' }) => {
        const { callerId, receiverId, offer, type } = data;
        this.io.to(`user:${receiverId}`).emit('call-offer', { callerId, offer, type });
      });

      // Handle call answers
      socket.on('call-answer', (data: { callerId: number; receiverId: number; answer: any }) => {
        const { callerId, receiverId, answer } = data;
        this.io.to(`user:${callerId}`).emit('call-answer', { from: receiverId, answer });
      });

      // Handle ICE candidates
      socket.on('ice-candidate', (data: { senderId: number; receiverId: number; candidate: any }) => {
        const { senderId, receiverId, candidate } = data;
        this.io.to(`user:${receiverId}`).emit('ice-candidate', { from: senderId, candidate });
      });

      // Handle call end
      socket.on('call-end', (data: { callerId: number; receiverId: number }) => {
        const { callerId, receiverId } = data;
        this.io.to(`user:${receiverId}`).emit('call-end', { from: callerId });
      });

      // Handle screen sharing
      socket.on('screen-share-offer', (data: { senderId: number; receiverId: number; offer: any }) => {
        const { senderId, receiverId, offer } = data;
        this.io.to(`user:${receiverId}`).emit('screen-share-offer', { from: senderId, offer });
      });

      // Handle read receipts
      socket.on('mark-read', async (data: { messageIds: number[] }) => {
        try {
          const { messageIds } = data;
          
          for (const messageId of messageIds) {
            const message = await storage.markMessageAsRead(messageId);
            if (message && message.senderId) {
              this.io.to(`user:${message.senderId}`).emit('message-read', { messageId });
            }
          }
        } catch (error) {
          console.error('Error in mark-read:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const user = this.connectedUsers.find(u => u.socketId === socket.id);
        if (user) {
          this.connectedUsers = this.connectedUsers.filter(u => u.socketId !== socket.id);
          this.broadcastUserStatus(user.userId, false);
          console.log(`User ${user.userId} disconnected`);
        }
      });
    });
  }

  private broadcastUserStatus(userId: number, isOnline: boolean) {
    this.io.emit('user-status', { userId, status: isOnline ? 'online' : 'offline' });
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
}

export default CommunicationService;