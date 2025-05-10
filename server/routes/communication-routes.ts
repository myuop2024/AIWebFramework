import express from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const router = express.Router();

// Reference to the communication service (will be set by server/routes.ts)
let communicationService: any = null;

export function setCommunicationService(service: any) {
  communicationService = service;
}

// Validate message schema
const messageSchema = z.object({
  receiverId: z.number(),
  content: z.string(),
  type: z.enum(['text', 'file', 'image', 'system']).optional().default('text')
});

// Get all conversations for the current user
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const conversations = await storage.getRecentConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get messages between current user and another user
router.get('/messages/:userId', async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const otherUserId = parseInt(req.params.userId);
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (isNaN(otherUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Get all online users
router.get('/online-users', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get all users from the database
    const allUsers = await storage.getAllUsers();
    
    // Get active users from the communication service
    const activeUserIds = communicationService ? communicationService.getActiveUsers() : [];
    
    // Map users with their online status
    const users = allUsers.map(user => ({
      id: user.id,
      username: user.username,
      status: activeUserIds.includes(user.id) ? 'online' : 'offline'
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

// Send a message to another user
router.post('/messages', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate request body
    const validationResult = messageSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.errors 
      });
    }
    
    const { receiverId, content, type } = validationResult.data;
    
    // Check if receiver exists
    const receiver = await storage.getUser(receiverId);
    
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }
    
    // Create message
    const message = await storage.createMessage({
      senderId: userId,
      receiverId,
      content,
      type,
      read: false,
      sentAt: new Date()
    });
    
    // Notify receiver if online through WebSocket
    if (communicationService) {
      const receiverOnline = communicationService.getUserStatus(receiverId) === 'online';
      
      if (receiverOnline) {
        // The notification will be handled by the socket event listeners
      }
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.patch('/messages/read', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { messageIds } = req.body;
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Invalid message IDs' });
    }
    
    const updatedMessages = [];
    
    for (const messageId of messageIds) {
      const message = await storage.getMessage(messageId);
      
      // Only allow marking messages as read if user is the receiver
      if (message && message.receiverId === userId) {
        const updatedMessage = await storage.markMessageAsRead(messageId);
        updatedMessages.push(updatedMessage);
        
        // Notify sender through WebSocket
        if (communicationService) {
          const senderOnline = communicationService.getUserStatus(message.senderId) === 'online';
          
          if (senderOnline) {
            // The notification will be handled by the socket event listeners
          }
        }
      }
    }
    
    res.json(updatedMessages);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get user status
router.get('/user-status/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user exists
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user status from communication service
    const status = communicationService ? communicationService.getUserStatus(userId) : 'offline';
    
    res.json({ status });
  } catch (error) {
    console.error('Error getting user status:', error);
    res.status(500).json({ error: 'Failed to get user status' });
  }
});

export default router;