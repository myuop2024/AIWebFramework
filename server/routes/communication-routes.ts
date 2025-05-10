import express from 'express';
import { storage } from '../storage'; // Assuming path is correct
import { z } from 'zod';
import { CommunicationService } from '../services/communication-service'; // Assuming path is correct

const router = express.Router();

// Reference to the communication service (will be set by server/routes.ts)
let communicationService: CommunicationService | null = null;

export function setCommunicationService(service: CommunicationService) {
  communicationService = service;
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
};

// Middleware to check for authenticated user
const ensureAuthenticated = (req, res, next) => {
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
    // req.userId is guaranteed by ensureAuthenticated middleware
    const conversations = await storage.getRecentConversations(req.userId);
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    // Pass error to centralized error handler
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

    // req.userId is guaranteed by ensureAuthenticated middleware
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
    // req.userId is guaranteed by ensureAuthenticated middleware
    const allUsersFromDb = await storage.getAllUsers(); // Assuming this fetches all users
    const activeUserIds = communicationService ? communicationService.getActiveUsers() : [];

    const usersWithStatus = allUsersFromDb.map(user => ({
      id: user.id,
      username: user.username,
      // Determine status based on activeUserIds from communicationService
      status: activeUserIds.includes(user.id) ? 'online' : 'offline',
      profileImage: user.profileImage || null, // Ensure consistent null or string
    }));

    res.json(usersWithStatus);
  } catch (error) {
    console.error('Error getting online users:', error);
    next(error);
  }
});

// Send a message to another user
router.post('/messages', ensureAuthenticated, async (req, res, next) => {
  try {
    // req.userId is guaranteed by ensureAuthenticated middleware
    const validationResult = messageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
    }

    const { receiverId, content, type } = validationResult.data;

    // Prevent sending message to oneself
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
      sentAt: new Date(), // Server-generated timestamp
    };

    const createdMessage = await storage.createMessage(messageData);

    // Actively notify receiver via WebSocket if communicationService is available
    if (communicationService) {
      communicationService.sendToUser(receiverId, {
        type: WS_NOTIFICATION_TYPES.NEW_MESSAGE,
        message: createdMessage, // Send the full message object
      });
      // Optionally, also notify the sender's other sessions if they are connected elsewhere
      // communicationService.sendToUser(req.userId, { type: 'message-sent-confirmation', message: createdMessage });
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
    // req.userId is guaranteed by ensureAuthenticated middleware
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

      // Only allow marking messages as read if the current user is the receiver and message is unread
      if (message && message.receiverId === req.userId && !message.read) {
        const updatedMessage = await storage.markMessageAsRead(messageId);
        updatedMessages.push(updatedMessage);
        messagesToNotifySenderAbout.push({ messageId: updatedMessage.id, senderId: message.senderId });
      } else if (message && message.receiverId === req.userId && message.read) {
        // If message already read by this user, still include it in response as "updated" (no change)
        updatedMessages.push(message);
      }
      // If message not found or user is not receiver, it's skipped (or could return an error per messageId)
    }

    // Notify senders via WebSocket
    if (communicationService && messagesToNotifySenderAbout.length > 0) {
      for (const { messageId, senderId } of messagesToNotifySenderAbout) {
        // Check if sender is online before sending notification
        const senderOnline = communicationService.getUserStatus(senderId) === 'online';
        if (senderOnline) {
          communicationService.sendToUser(senderId, {
            type: WS_NOTIFICATION_TYPES.MESSAGE_READ,
            messageId: messageId,
            readBy: req.userId // Good to include who read it
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
    // req.userId is guaranteed by ensureAuthenticated middleware
    const paramValidation = senderIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ error: 'Invalid sender ID format', details: paramValidation.error.errors });
    }
    const senderIdToMark = paramValidation.data.senderId;

    // Mark all unread messages from the sender (senderIdToMark) to the current user (req.userId) as read
    const count = await storage.markAllMessagesAsRead(senderIdToMark, req.userId);

    // Notify sender via WebSocket
    if (communicationService && count > 0) { // Only notify if messages were actually updated
      const senderOnline = communicationService.getUserStatus(senderIdToMark) === 'online';
      if (senderOnline) {
        communicationService.sendToUser(senderIdToMark, {
          type: WS_NOTIFICATION_TYPES.ALL_MESSAGES_READ,
          by: req.userId, // User who read the messages
          from: senderIdToMark // Messages from this user were read
        });
      }
    }
    res.json({ count }); // Returns the number of messages marked as read
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    next(error);
  }
});

// Get user status
router.get('/user-status/:userId', ensureAuthenticated, async (req, res, next) => {
  // Note: ensureAuthenticated here just checks if the requester is logged in,
  // not if they are asking about their own status. This seems fine for a general status check.
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

    const status = communicationService ? communicationService.getUserStatus(targetUserId) : 'offline';
    res.json({ userId: targetUserId, username: user.username, status });
  } catch (error) {
    console.error('Error getting user status:', error);
    next(error);
  }
});

export default router;