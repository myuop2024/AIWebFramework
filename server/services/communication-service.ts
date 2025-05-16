import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { InsertMessage } from '@shared/schema';

interface User {
  id: number;
  username: string;
  status: 'online' | 'offline' | 'away';
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  profileImageUrl?: string | null;
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
    try {
      // Use a different path to avoid conflicts with HMR websockets
      // Set noServer to true to avoid port binding conflicts - we'll handle connections manually
      this.wss = new WebSocketServer({ 
        server, 
        path: '/api/ws',
        clientTracking: true,
        // Add EADDRINUSE error handling by using noServer mode when needed
        noServer: false,
        // Increase the per-message deflate options for better performance
        perMessageDeflate: {
          zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
          },
          zlibInflateOptions: {
            chunkSize: 10 * 1024
          },
          // Below options help reduce fragmentation of large messages
          serverNoContextTakeover: true,
          clientNoContextTakeover: true,
          concurrencyLimit: 10,
          threshold: 1024
        }
      });
      
      // Listen for server errors to handle gracefully
      this.wss.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn('WebSocket port already in use, switching to noServer mode');
          // If port is in use, switch to noServer mode
          (this.wss as any).options.noServer = true;
        } else {
          console.error('WebSocket server error:', err);
        }
      });
      
      this.initializeWebSocketServer();
      this.startPingInterval();
      console.log('WebSocket server initialized on /api/ws path');
    } catch (error) {
      console.error('Failed to initialize WebSocket server:', error);
      // Create a dummy WSS that doesn't actually bind to any port/server
      this.wss = {
        on: () => {},
        clients: new Set(),
        // Add close method to dummy server
        close: () => {}
      } as any;
    }
  }

  private initializeWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient) => {
      console.log('WebSocket connection established');
      ws.isAlive = true;

      // Set up ping response
      ws.on('pong', () => {
        ws.isAlive = true;
        if (ws.userId) {
          this.updateUserActivity(ws.userId);
        }
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
            case 'heartbeat':
              // Just update the user's activity, no response needed
              if (ws.userId) {
                this.updateUserActivity(ws.userId);
              }
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
        Array.from(this.clients.entries()).forEach(([userId, client]) => {
          if (client === ws) {
            console.log(`User ${userId} disconnected`);
            this.clients.delete(userId);
          }
        });

        this.broadcastUserList();
      });
    });
  }

  private startPingInterval() {
    // Check connection state every 20 seconds
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
      
      // Broadcast updated user status every ping interval
      this.broadcastUserList();
    }, 20000);
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
    
    // Update user activity timestamp
    this.updateUserActivity(userId);

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
    const { callerId, receiverId, offer, callType } = data;
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
      callType: callType || 'video'
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
  // Track last activity time per user
  private userLastActivity = new Map<number, number>();
  
  // Update user activity timestamp
  private updateUserActivity(userId: number) {
    this.userLastActivity.set(userId, Date.now());
  }
  
  public getUserStatus(userId: number): 'online' | 'offline' | 'away' {
    const client = this.clients.get(userId);
    const lastActivity = this.userLastActivity.get(userId);
    const now = Date.now();
    
    if (client && client.readyState === WebSocket.OPEN) {
      this.updateUserActivity(userId);
      return 'online';
    }
    
    // Consider a user "away" if they were active in the last 5 minutes
    if (lastActivity && now - lastActivity < 5 * 60 * 1000) {
      return 'away';
    }
    
    return 'offline';
  }

  /**
   * Broadcast the user list to all connected clients
   */
  private async broadcastUserList() {
    // Get all users who are currently online
    const onlineUsers: User[] = [];
    
    // Use Array.from to convert the entries iterator to an array we can safely iterate
    await Promise.all(Array.from(this.clients.entries()).map(async ([userId, client]) => {
      try {
        const user = await storage.getUser(userId);
        // Also fetch profile to get profile photo
        const profile = await storage.getUserProfile(userId);
        
        if (user) {
          onlineUsers.push({
            id: userId,
            username: user.username,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            role: user.role || null,
            profileImageUrl: profile?.profilePhotoUrl || null,
            status: 'online'
          });
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
    }));

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