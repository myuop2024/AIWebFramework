import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { loginUserSchema, insertUserSchema, insertUserProfileSchema, insertDocumentSchema, insertReportSchema } from "@shared/schema";
import express from "express";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createHash } from "crypto";

// Chat message interface
interface ChatMessage {
  type: 'message' | 'notification' | 'status';
  senderId?: number;
  receiverId?: number;
  content: string;
  timestamp: Date;
}

// Connected clients tracking
type ConnectedClient = {
  userId: number;
  socket: WebSocket;
};

let connectedClients: ConnectedClient[] = [];

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (socket) => {
    socket.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        
        // Handle authentication message
        if (parsedMessage.type === 'auth') {
          const userId = parsedMessage.userId;
          // Add to connected clients
          connectedClients.push({ userId, socket });
          
          // Send confirmation
          socket.send(JSON.stringify({
            type: 'notification',
            content: 'Connected to chat server',
            timestamp: new Date()
          }));
        }
        
        // Handle chat message
        else if (parsedMessage.type === 'message') {
          const { senderId, receiverId, content } = parsedMessage;
          
          // Save message to DB
          storage.createMessage({
            senderId,
            receiverId,
            content
          }).then(message => {
            // Send to recipient if online
            const recipient = connectedClients.find(client => client.userId === receiverId);
            if (recipient) {
              recipient.socket.send(JSON.stringify({
                type: 'message',
                senderId,
                receiverId,
                content,
                timestamp: message.sentAt
              }));
            }
            
            // Send confirmation to sender
            socket.send(JSON.stringify({
              type: 'status',
              content: 'Message sent',
              messageId: message.id,
              timestamp: message.sentAt
            }));
          });
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
    
    socket.on('close', () => {
      // Remove from connected clients
      connectedClients = connectedClients.filter(client => client.socket !== socket);
    });
  });
  
  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Hash password
      const hashedPassword = createHash('sha256').update(userData.password).digest('hex');
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginUserSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Verify password
      const hashedPassword = createHash('sha256').update(password).digest('hex');
      if (user.password !== hashedPassword) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Set session data
      req.session.userId = user.id;
      req.session.observerId = user.observerId;
      req.session.role = user.role;
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
  
  // Middleware to check authentication
  const requireAuth = (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  };
  
  // User profile routes
  app.get('/api/users/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get profile
      const profile = await storage.getUserProfile(userId);
      
      // Get documents
      const documents = await storage.getDocumentsByUserId(userId);
      
      // Remove sensitive data
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json({
        user: userWithoutPassword,
        profile,
        documents
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/users/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const profileData = insertUserProfileSchema.parse(req.body);
      
      // Check if profile exists
      const existingProfile = await storage.getUserProfile(userId);
      
      let profile;
      if (existingProfile) {
        profile = await storage.updateUserProfile(userId, {
          ...profileData,
          userId
        });
      } else {
        profile = await storage.createUserProfile({
          ...profileData,
          userId
        });
      }
      
      // Update user verification status
      await storage.updateUser(userId, { verificationStatus: 'in-progress' });
      
      res.status(200).json(profile);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Document routes
  app.post('/api/documents', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const documentData = insertDocumentSchema.parse(req.body);
      
      const document = await storage.createDocument({
        ...documentData,
        userId
      });
      
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/documents', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const documents = await storage.getDocumentsByUserId(userId);
      
      res.status(200).json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Polling station routes
  app.get('/api/polling-stations', requireAuth, async (req, res) => {
    try {
      const stations = await storage.getAllPollingStations();
      res.status(200).json(stations);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/users/assignments', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const assignments = await storage.getAssignmentsByUserId(userId);
      
      // Get full station data
      const assignmentsWithStations = await Promise.all(
        assignments.map(async (assignment) => {
          const station = await storage.getPollingStation(assignment.stationId);
          return {
            ...assignment,
            station
          };
        })
      );
      
      res.status(200).json(assignmentsWithStations);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Report routes
  app.post('/api/reports', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const reportData = insertReportSchema.parse(req.body);
      
      const report = await storage.createReport({
        ...reportData,
        userId
      });
      
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/reports', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const reports = await storage.getReportsByUserId(userId);
      
      // Get station information for each report
      const reportsWithStations = await Promise.all(
        reports.map(async (report) => {
          const station = await storage.getPollingStation(report.stationId);
          return {
            ...report,
            station
          };
        })
      );
      
      res.status(200).json(reportsWithStations);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Event routes
  app.get('/api/events', requireAuth, async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/events/upcoming', requireAuth, async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // FAQ routes
  app.get('/api/faqs', async (req, res) => {
    try {
      const faqs = await storage.getAllFaqs();
      res.status(200).json(faqs);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // News routes
  app.get('/api/news', async (req, res) => {
    try {
      const news = await storage.getAllNews();
      res.status(200).json(news);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/news/latest', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const news = await storage.getLatestNews(limit);
      res.status(200).json(news);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Message routes
  app.get('/api/messages/:receiverId', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const receiverId = parseInt(req.params.receiverId);
      
      const messages = await storage.getMessagesBetweenUsers(userId, receiverId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/messages/:receiverId/read/:messageId', requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      
      const message = await storage.markMessageAsRead(messageId);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      res.status(200).json(message);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // QR Code generation route (in real implementation would use a QR code library)
  app.get('/api/users/qrcode', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // In a real implementation, this would generate an actual QR code
      // Here we're just returning the observer ID that would be encoded
      res.status(200).json({ 
        observerId: user.observerId,
        qrCodeData: `CAFFE-OBSERVER-${user.observerId}`
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  return httpServer;
}
