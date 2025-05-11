import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage'; // Assuming storage is correctly set up
import { InsertMessage, User as DbUser } from '@shared/schema'; // Assuming @shared/schema is your Drizzle schema

// Define a User type for what's broadcasted, including all necessary fields for the frontend
interface BroadcastUser {
  id: number;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  role?: string | null;
  parish?: string | null;
  status: 'online' | 'offline' | 'away';
}

interface WebSocketClient extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

export class CommunicationService {
  private wss: WebSocketServer;
  private clients = new Map<number, WebSocketClient>(); // Maps userId to WebSocketClient
  private userLastActivity = new Map<number, number>(); // Maps userId to last activity timestamp
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' }); // Define WebSocket path
    this.initializeWebSocketServer();
    this.startPingInterval();
    console.log('[CommService] CommunicationService initialized and WebSocket server started on /ws');
  }

  private initializeWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient) => {
      console.log('[CommService] New WebSocket client connected.');
      ws.isAlive = true; // Mark client as alive initially

      // Handle pong responses to keep connection alive
      ws.on('pong', () => {
        ws.isAlive = true;
        if (ws.userId) {
          this.updateUserActivity(ws.userId, 'pong received');
        }
      });

      // Handle incoming messages from clients
      ws.on('message', async (messageBuffer: Buffer) => {
        const messageString = messageBuffer.toString();
        try {
          const data = JSON.parse(messageString);
          console.log('[CommService] WebSocket message received:', data);

          switch (data.type) {
            case 'register':
              await this.handleRegister(ws, data);
              break;
            case 'message':
              // IMPORTANT: This handler assumes messages are sent via HTTP POST first,
              // saved to DB by the router, and then the router calls `sendToUser` to relay.
              // If messages were to be sent *directly* via WebSocket from client to be saved and relayed by the service,
              // then the `storage.createMessage` call below would be necessary.
              // For now, it's commented out to prevent double-saving.
              // await this.handleAndRelayWsMessage(data);
              console.warn('[CommService] Received direct "message" type via WebSocket. This path might be deprecated if HTTP POST is primary for sending messages.');
              // If you intend for clients to send messages via WS to be saved and relayed:
              // 1. Ensure frontend sends 'message' type with full message payload.
              // 2. Uncomment `handleAndRelayWsMessage` or similar logic.
              // 3. Adjust frontend `sendMessage` in `useCommunication` to send via WS instead of/in addition to HTTP.
              break;
            case 'call-offer':
              this.handleSignalingMessage(data, 'call-offer');
              break;
            case 'call-answer':
              this.handleSignalingMessage(data, 'call-answer');
              break;
            case 'call-candidate':
              this.handleSignalingMessage(data, 'call-candidate');
              break;
            case 'call-end':
              this.handleSignalingMessage(data, 'call-end');
              break;
            case 'heartbeat': // Client-side heartbeat to indicate activity
              if (data.userId && ws.userId === data.userId) { // Ensure heartbeat is from the registered user for this ws
                this.updateUserActivity(data.userId, 'heartbeat received');
                ws.isAlive = true; // Also mark as alive on heartbeat
              } else {
                console.warn('[CommService] Heartbeat received for mismatched userId or no userId on ws.', { dataUserId: data.userId, wsUserId: ws.userId });
              }
              break;
            default:
              console.warn('[CommService] Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('[CommService] Error parsing or handling WebSocket message:', error, `Raw message: ${messageString}`);
        }
      });

      // Handle client disconnection
      ws.on('close', (code, reason) => {
        console.log(`[CommService] WebSocket client disconnected. Code: ${code}, Reason: ${reason?.toString()}`);
        if (ws.userId) {
          const disconnectedUserId = ws.userId;
          this.clients.delete(disconnectedUserId);
          // No need to explicitly remove from userLastActivity, getUserStatus will handle it.
          console.log(`[CommService] User ${disconnectedUserId} removed from active clients.`);
          this.broadcastUserList().catch(err => console.error("[CommService] Error broadcasting user list on disconnect:", err));
        } else {
          console.log('[CommService] Unregistered WebSocket client disconnected.');
        }
      });

      ws.on('error', (error) => {
        console.error('[CommService] WebSocket client error:', error);
        // `close` event will usually follow, which handles cleanup.
      });
    });
  }

  // Periodically ping clients and check for dead connections
  private startPingInterval() {
    if (this.pingInterval) clearInterval(this.pingInterval); // Clear existing interval if any

    this.pingInterval = setInterval(() => {
      let didUserListChange = false;
      this.wss.clients.forEach((wsInstance) => {
        const ws = wsInstance as WebSocketClient; // Cast to our extended type
        if (!ws.isAlive) { // If pong not received since last ping
          if (ws.userId) {
            console.log(`[CommService] Terminating dead connection for user ${ws.userId}.`);
            this.clients.delete(ws.userId);
            didUserListChange = true;
          } else {
            console.log('[CommService] Terminating dead connection for unregistered client.');
          }
          return ws.terminate();
        }
        ws.isAlive = false; // Expect a pong to set it back to true
        ws.ping();
      });

      // If any user was removed due to timeout, or just for periodic update
      // Consider if broadcasting on every ping interval is too much if no changes.
      // For now, it ensures status (like 'away') is updated.
      if (didUserListChange) {
        this.broadcastUserList().catch(err => console.error("[CommService] Error broadcasting user list in ping interval after change:", err));
      } else {
        // Even if no one disconnected, 'away' statuses might need update.
        // A more optimized approach might be to only broadcast if statuses actually changed.
         this.broadcastUserList().catch(err => console.error("[CommService] Error broadcasting user list in ping interval (periodic):", err));
      }
    }, 30000); // Ping every 30 seconds (client timeout should be a bit longer)
  }

  public close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.wss.close(() => {
      console.log('[CommService] WebSocket server closed.');
    });
  }

  // Handle user registration via WebSocket
  private async handleRegister(ws: WebSocketClient, data: { userId: number }) {
    const userId = data.userId;
    if (!userId || typeof userId !== 'number') {
      console.warn('[CommService] Invalid or missing userId for registration:', userId);
      ws.send(JSON.stringify({ type: 'error', message: 'Registration failed: Invalid userId.' }));
      ws.terminate(); // Or close gracefully
      return;
    }

    // If user is already registered with another client, close the old one.
    const existingClient = this.clients.get(userId);
    if (existingClient && existingClient !== ws) {
        console.log(`[CommService] User ${userId} re-registering. Closing old connection.`);
        existingClient.send(JSON.stringify({ type: 'connection-replaced', message: 'You connected from another location.'}));
        existingClient.terminate();
    }

    this.clients.set(userId, ws);
    ws.userId = userId; // Associate userId with the WebSocket connection object
    this.updateUserActivity(userId, 'registered');
    console.log(`[CommService] User ${userId} registered and added to active clients.`);

    await this.broadcastUserList(); // Notify all clients about the updated user list
  }

  // This function is for when a WebSocket message of type 'message' is received by the service.
  // As noted above, this might be redundant if HTTP POST is the primary way messages are sent and saved.
  // private async handleAndRelayWsMessage(data: { message: InsertMessage & { senderId: number, receiverId: number } }) {
  //   try {
  //     const { message } = data;
  //     if (!message || !message.senderId || !message.receiverId || !message.content) {
  //       console.error('[CommService] Invalid message format for WS relay:', message);
  //       return;
  //     }

  //     // ** IF THIS SERVICE IS RESPONSIBLE FOR SAVING MESSAGES SENT VIA WS **
  //     // const savedMessage = await storage.createMessage({
  //     //   senderId: message.senderId,
  //     //   receiverId: message.receiverId,
  //     //   content: message.content,
  //     //   type: message.type || 'text',
  //     //   // sentAt will be set by DB or createMessage
  //     // });
  //     // console.log('[CommService] Message saved via WS handler:', savedMessage.id);

  //     // For now, assuming message is already saved if it came from HTTP route,
  //     // and this WS 'message' type is for direct client-to-client relay if ever used.
  //     // The `message` object in `data` should be the full message object.

  //     // Relay to sender's other devices (if any) and to the receiver
  //     this.sendToUser(message.senderId, { type: 'message', message: data.message /* or savedMessage */ });
  //     if (message.senderId !== message.receiverId) { // Avoid sending to self twice if sender is receiver
  //       this.sendToUser(message.receiverId, { type: 'message', message: data.message /* or savedMessage */ });
  //     }
  //   } catch (error) {
  //     console.error('[CommService] Error in handleAndRelayWsMessage:', error);
  //   }
  // }


  // Generic handler for WebRTC signaling messages
  private handleSignalingMessage(data: any, expectedType: 'call-offer' | 'call-answer' | 'call-candidate' | 'call-end') {
    const { callerId, receiverId } = data; // Common fields

    if (!callerId || !receiverId) {
      console.error(`[CommService] Invalid ${expectedType} message: missing callerId or receiverId. Data:`, data);
      return;
    }

    // Determine the actual target for this message.
    // For offer, target is receiverId. For answer, target is callerId.
    // For candidate and end, it's usually the other party.
    let targetId = null;
    if (data.type === 'call-offer' || (data.type === 'call-candidate' && data.candidate)) { // Candidate goes to the other party
        targetId = receiverId;
    } else if (data.type === 'call-answer' || (data.type === 'call-end' && data.reason)) { // Answer and End go back to the original caller (or other party)
        targetId = callerId;
    }
    // Special handling for call-end if it can be initiated by either party to notify the other.
    // If current message is from callerId to receiverId, then the actual signaling target (the one to notify) is receiverId.
    // If current message is from receiverId (e.g. reject), then target is callerId.
    // The frontend useCommunication hook seems to always set callerId as the initiator of the end message.
    if(data.type === 'call-end') {
        // The message is sent TO data.receiverId FROM data.callerId (who initiated the end)
        targetId = data.receiverId;
    }


    if (targetId && targetId !== data.senderId /* Ensure not sending back to self if senderId is present */) {
      console.log(`[CommService] Relaying ${expectedType} from ${callerId} to ${targetId}`);
      this.sendToUser(targetId, data); // Forward the original data object
    } else {
      console.warn(`[CommService] Could not determine target for ${expectedType} or target is sender. Data:`, data);
    }
  }

  // Send data to a specific user by their ID
  public sendToUser(userId: number, data: any): boolean {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
        console.log(`[CommService] Sent data to user ${userId}:`, data.type);
        return true;
      } catch (error) {
        console.error(`[CommService] Error sending data to user ${userId}:`, error);
        return false;
      }
    } else {
      console.log(`[CommService] User ${userId} not connected or client not found. Cannot send data.`);
      return false;
    }
  }

  // Get IDs of all currently active (connected) users
  public getActiveUserIds(): number[] {
    return Array.from(this.clients.keys());
  }

  // Update the last activity timestamp for a user
  private updateUserActivity(userId: number, reason: string) {
    this.userLastActivity.set(userId, Date.now());
    // console.log(`[CommService] Updated activity for user ${userId} due to: ${reason}`);
  }

  // Get the status of a specific user ('online', 'offline', 'away')
  public getUserStatus(userId: number): 'online' | 'offline' | 'away' {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      // If actively connected, they are online. Update activity just in case.
      this.updateUserActivity(userId, 'status check');
      return 'online';
    }

    const lastActivity = this.userLastActivity.get(userId);
    const now = Date.now();
    const AWAY_TIMEOUT = 5 * 60 * 1000; // 5 minutes for away status

    if (lastActivity && (now - lastActivity < AWAY_TIMEOUT)) {
      return 'away'; // Recently active but not currently connected via an open WebSocket
    }

    return 'offline';
  }

  // Broadcast the list of online/away users to all connected clients
  private async broadcastUserList() {
    const usersToBroadcast: BroadcastUser[] = [];

    // Iterate over all users known to the system or recently active, not just currently connected ones.
    // This allows showing 'away' or 'offline' status for users who were recently connected.
    // A more robust way might be to fetch all users from DB and then update their status.
    // For now, let's iterate unique user IDs from clients map and last activity map.
    const allPotentiallyRelevantUserIds = new Set([...this.clients.keys(), ...this.userLastActivity.keys()]);

    for (const userId of allPotentiallyRelevantUserIds) {
      try {
        const dbUser = await storage.getUser(userId); // Fetch latest user details from DB
        if (dbUser) {
          usersToBroadcast.push({
            id: dbUser.id,
            username: dbUser.username,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            profileImage: dbUser.profileImage,
            role: dbUser.role,
            parish: dbUser.parish,
            status: this.getUserStatus(userId), // Get the most current status
          });
        }
      } catch (error) {
        console.error(`[CommService] Error fetching details for user ${userId} during broadcast:`, error);
      }
    }

    const dataToSend = {
      type: 'users', // Matches WS_MSG_TYPES.USERS_LIST on the frontend
      users: usersToBroadcast,
    };

    console.log(`[CommService] Broadcasting user list. Count: ${usersToBroadcast.length}. Online: ${usersToBroadcast.filter(u=>u.status === 'online').length}`);
    this.wss.clients.forEach((clientInstance) => {
      const client = clientInstance as WebSocketClient;
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(dataToSend));
        } catch (error) {
            console.error("[CommService] Error sending user list to a client:", error);
        }
      }
    });
  }
}