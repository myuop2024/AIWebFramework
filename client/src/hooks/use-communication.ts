import { clientStorage } from '../storage'; // Client-side storage proxy
import { z } from 'zod';
import { CommunicationService } from '../services/communication-service'; // Assuming path is correct

const router = express.Router();

// Reference to the communication service (will be set by server/routes.ts)
let communicationService: CommunicationService | null = null;

export function setCommunicationService(service: CommunicationService) {
  communicationService = service;
  console.log('[Router] CommunicationService has been set.'); // Log when service is set
}

// --- Zod Schemas for Validation ---
const messageSchema = z.object({
  receiverId: z.number().int().positive(),
  content: z.string().min(1), // Ensure content is not empty
  type: z.enum(['text', 'file', 'image', 'system']).optional().default('text'),
});

const userIdParamSchema = z.object({
  userId: z.string().refine(val => !isNaN(parseInt(val)), { message: "User ID must be a number." }).transform(val => parseInt(val)),
});

const senderIdParamSchema = z.object({
  senderId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Sender ID must be a number." }).transform(val => parseInt(val)),
});

const markMessagesReadSchema = z.object({
  messageIds: z.array(z.number().int().positive()).min(1), // Must be an array of positive integers, at least one
});

// --- WebSocket Message Types (for consistency with frontend) ---
const WS_NOTIFICATION_TYPES = {
  NEW_MESSAGE: 'message', // Matches WS_MSG_TYPES.NEW_MESSAGE in useCommunication hook
  MESSAGE_READ: 'message-read',
  ALL_MESSAGES_READ: 'all-messages-read',
  // It's good practice to also have a type for broadcasting user status updates if not already covered
  // e.g., USER_STATUS_UPDATE: 'user-status-update' or rely on a full USERS_LIST broadcast
};

// Middleware to check for authenticated user
const ensureAuthenticated = (req: any, res: any, next: any) => { // Added types for req, res, next for clarity
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Make userId available directly on req for convenience, assuming req.user.id is number
  req.userId = req.user.id as number;
  next();
};


// Get all conversations for the current user
router.get('/conversations', ensureAuthenticated, async (req, res, next) => {
  try {
    const conversations = await storage.getRecentConversations(req.userId);
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    next(error);
  }
});

// Get messages between current user and another user
router.get('/messages/:userId', ensureAuthenticated, async (req, res, next) => {
  try {
    const paramValidation = userIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ error: 'Invalid user ID format', details: paramValidation.error.errors });
    }
    const otherUserId = paramValidation.data.userId;

    const messages = await storage.getMessagesBetweenUsers(req.userId, otherUserId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    next(error);
  }
});

// Get all online users (including current user's perspective)
router.get('/online-users', ensureAuthenticated, async (req, res, next) => {
  try {
    const allUsersFromDb = await storage.getAllUsers(); // Assuming this fetches all users

    if (!communicationService) {
        console.warn('[Router /online-users] CommunicationService is NOT AVAILABLE. Online statuses will be inaccurate (all offline).');
    }
    // activeUserIds should be a list of user IDs that are currently connected via WebSocket
    const activeUserIds = communicationService ? communicationService.getActiveUsers() : [];
    console.log('[Router /online-users] Active User IDs from CommunicationService:', activeUserIds);

    const usersWithStatus = allUsersFromDb.map(user => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      // Correctly determine status based on activeUserIds from communicationService
      // The CommunicationService is the source of truth for "online" status.
      status: activeUserIds.includes(user.id) ? 'online' : 'offline',
      profileImage: user.profileImage || null,
      role: user.role || null,
      parish: user.parish || null,
    }));

    // console.log('[Router /online-users] Sending users with status. Online users:', usersWithStatus.filter(u => u.status === 'online').map(u => u.id));
    res.json(usersWithStatus);
  } catch (error) {
    console.error('Error getting online users:', error);
    next(error);
  }
});

// Send a message to another user
router.post('/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    const validationResult = messageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
    }

    const { receiverId, content, type } = validationResult.data;

    if (receiverId === req.userId) {
        return res.status(400).json({ error: 'Cannot send messages to yourself.' });
    }

    const receiver = await storage.getUser(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const messageData = {
      senderId: req.userId,
      receiverId,
      content,
      type,
      read: false,
      sentAt: new Date(),
    };

    const createdMessage = await storage.createMessage(messageData);

    if (communicationService) {
      // Notify the receiver via WebSocket
      communicationService.sendToUser(receiverId, {
        type: WS_NOTIFICATION_TYPES.NEW_MESSAGE,
        message: createdMessage, // Send the full message object
      });
      // Optionally, also notify the sender's other sessions if they are connected elsewhere
      // This confirms to the sender's other devices that the message was sent.
      // communicationService.sendToUser(req.userId, {
      //   type: WS_NOTIFICATION_TYPES.NEW_MESSAGE, // Can be the same type or a specific confirmation type
      //   message: createdMessage,
      //   isConfirmation: true // Optional flag
      // });
    } else {
        console.warn('[Router /messages] CommunicationService not available. Real-time notification not sent.');
    }

    res.status(201).json(createdMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    next(error);
  }
});

// Mark individual messages as read
router.patch('/messages/read', ensureAuthenticated, async (req, res, next) => {
  try {
    const validationResult = markMessagesReadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data for marking messages as read',
        details: validationResult.error.errors,
      });
    }
    const { messageIds } = validationResult.data;

    const updatedMessages = [];
    const messagesToNotifySenderAbout = [];

    for (const messageId of messageIds) {
      const message = await storage.getMessage(messageId);

      if (message && message.receiverId === req.userId && !message.read) {
        const updatedMessage = await storage.markMessageAsRead(messageId);
        updatedMessages.push(updatedMessage);
        messagesToNotifySenderAbout.push({ messageId: updatedMessage.id, senderId: message.senderId, readBy: req.userId });
      } else if (message && message.receiverId === req.userId && message.read) {
        updatedMessages.push(message);
      }
    }

    if (communicationService && messagesToNotifySenderAbout.length > 0) {
      for (const { messageId, senderId, readBy } of messagesToNotifySenderAbout) {
        if (communicationService.getUserStatus(senderId) === 'online') { // Check if sender is online
          communicationService.sendToUser(senderId, {
            type: WS_NOTIFICATION_TYPES.MESSAGE_READ,
            messageId: messageId,
            readBy: readBy
          });
        }
      }
    }
    res.json(updatedMessages);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    next(error);
  }
});


// Mark all messages from a specific sender as read by the current user
router.patch('/messages/read-all/:senderId', ensureAuthenticated, async (req, res, next) => {
  try {
    const paramValidation = senderIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ error: 'Invalid sender ID format', details: paramValidation.error.errors });
    }
    const senderIdToMark = paramValidation.data.senderId;

    const count = await storage.markAllMessagesAsRead(senderIdToMark, req.userId);

    if (communicationService && count > 0) {
      if (communicationService.getUserStatus(senderIdToMark) === 'online') {
        communicationService.sendToUser(senderIdToMark, {
          type: WS_NOTIFICATION_TYPES.ALL_MESSAGES_READ,
          by: req.userId,
          from: senderIdToMark
        });
      }
    }
    res.json({ count });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    next(error);
  }
});

// Get user status (primarily for checking if a user exists and their DB record, real-time status from communicationService)
router.get('/user-status/:userId', ensureAuthenticated, async (req, res, next) => {
  try {
    const paramValidation = userIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ error: 'Invalid user ID format', details: paramValidation.error.errors });
    }
    const targetUserId = paramValidation.data.userId;

    const user = await storage.getUser(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get real-time status from CommunicationService if available
    const status = communicationService ? communicationService.getUserStatus(targetUserId) : 'offline';
    res.json({ userId: targetUserId, username: user.username, status });
  } catch (error) {
    console.error('Error getting user status:', error);
    next(error);
  }
});

export default router;