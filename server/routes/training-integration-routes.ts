import { Router } from 'express';
import { db } from '../db';
import { trainingIntegrations, trainingProgress, externalUserMappings } from '../../shared/schema';
import { createTrainingIntegrationService } from '../services/training-integration-service';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Middleware to validate if user is an admin
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required' });
  }
  next();
};

// Get all training integrations (admin only)
router.get('/integrations', isAdmin, async (req, res) => {
  try {
    const integrationsList = await db.select().from(trainingIntegrations);
    
    // Remove sensitive information like auth tokens for client response
    const sanitizedIntegrations = integrationsList.map(integration => {
      const systems = integration.systems as any[];
      const sanitizedSystems = systems.map(system => ({
        ...system,
        authToken: system.authToken ? '********' : undefined,
        clientSecret: system.clientSecret ? '********' : undefined,
        password: system.password ? '********' : undefined,
      }));
      
      return {
        ...integration,
        systems: sanitizedSystems
      };
    });
    
    res.json(sanitizedIntegrations);
  } catch (error) {
    console.error('Error fetching training integrations:', error);
    res.status(500).json({ message: 'Error fetching training integrations' });
  }
});

// Get a specific training integration by ID (admin only)
router.get('/integrations/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [integration] = await db.select().from(trainingIntegrations).where(eq(trainingIntegrations.id, parseInt(id)));
    
    if (!integration) {
      return res.status(404).json({ message: 'Training integration not found' });
    }
    
    // Remove sensitive information for client response
    const systems = integration.systems as any[];
    const sanitizedSystems = systems.map(system => ({
      ...system,
      authToken: system.authToken ? '********' : undefined,
      clientSecret: system.clientSecret ? '********' : undefined,
      password: system.password ? '********' : undefined,
    }));
    
    res.json({
      ...integration,
      systems: sanitizedSystems
    });
  } catch (error) {
    console.error(`Error fetching training integration with ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error fetching training integration' });
  }
});

// Create a new training integration (admin only)
router.post('/integrations', isAdmin, async (req, res) => {
  try {
    const integrationSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
      systems: z.array(z.object({
        type: z.enum(['moodle', 'zoom']),
        baseUrl: z.string().url('Valid URL required'),
        requiresAuth: z.boolean().default(true),
        authToken: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        clientId: z.string().optional(),
        clientSecret: z.string().optional(),
        redirectUri: z.string().optional(),
        verifySSL: z.boolean().default(true),
      })),
      syncSchedule: z.string().optional(),
      settings: z.record(z.any()).optional(),
    });
    
    const validatedData = integrationSchema.parse(req.body);
    
    const [createdIntegration] = await db.insert(trainingIntegrations)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        isActive: validatedData.isActive,
        systems: validatedData.systems,
        syncSchedule: validatedData.syncSchedule,
        settings: validatedData.settings,
      })
      .returning();
    
    // Remove sensitive information for client response
    const systems = createdIntegration.systems as any[];
    const sanitizedSystems = systems.map(system => ({
      ...system,
      authToken: system.authToken ? '********' : undefined,
      clientSecret: system.clientSecret ? '********' : undefined,
      password: system.password ? '********' : undefined,
    }));
    
    res.status(201).json({
      ...createdIntegration,
      systems: sanitizedSystems
    });
  } catch (error) {
    console.error('Error creating training integration:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid integration data', errors: error.errors });
    }
    
    res.status(500).json({ message: 'Error creating training integration' });
  }
});

// Update a training integration (admin only)
router.put('/integrations/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if the integration exists
    const [existingIntegration] = await db.select().from(trainingIntegrations).where(eq(trainingIntegrations.id, parseInt(id)));
    
    if (!existingIntegration) {
      return res.status(404).json({ message: 'Training integration not found' });
    }
    
    const integrationSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      isActive: z.boolean(),
      systems: z.array(z.object({
        type: z.enum(['moodle', 'zoom']),
        baseUrl: z.string().url('Valid URL required'),
        requiresAuth: z.boolean(),
        authToken: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        clientId: z.string().optional(),
        clientSecret: z.string().optional(),
        redirectUri: z.string().optional(),
        verifySSL: z.boolean(),
      })),
      syncSchedule: z.string().optional(),
      settings: z.record(z.any()).optional(),
    });
    
    const validatedData = integrationSchema.parse(req.body);
    
    // Update the integration
    const [updatedIntegration] = await db.update(trainingIntegrations)
      .set({
        name: validatedData.name,
        description: validatedData.description,
        isActive: validatedData.isActive,
        systems: validatedData.systems,
        syncSchedule: validatedData.syncSchedule,
        settings: validatedData.settings,
        updatedAt: new Date(),
      })
      .where(eq(trainingIntegrations.id, parseInt(id)))
      .returning();
    
    // Remove sensitive information for client response
    const systems = updatedIntegration.systems as any[];
    const sanitizedSystems = systems.map(system => ({
      ...system,
      authToken: system.authToken ? '********' : undefined,
      clientSecret: system.clientSecret ? '********' : undefined,
      password: system.password ? '********' : undefined,
    }));
    
    res.json({
      ...updatedIntegration,
      systems: sanitizedSystems
    });
  } catch (error) {
    console.error(`Error updating training integration with ID ${req.params.id}:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid integration data', errors: error.errors });
    }
    
    res.status(500).json({ message: 'Error updating training integration' });
  }
});

// Delete a training integration (admin only)
router.delete('/integrations/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the integration exists
    const [existingIntegration] = await db.select().from(trainingIntegrations).where(eq(trainingIntegrations.id, parseInt(id)));
    
    if (!existingIntegration) {
      return res.status(404).json({ message: 'Training integration not found' });
    }
    
    // Delete the integration
    await db.delete(trainingIntegrations).where(eq(trainingIntegrations.id, parseInt(id)));
    
    res.json({ message: 'Training integration deleted successfully' });
  } catch (error) {
    console.error(`Error deleting training integration with ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error deleting training integration' });
  }
});

// Get all available content for the current user
router.get('/content', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    
    // Get all active integrations
    const integrationsList = await db.select().from(trainingIntegrations).where(eq(trainingIntegrations.isActive, true));
    
    if (integrationsList.length === 0) {
      return res.json([]);
    }
    
    // Use the first active integration
    const integration = integrationsList[0];
    
    // Create the integration service
    const integrationService = createTrainingIntegrationService(integration);
    
    // Get training content for the user
    const content = await integrationService.getAllTrainingContent(userId);
    
    res.json(content);
  } catch (error) {
    console.error('Error fetching training content:', error);
    res.status(500).json({ message: 'Error fetching training content' });
  }
});

// Get a specific content item
router.get('/content/:id', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    // Get all active integrations
    const integrationsList = await db.select().from(trainingIntegrations).where(eq(trainingIntegrations.isActive, true));
    
    if (integrationsList.length === 0) {
      return res.status(404).json({ message: 'Training content not found' });
    }
    
    // Use the first active integration
    const integration = integrationsList[0];
    
    // Create the integration service
    const integrationService = createTrainingIntegrationService(integration);
    
    // Get the specific content
    const content = await integrationService.getTrainingContent(id);
    
    if (!content) {
      return res.status(404).json({ message: 'Training content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error(`Error fetching training content with ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error fetching training content' });
  }
});

// Get upcoming training sessions for the user
router.get('/upcoming', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    
    // Get all active integrations
    const integrationsList = await db.select().from(trainingIntegrations).where(eq(trainingIntegrations.isActive, true));
    
    if (integrationsList.length === 0) {
      return res.json([]);
    }
    
    // Use the first active integration
    const integration = integrationsList[0];
    
    // Create the integration service
    const integrationService = createTrainingIntegrationService(integration);
    
    // Get upcoming training sessions
    const sessions = await integrationService.getUpcomingTrainingSessions(userId);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching upcoming training sessions:', error);
    res.status(500).json({ message: 'Error fetching upcoming training sessions' });
  }
});

// Get user's training progress
router.get('/progress', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    
    // Get all active integrations
    const integrationsList = await db.select().from(trainingIntegrations).where(eq(trainingIntegrations.isActive, true));
    
    if (integrationsList.length === 0) {
      return res.json({
        totalContent: 0,
        completedContent: 0,
        progressPercentage: 0,
        bySource: {}
      });
    }
    
    // Use the first active integration
    const integration = integrationsList[0];
    
    // Create the integration service
    const integrationService = createTrainingIntegrationService(integration);
    
    // Get user's training progress
    const progress = await integrationService.getUserProgress(userId);
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching training progress:', error);
    res.status(500).json({ message: 'Error fetching training progress' });
  }
});

// Register for training
router.post('/register', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    
    const registerSchema = z.object({
      contentId: z.string(),
    });
    
    const { contentId } = registerSchema.parse(req.body);
    
    // Get all active integrations
    const integrationsList = await db.select().from(trainingIntegrations).where(eq(trainingIntegrations.isActive, true));
    
    if (integrationsList.length === 0) {
      return res.status(404).json({ message: 'Training integration not found' });
    }
    
    // Use the first active integration
    const integration = integrationsList[0];
    
    // Create the integration service
    const integrationService = createTrainingIntegrationService(integration);
    
    // Register the user for the training
    const success = await integrationService.registerUserForTraining(userId, contentId);
    
    if (success) {
      res.json({ message: 'Registration successful' });
    } else {
      res.status(400).json({ message: 'Registration failed' });
    }
  } catch (error) {
    console.error('Error registering for training:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid registration data', errors: error.errors });
    }
    
    res.status(500).json({ message: 'Error registering for training' });
  }
});

// Test connection to a training system
router.post('/test-connection', isAdmin, async (req, res) => {
  try {
    const connectionSchema = z.object({
      type: z.enum(['moodle', 'zoom']),
      baseUrl: z.string().url('Valid URL required'),
      authToken: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    });
    
    const connectionData = connectionSchema.parse(req.body);
    
    // Test based on type
    if (connectionData.type === 'moodle') {
      if (!connectionData.authToken) {
        return res.status(400).json({ message: 'Auth token is required for Moodle connection' });
      }
      
      // Create a temporary Moodle service to test
      const { createMoodleService } = require('../services/moodle-service');
      const moodleService = createMoodleService(connectionData.baseUrl, connectionData.authToken);
      
      // Try to get site info
      const siteInfo = await moodleService.getSiteInfo();
      
      res.json({
        success: true,
        message: 'Successfully connected to Moodle',
        siteInfo
      });
      
    } else if (connectionData.type === 'zoom') {
      if (!connectionData.clientId || !connectionData.clientSecret) {
        return res.status(400).json({ message: 'Client ID and Secret are required for Zoom connection' });
      }
      
      // Create a temporary Zoom service to test
      const { createZoomService } = require('../services/zoom-service');
      const zoomService = createZoomService(connectionData.clientId, connectionData.clientSecret);
      
      // Try to get access token
      await zoomService.ensureValidToken();
      
      // Try to get current user
      const currentUser = await zoomService.getCurrentUser();
      
      res.json({
        success: true,
        message: 'Successfully connected to Zoom',
        user: currentUser
      });
    }
    
  } catch (error) {
    console.error('Error testing training system connection:', error);
    res.status(500).json({ 
      success: false,
      message: 'Connection test failed', 
      error: error.message 
    });
  }
});

export default router;