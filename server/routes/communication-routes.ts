import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth";
import { storage } from "../storage";
import logger from "../utils/logger";

// This will be populated by the communication service
let communicationServiceInstance: any = null;

export function setCommunicationService(service: any) {
  communicationServiceInstance = service;
}

const communicationRouter = Router();

// Get online users
communicationRouter.get("/api/communication/users/online", ensureAuthenticated, async (req, res) => {
  try {
    if (!communicationServiceInstance) {
      return res.status(503).json({ message: "Communication service not available" });
    }
    
    const onlineUsers = communicationServiceInstance.getOnlineUsers();
    res.json(onlineUsers);
  } catch (error) {
    logger.error("Error fetching online users:", error);
    res.status(500).json({ message: "Failed to fetch online users" });
  }
});

// Get user conversations
communicationRouter.get("/api/communication/conversations", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId as number;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get user's recent conversations
    const messages = await storage.getRecentConversations(userId);
    res.json(messages);
  } catch (error) {
    logger.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Get messages between two users
communicationRouter.get("/api/communication/messages/:userId", ensureAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.session.userId as number;
    const otherUserId = parseInt(req.params.userId);
    
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isNaN(otherUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
    res.json(messages);
  } catch (error) {
    logger.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Mark message as read
communicationRouter.post("/api/communication/messages/:id/read", ensureAuthenticated, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    
    if (isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }
    
    const message = await storage.markMessageAsRead(messageId);
    res.json(message);
  } catch (error) {
    logger.error("Error marking message as read:", error);
    res.status(500).json({ message: "Failed to mark message as read" });
  }
});

export default communicationRouter;