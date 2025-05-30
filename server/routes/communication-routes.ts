import express from 'express';
import { storage } from '../storage'; // Assuming path is correct
import { z } from 'zod';
import { CommunicationService } from '../services/communication-service'; // Assuming path is correct
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// --- Multer Configuration for File Uploads ---

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the upload directory exists
// Adjusted path to be relative to the project root assuming 'server/routes' is the current file's dir.
// The 'public' folder should be at the project root, alongside 'server'.
const uploadDir = path.join(__dirname, '../../../public/uploads/communication_files');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`Upload directory created: ${uploadDir}`);
    } catch (err) {
        console.error(`Error creating upload directory ${uploadDir}:`, err);
        // Depending on the desired behavior, you might want to throw an error here
        // or ensure the application doesn't start if the directory can't be created.
    }
}

// Multer storage configuration
const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename and make it unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        // Sanitize original name: replace non-alphanumeric (excluding _, ., -) with _, truncate to 100 chars
        const sanitizedOriginalName = file.originalname
            .replace(/[^a-zA-Z0-9_.-]/g, '_')
            .substring(0, 100);
        cb(null, sanitizedOriginalName + '-' + uniqueSuffix + extension);
    }
});

// File filter (example: allow only common image types and PDFs, up to 10MB)
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        // Add more types as needed:
        // 'application/msword', // .doc
        // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        // 'text/plain', // .txt
        // 'application/zip' // .zip
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF are allowed.'));
    }
};

// Multer upload instance
const upload = multer({
    storage: storageConfig,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: fileFilter // Apply the file filter
});

// --- End Multer Configuration ---

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
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      // Determine status based on activeUserIds from communicationService
      status: activeUserIds.includes(user.id) ? 'online' : 'offline',
      profileImage: user.profileImage || null, // Ensure consistent null or string
      role: user.role || null,
      parish: user.parish || null,
    }));

    console.log(`[API] /online-users requested by userId: ${req.userId}`);
    console.log(`[API] /online-users response:`, usersWithStatus);

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

    console.log(`[API] Message sent from ${req.userId} to ${receiverId}:`, content);

    // Actively notify receiver and sender (for their other sessions) via WebSocket
    if (communicationService) {
      // Send to receiver
      communicationService.sendToUser(receiverId, {
        type: WS_NOTIFICATION_TYPES.NEW_MESSAGE,
        message: createdMessage,
      });
      // Send to sender's other connected sessions
      // Ensure sender doesn't receive it on the same session that made the POST by client-side handling if needed,
      // but typically, different sessions are different WebSocket clients.
      if (req.userId !== receiverId) { // Avoid sending another message if sender is also receiver (self-chat, though currently blocked)
        communicationService.sendToUser(req.userId, {
          type: WS_NOTIFICATION_TYPES.NEW_MESSAGE,
          message: createdMessage,
        });
      }
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

// New file upload route
router.post('/upload-file', ensureAuthenticated, upload.single('file'), (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Construct the file path that the client can use.
    // This path is relative to the 'public' directory if 'public' is served statically.
    // Or, it's relative to a specific static route if configured (e.g., app.use('/uploads', express.static(...))).
    // For this example, we assume it will be accessible via `/uploads/communication_files/FILENAME`.
    const webAccessiblePath = `/uploads/communication_files/${req.file.filename}`;

    res.json({
        success: true,
        message: 'File uploaded successfully',
        filePath: webAccessiblePath, // Path for client to construct URL, e.g., <host>/uploads/communication_files/filename.ext
        fileName: req.file.originalname, // Original name for display
        fileSize: req.file.size,
        fileType: req.file.mimetype
    });
}, (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // This is an error handler specifically for multer errors (like file type or size limit)
    if (err instanceof multer.MulterError) {
        // A Multer error occurred (e.g., file too large)
        return res.status(400).json({ error: err.message });
    } else if (err) {
        // An unknown error occurred (e.g., file type rejected by fileFilter)
        return res.status(400).json({ error: err.message });
    }
    // If no error, or error already handled by route logic, proceed
    next();
});

export default router;