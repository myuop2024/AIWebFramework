import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  loginUserSchema, 
  insertUserSchema, 
  insertUserProfileSchema, 
  insertDocumentSchema, 
  insertReportSchema,
  insertFormTemplateSchema,
  formTemplateExtendedSchema
} from "@shared/schema";
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
      // Remove from connected clients by identifying the correct client based on reference
      const socketId = connectedClients.findIndex(client => 
        client.socket === socket
      );
      if (socketId !== -1) {
        connectedClients.splice(socketId, 1);
      }
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
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

  app.get('/api/users/assignments/active', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const assignments = await storage.getActiveAssignments(userId);
      
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
      console.error('Error fetching active assignments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/stations/:stationId/assignments', requireAuth, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      if (isNaN(stationId)) {
        return res.status(400).json({ message: 'Invalid station ID' });
      }
      
      const assignments = await storage.getAssignmentsByStationId(stationId);
      
      // Add user information for each assignment
      const assignmentsWithUsers = await Promise.all(
        assignments.map(async (assignment) => {
          const user = await storage.getUser(assignment.userId);
          return {
            ...assignment,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              observerId: user.observerId,
              role: user.role
            } : null
          };
        })
      );
      
      res.status(200).json(assignmentsWithUsers);
    } catch (error) {
      console.error('Error fetching station assignments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/assignments/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      const assignmentId = parseInt(req.params.id);
      
      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: 'Invalid assignment ID' });
      }
      
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      // Security check - only allow users to view their own assignments 
      // unless they're an admin
      if (assignment.userId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to access this assignment' });
      }
      
      // Get station info
      const station = await storage.getPollingStation(assignment.stationId);
      
      res.status(200).json({
        ...assignment,
        station
      });
    } catch (error) {
      console.error('Error fetching assignment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/assignments', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      
      // Basic validation
      if (!req.body.stationId || !req.body.startDate || !req.body.endDate) {
        return res.status(400).json({ 
          message: 'Missing required fields: stationId, startDate, and endDate are required' 
        });
      }

      // Parse dates
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      if (startDate >= endDate) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
      
      // Only allow admins to assign other users
      const assignUserId = userRole === 'admin' && req.body.userId 
        ? parseInt(req.body.userId) 
        : userId;
      
      // Create assignment with parsed dates
      const assignment = await storage.createAssignment({
        ...req.body,
        userId: assignUserId,
        startDate,
        endDate
      });
      
      // Get station info
      const station = await storage.getPollingStation(assignment.stationId);
      
      res.status(201).json({
        ...assignment,
        station
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      // Send user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('conflict')) {
          return res.status(409).json({ message: error.message });
        } else if (error.message.includes('capacity')) {
          return res.status(409).json({ message: error.message });
        } else if (error.message.includes('not found')) {
          return res.status(404).json({ message: error.message });
        }
      }
      res.status(500).json({ message: 'An error occurred while creating the assignment' });
    }
  });
  
  app.put('/api/assignments/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      const assignmentId = parseInt(req.params.id);
      
      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: 'Invalid assignment ID' });
      }
      
      // Get the current assignment
      const currentAssignment = await storage.getAssignment(assignmentId);
      if (!currentAssignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      // Check permissions - only allow users to update their own assignments
      // or admins to update any
      if (currentAssignment.userId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this assignment' });
      }
      
      // Parse dates if they're in the request
      const data = { ...req.body };
      if (req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ message: 'Invalid start date format' });
        }
        data.startDate = startDate;
      }
      
      if (req.body.endDate) {
        const endDate = new Date(req.body.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ message: 'Invalid end date format' });
        }
        data.endDate = endDate;
      }
      
      // Validate dates
      const finalStartDate = data.startDate || currentAssignment.startDate;
      const finalEndDate = data.endDate || currentAssignment.endDate;
      
      if (finalStartDate >= finalEndDate) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
      
      // Update the assignment
      const updatedAssignment = await storage.updateAssignment(assignmentId, data);
      
      // Get station info
      const station = await storage.getPollingStation(updatedAssignment.stationId);
      
      res.status(200).json({
        ...updatedAssignment,
        station
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      // Send user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('conflict')) {
          return res.status(409).json({ message: error.message });
        }
      }
      res.status(500).json({ message: 'An error occurred while updating the assignment' });
    }
  });
  
  app.post('/api/assignments/:id/check-in', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      const assignmentId = parseInt(req.params.id);
      
      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: 'Invalid assignment ID' });
      }
      
      // Get the current assignment
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      // Check permissions - only allow users to check into their own assignments
      // unless they're an admin
      if (assignment.userId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to check into this assignment' });
      }
      
      // Check that the assignment is scheduled or can be checked into
      if (assignment.status !== 'scheduled' && assignment.status !== 'active') {
        return res.status(409).json({ 
          message: `Cannot check into an assignment with status: ${assignment.status}` 
        });
      }
      
      // Perform check-in
      const updatedAssignment = await storage.checkInObserver(assignmentId);
      
      // Get station info
      const station = await storage.getPollingStation(updatedAssignment.stationId);
      
      res.status(200).json({
        ...updatedAssignment,
        station
      });
    } catch (error) {
      console.error('Error checking in:', error);
      res.status(500).json({ message: 'An error occurred while checking in' });
    }
  });
  
  app.post('/api/assignments/:id/check-out', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      const assignmentId = parseInt(req.params.id);
      
      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: 'Invalid assignment ID' });
      }
      
      // Get the current assignment
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      // Check permissions - only allow users to check out of their own assignments
      // unless they're an admin
      if (assignment.userId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to check out of this assignment' });
      }
      
      // Check that the assignment is active and can be checked out
      if (assignment.status !== 'active') {
        return res.status(409).json({ 
          message: `Cannot check out of an assignment with status: ${assignment.status}` 
        });
      }
      
      // Perform check-out
      const updatedAssignment = await storage.checkOutObserver(assignmentId);
      
      // Get station info
      const station = await storage.getPollingStation(updatedAssignment.stationId);
      
      res.status(200).json({
        ...updatedAssignment,
        station
      });
    } catch (error) {
      console.error('Error checking out:', error);
      res.status(500).json({ message: 'An error occurred while checking out' });
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
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const reports = await storage.getReportsByUserId(userId);
      
      // Get station information for each report with error handling
      const reportsWithStations = await Promise.all(
        reports.map(async (report) => {
          try {
            // Make sure stationId is defined
            if (report.stationId) {
              const station = await storage.getPollingStation(report.stationId);
              return {
                ...report,
                station: station || { name: "Unknown Station" }
              };
            } else {
              // Handle case where stationId is undefined
              return {
                ...report,
                station: { name: "Unknown Station" }
              };
            }
          } catch (err) {
            console.error('Error getting station for report:', err);
            // Return the report with a placeholder station on error
            return {
              ...report,
              station: { name: "Error Loading Station" }
            };
          }
        })
      );
      
      res.status(200).json(reportsWithStations);
    } catch (error) {
      console.error('Error fetching reports:', error);
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
  
  // Form Template Management Routes
  
  // Middleware to check admin role
  const requireAdmin = (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (req.session.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }
    next();
  };
  
  // Get all form templates
  app.get('/api/form-templates', requireAuth, async (req, res) => {
    try {
      const templates = await storage.getAllFormTemplates();
      res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching form templates:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get active form templates
  app.get('/api/form-templates/active', requireAuth, async (req, res) => {
    try {
      const templates = await storage.getActiveFormTemplates();
      res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching active form templates:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get form templates by category
  app.get('/api/form-templates/category/:category', requireAuth, async (req, res) => {
    try {
      const { category } = req.params;
      const templates = await storage.getFormTemplatesByCategory(category);
      res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching form templates by category:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get form template by ID
  app.get('/api/form-templates/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getFormTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      res.status(200).json(template);
    } catch (error) {
      console.error('Error fetching form template:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Create form template (admin only)
  app.post('/api/form-templates', requireAdmin, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // Parse and validate extended template
      const extendedTemplate = formTemplateExtendedSchema.parse(req.body);
      
      // Convert from extended template format to fields JSON
      const fields = {
        sections: extendedTemplate.sections.map(section => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: section.order,
          fields: section.fields
        }))
      };
      
      // Create template in storage
      const template = await storage.createFormTemplate({
        name: extendedTemplate.name,
        description: extendedTemplate.description || null,
        category: extendedTemplate.category,
        fields: fields,
        createdBy: userId
      });
      
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('Error creating form template:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Update form template (admin only)
  app.put('/api/form-templates/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      // Check if template exists
      const existingTemplate = await storage.getFormTemplate(id);
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Parse and validate extended template
      const extendedTemplate = formTemplateExtendedSchema.parse(req.body);
      
      // Convert from extended template format to fields JSON
      const fields = {
        sections: extendedTemplate.sections.map(section => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: section.order,
          fields: section.fields
        }))
      };
      
      // Update template in storage
      const template = await storage.updateFormTemplate(id, {
        name: extendedTemplate.name,
        description: extendedTemplate.description || null,
        category: extendedTemplate.category,
        fields: fields,
        updatedAt: new Date()
      });
      
      res.status(200).json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('Error updating form template:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Activate/deactivate form template (admin only)
  app.patch('/api/form-templates/:id/status', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      // Validate request body
      const { isActive } = z.object({
        isActive: z.boolean()
      }).parse(req.body);
      
      // Check if template exists
      const existingTemplate = await storage.getFormTemplate(id);
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Update template status
      const template = await storage.updateFormTemplate(id, {
        isActive,
        updatedAt: new Date()
      });
      
      res.status(200).json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('Error updating form template status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Delete form template (admin only)
  app.delete('/api/form-templates/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      // Check if template exists
      const existingTemplate = await storage.getFormTemplate(id);
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Delete template
      const success = await storage.deleteFormTemplate(id);
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete form template' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting form template:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  return httpServer;
}
