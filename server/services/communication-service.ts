import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { InsertMessage } from '@shared/schema';

interface User {
  id: number;
  username: string;
  status: 'online' | 'offline' | 'away';
}

interface WebSocketClient extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

export class CommunicationService {
  private wss: WebSocketServer;
  private clients = new Map<number, WebSocketClient>();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.initializeWebSocketServer();
    this.startPingInterval();
  }

  private initializeWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient) => {
      console.log('WebSocket connection established');
      ws.isAlive = true;

      // Set up ping response
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle messages
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          console.log('WebSocket message received:', data);

          switch (data.type) {
            case 'register':
              await this.handleRegister(ws, data);
              break;
            case 'message':
              await this.handleMessage(data);
              break;
            case 'call-offer':
              this.handleCallOffer(data);
              break;
            case 'call-answer':
              this.handleCallAnswer(data);
              break;
            case 'call-candidate':
              this.handleCallCandidate(data);
              break;
            case 'call-end':
              this.handleCallEnd(data);
              break;
            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        // Find and remove the disconnected client
        for (const [userId, client] of this.clients.entries()) {
          if (client === ws) {
            console.log(`User ${userId} disconnected`);
            this.clients.delete(userId);
            break;
          }
        }

        this.broadcastUserList();
      });
    });
  }

  private startPingInterval() {
    // Check connection state every 30 seconds
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (ws.isAlive === false) {
          // Connection is dead, terminate it
          return ws.terminate();
        }

        // Mark as dead and send ping (pong response will mark it alive)
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  public close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.wss.close();
  }

  private async handleRegister(ws: WebSocketClient, data: any) {
    const userId = data.userId;
    if (!userId) return;

    // Store the client with its userId
    this.clients.set(userId, ws);
    ws.userId = userId;

    // Send the current user list to the newly connected client
    await this.broadcastUserList();

    console.log(`User ${userId} registered`);
  }

  private async handleMessage(data: any) {
    try {
      const { message } = data;
      if (!message || !message.senderId || !message.receiverId || !message.content) {
        console.error('Invalid message format:', message);
        return;
      }

      // Store the message in the database
      const insertMessage: InsertMessage = {
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        type: message.type || 'text',
      };

      const savedMessage = await storage.createMessage(insertMessage);
      
      // Send to sender (for multi-device support)
      this.sendToUser(message.senderId, {
        type: 'message',
        message: savedMessage
      });

      // Send to receiver
      this.sendToUser(message.receiverId, {
        type: 'message',
        message: savedMessage
      });
    } catch (error) {
      console.error('Error handling and saving message:', error);
    }
  }

  private handleCallOffer(data: any) {
    const { callerId, receiverId, offer, type } = data;
    if (!callerId || !receiverId || !offer) {
      console.error('Invalid call offer:', data);
      return;
    }

    // Forward the offer to the receiver
    this.sendToUser(receiverId, {
      type: 'call-offer',
      callerId,
      receiverId,
      offer,
      type
    });
  }

  private handleCallAnswer(data: any) {
    const { callerId, receiverId, answer } = data;
    if (!callerId || !receiverId || !answer) {
      console.error('Invalid call answer:', data);
      return;
    }

    // Forward the answer to the caller
    this.sendToUser(callerId, {
      type: 'call-answer',
      callerId,
      receiverId,
      answer
    });
  }

  private handleCallCandidate(data: any) {
    const { callerId, receiverId, candidate } = data;
    if (!callerId || !receiverId || !candidate) {
      console.error('Invalid ICE candidate:', data);
      return;
    }

    // Forward the ICE candidate to the other peer
    this.sendToUser(data.receiverId, {
      type: 'call-candidate',
      callerId,
      receiverId,
      candidate
    });
  }

  private handleCallEnd(data: any) {
    const { callerId, receiverId } = data;
    if (!callerId || !receiverId) {
      console.error('Invalid call end:', data);
      return;
    }

    // Forward the end call signal to the other peer
    this.sendToUser(receiverId, {
      type: 'call-end',
      callerId,
      receiverId
    });
  }

  /**
   * Send a message to a specific user
   * Made public so it can be used by route handlers
   */
  public sendToUser(userId: number, data: any) {
    const client = this.clients.get(userId);
    
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Get all active user IDs
   */
  public getActiveUsers(): number[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get the status of a specific user
   */
  public getUserStatus(userId: number): 'online' | 'offline' | 'away' {
    const client = this.clients.get(userId);
    
    if (client && client.readyState === WebSocket.OPEN) {
      return 'online';
    }
    
    return 'offline';
  }

  /**
   * Broadcast the user list to all connected clients
   */
  private async broadcastUserList() {
    // Get all users who are currently online
    const onlineUsers: User[] = [];
    
    for (const [userId, client] of this.clients.entries()) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          onlineUsers.push({
            id: userId,
            username: user.username,
            status: 'online'
          });
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
    }

    // Send the online user list to all connected clients
    const data = {
      type: 'users',
      users: onlineUsers
    };

    this.wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}