import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { CommunicationService } from '../services/communication-service';

let communicationService: CommunicationService | null = null;

export function setCommunicationService(service: CommunicationService) {
  communicationService = service;
}

const router = Router();

// Get the current user's conversations
router.get('/conversations', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversations = await storage.getRecentConversations(req.user.id);
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get messages between the current user and a specific user
router.get('/messages/:userId', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const messages = await storage.getMessagesBetweenUsers(req.user.id, userId);
    
    // Mark messages as read
    for (const message of messages) {
      if (message.receiverId === req.user.id && !message.read) {
        await storage.markMessageAsRead(message.id!);
      }
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send a message to another user
router.post('/messages', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const schema = z.object({
      receiverId: z.number(),
      content: z.string().min(1),
      type: z.enum(['text', 'file', 'image', 'system']).default('text'),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid request body', details: result.error });
    }

    const { receiverId, content, type } = result.data;

    const message = await storage.createMessage({
      senderId: req.user.id,
      receiverId,
      content,
      type,
      sentAt: new Date(),
      read: false
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get the list of online users (will be populated via WebSockets)
router.get('/online-users', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, return all users as there's no persistent online status in the DB
    const users = await storage.getAllUsers();
    
    // Filter out the current user
    const filteredUsers = users.filter(user => user.id !== req.user?.id);
    
    // Transform to match the expected format in the client
    const formattedUsers = filteredUsers.map(user => ({
      id: user.id,
      username: user.username,
      status: 'offline' // Default status
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

export default router;