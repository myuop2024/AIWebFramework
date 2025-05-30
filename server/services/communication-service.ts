import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import logger from '../utils/logger';
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

import { IncomingMessage } from 'http'; // Added for request object in connection handler

interface WebSocketClient extends WebSocket {
  userId?: number; // This will be the authenticated ID
  isAlive?: boolean;
  authenticatedUserId?: number; // Temporary property to hold ID from upgrade
}

export class CommunicationService {
  private wss: WebSocketServer;
  private clients = new Map<number, WebSocketClient>();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    try {
      // Use a different path to avoid conflicts with HMR websockets
      // Set noServer to true to avoid port binding conflicts - we'll handle connections manually
      // server option removed, path option removed.
      this.wss = new WebSocketServer({
        noServer: true, // Crucial: HTTP server will handle upgrades
        clientTracking: true,
        // Add EADDRINUSE error handling by using noServer mode when needed
        // noServer: false, // This was the old value
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
          logger.warn('WebSocket port already in use, switching to noServer mode. This usually happens in dev with HMR.', { error: err });
          // If port is in use, switch to noServer mode
          (this.wss as any).options.noServer = true;
        } else {
          logger.error('WebSocket server error', { error: err });
        }
      });
      
      this.initializeWebSocketServer();
      this.startPingInterval();
      logger.info('CommunicationService: WebSocketServer configured with noServer: true. Waiting for external upgrade handling.');
    } catch (error) {
      logger.error('Failed to initialize WebSocket server', { error: error instanceof Error ? error : new Error(String(error)) });
      // Create a dummy WSS that doesn't actually bind to any port/server
      this.wss = {
        on: () => {},
        clients: new Set(),
        // Add close method to dummy server
        close: () => {}
      } as any;
    }
  }

  // Method to get the WSS instance for external upgrade handling
  public getWss(): WebSocketServer {
    return this.wss;
  }

  private initializeWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient, request: IncomingMessage) => { // Added request parameter
      // Security Enhancement: Prioritize authenticatedUserId set during HTTP upgrade
      if (!ws.authenticatedUserId) {
        logger.warn('[WS] Connection attempt without authenticatedUserId. Terminating.', { ip: request.socket.remoteAddress });
        ws.terminate();
        return;
      }

      // Assign the authenticated user ID to ws.userId for consistent use within the service
      ws.userId = ws.authenticatedUserId;
      // Clear the temporary property if desired, though not strictly necessary
      // delete ws.authenticatedUserId;

      logger.info(`[WS] Connection established for authenticated user ${ws.userId}`, { userId: ws.userId, ip: request.socket.remoteAddress });
      ws.isAlive = true;

      // Register the client immediately with the authenticated ID
      // This replaces the need for the client to send a 'register' message for basic ID association.
      // The 'register' message might still be used by client to signal readiness or fetch initial data.
      this.clients.set(ws.userId, ws);
      this.updateUserActivity(ws.userId);
      this.broadcastUserList(); // Broadcast user list upon new authenticated connection
      logger.info(`[WS] User ${ws.userId} auto-registered based on authenticated session.`, { userId: ws.userId });


      // Set up ping response
      ws.on('pong', () => {
        ws.isAlive = true;
        if (ws.userId) { // ws.userId is now the authenticated one
          this.updateUserActivity(ws.userId);
        }
      });

      // Handle messages
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          logger.debug('[WS] Message received', { userId: ws.userId, type: data.type, messageData: data });

          switch (data.type) {
            case 'register':
              // 'register' message can now be simplified or used as a confirmation/trigger
              // The actual ws.userId is already set from authenticated session.
              logger.info(`[WS] Received 'register' message from user ${ws.userId} (client sent ${data.userId}).`, { authenticatedUserId: ws.userId, clientSentUserId: data.userId });
              if (data.userId && ws.userId !== data.userId) {
                logger.warn(`[WS] Client-sent userId in register message does not match authenticated session userId. Prioritizing session userId.`, { clientSent: data.userId, sessionUserId: ws.userId });
              }
              // Call handleRegister to perform any actions needed upon client readiness,
              // but it will use the already set ws.userId.
              await this.handleRegister(ws, { userId: ws.userId }); // Pass the authenticated ws.userId
              break;
            case 'message':
              logger.info(`[WS] Chat message from ${data.message?.senderId} to ${data.message?.receiverId}`, { senderId: data.message?.senderId, receiverId: data.message?.receiverId, contentPreview: data.message?.content?.substring(0, 20) });
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
              logger.warn('[WS] Unknown message type received', { userId: ws.userId, type: data.type, data });
          }
        } catch (error) {
          logger.error('[WS] Error handling message', { userId: ws.userId, message, error: error instanceof Error ? error : new Error(String(error)) });
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        // Find and remove the disconnected client
        Array.from(this.clients.entries()).forEach(([userId, client]) => {
          if (client === ws) {
            logger.info(`[WS] User ${userId} disconnected`, { userId });
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
    // ws.userId should already be set and authenticated from the 'connection' event.
    // This function now primarily handles client readiness signals or requests for initial data.
    const authenticatedUserId = ws.userId;

    if (!authenticatedUserId) {
      logger.warn('[WS] handleRegister called for a WebSocket without an authenticated userId. Ignoring.');
      return;
    }

    const clientSentUserId = data.userId;
    if (clientSentUserId && authenticatedUserId !== clientSentUserId) {
      logger.warn(`[WS] handleRegister: Client-sent userId does not match authenticated session userId. Using session userId.`, { clientSent: clientSentUserId, sessionUserId: authenticatedUserId });
    }

    // Ensure client is in the map (should be if auto-registered on connection)
    if (!this.clients.has(authenticatedUserId)) {
        this.clients.set(authenticatedUserId, ws);
        logger.info(`[WS] User ${authenticatedUserId} added to clients map during handleRegister (should have been on connection).`, { userId: authenticatedUserId });
    }
    
    // Update user activity timestamp
    this.updateUserActivity(authenticatedUserId);

    // Send the current user list to the newly connected client
    // This might be redundant if already sent on 'connection' but ensures client gets it if 'register' is their trigger.
    await this.broadcastUserList();

    logger.info(`User ${authenticatedUserId} 'register' message processed.`, { userId: authenticatedUserId });
  }

  private async handleMessage(data: any) {
    try {
      const { message } = data;
      if (!message || !message.senderId || !message.receiverId || !message.content) {
        logger.error('Invalid message format received in handleMessage', { messageData: message });
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
      logger.error('Error handling and saving message in handleMessage', { error: error instanceof Error ? error : new Error(String(error)), messageData: data.message });
    }
  }

  private handleCallOffer(data: any) {
    const { callerId, receiverId, offer, callType } = data;
    if (!callerId || !receiverId || !offer) {
      logger.error('Invalid call offer received', { data });
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
      logger.error('Invalid call answer received', { data });
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
      logger.error('Invalid ICE candidate received', { data });
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
      logger.error('Invalid call end received', { data });
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
        logger.error(`Error fetching user details for broadcastUserList`, { userId, error: error instanceof Error ? error : new Error(String(error)) });
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