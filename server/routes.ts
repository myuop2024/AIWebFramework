import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage, IStorage } from "./storage";
import { randomBytes } from "crypto";
import { CommunicationService } from "./services/communication-service";
import { 
  loginUserSchema, 
  insertUserSchema, 
  insertUserProfileSchema, 
  insertDocumentSchema, 
  insertReportSchema,
  insertFormTemplateSchema,
  formTemplateExtendedSchema
} from "@shared/schema";
import { ensureAuthenticated, ensureAdmin } from './middleware/auth';
// Using traditional authentication
import trainingIntegrationRoutes from './routes/training-integration-routes';
import registrationFormRoutes from './routes/registration-forms';
import userImportRoutes from './routes/user-imports';
import analyticsRoutes from './routes/analytics';
import adminAnalyticsRoutes from './routes/admin-analytics';
import adminUserRoutes from './routes/admin-users';
import adminSystemRoutes from './routes/admin-system';
import adminRolesRoutes from './routes/admin-roles';
import idCardRoutes from './routes/id-cards';
import imageProcessingRoutes from './routes/image-processing';
import diditVerificationRoutes from './routes/didit-verification';
import communicationRoutes, { setCommunicationService } from './routes/communication-routes';
import pollingStationsRoutes from './routes/polling-stations';
import reportAttachmentsRoutes from './routes/report-attachments';
import quickReportsRoutes from './routes/quick-reports';
import newsEnhancedPredictionsRoutes from './routes/news-enhanced-predictions';
import { encryptSensitiveFields, decryptProfileFields } from './services/encryption-service';
import permissionRoutes from './routes/permission-routes';
import supervisorRoutes from './routes/supervisor-routes';
import errorLogRoutes from './routes/error-logs';
import adminErrorLogRoutes from './routes/admin-error-logs';
import projectManagementRoutes from './routes/project-management-routes';
import regionsRoutes from './routes/regions-routes';
import { diditConnector } from './services/didit-connector';
import logger from './utils/logger';
import { ErrorLogger } from './services/error-logger';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Import the DatabaseStorage class if it exists
let DatabaseStorage: any;
try {
  // Dynamic import to avoid circular dependencies
  DatabaseStorage = require('./database-storage').DatabaseStorage;
} catch (error) {
  // If DatabaseStorage doesn't exist, create a placeholder
  DatabaseStorage = class {};
}
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createHash } from "crypto";

// Communication interfaces removed - will be reimplemented in a new way

// Helper function to generate a unique observer ID
function generateObserverId(): string {
  return `OBS-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // API endpoint to get authenticated user data
  // Traditional authentication routes
  app.post('/api/login', async (req, res) => {
    try {
      logger.info(`Login attempt for user`, { ip: req.ip });
      const result = loginUserSchema.safeParse(req.body);
      if (!result.success) {
        logger.warn('Invalid login data', { errors: result.error.format() });
        return res.status(400).json({ message: 'Invalid login data', errors: result.error.format() });
      }
      
      const { username, password } = result.data;
      logger.info(`Looking up user by username: ${username}`);
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        logger.warn(`Login failed: User not found - ${username}`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      logger.info(`User found, verifying password for: ${username}`);
      // Verify password using SHA-256 (matching how passwords are stored)
      const hashedPassword = createHash('sha256').update(password).digest('hex');
      
      if (user.password !== hashedPassword) {
        logger.warn(`Login failed: Invalid password for user: ${username}`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      logger.info(`Password verified for user: ${username}`);
      // Log user object for debugging (excluding password)
      const userForDebug = {...user};
      delete userForDebug.password;
      logger.debug('User object for login:', userForDebug);
      
      // Store user in session
      req.login(user, (err) => {
        if (err) {
          logger.error('Error during login/session creation', { error: err.message, stack: err.stack });
          return res.status(500).json({ message: 'Error during login', details: err.message });
        }
        
        // Remove sensitive data before sending user object
        const safeUser = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          observerId: user.observerId,
          role: user.role,
          profileImageUrl: user.profileImageUrl
        };
        
        logger.info(`Login successful for user: ${username}`);
        return res.status(200).json(safeUser);
      });
    } catch (error) {
      logger.error('Login error:', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : 'No stack trace' });
      res.status(500).json({ message: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  
  app.post('/api/logout', (req, res) => {
    req.logout(function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error during logout' });
      }
      res.status(200).json({ message: 'Logout successful' });
    });
  });
  
  app.post('/api/register', async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid registration data', errors: result.error.format() });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      
      // Check if email already exists (if provided)
      if (result.data.email) {
        const existingEmail = await storage.getUserByEmail(result.data.email);
        if (existingEmail) {
          return res.status(409).json({ message: 'Email already exists' });
        }
      }
      
      // Hash password
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(result.data.password, saltRounds);
      
      // Create new user with hashed password
      const userData = {
        ...result.data,
        password: hashedPassword,
        role: 'observer', // Default role for new registrations
        observerId: generateObserverId(), // Generate a unique observer ID
      };
      
      const newUser = await storage.createUser(userData);
      
      // Auto-login the new user
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error during login after registration' });
        }
        
        // Return user data without sensitive fields
        const safeUser = {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
          observerId: newUser.observerId,
          role: newUser.role,
          profileImageUrl: newUser.profileImageUrl
        };
        
        return res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/user', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Invalid user session' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove any sensitive data
      const safeUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        observerId: user.observerId,
        role: user.role,
        profileImageUrl: user.profileImageUrl
      };
      
      res.status(200).json(safeUser);
    } catch (error) {
      console.error('Error fetching authenticated user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Setup static file serving for uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
  console.log(`Serving static files from: ${uploadsDir}`);

  // Initialize the communication service
  const communicationService = new CommunicationService(httpServer);
  setCommunicationService(communicationService);
  app.use('/api/communications', communicationRoutes);
  console.log('Communication service initialized with WebSocket support');

  // User metadata route for device binding UI (limited information)
  app.get('/api/users/metadata', async (req, res) => {
    try {
      const { username } = req.query;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: 'Username is required' });
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return limited info for security purposes
      res.status(200).json({
        observerId: user.observerId,
        email: user.email
      });
    } catch (error) {
      console.error('Error fetching user metadata:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // QR code data endpoint for observer verification
  app.get('/api/users/qrcode', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - No user ID in session' });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }

      // Return observer ID for QR code generation
      res.status(200).json({
        observerId: user.observerId,
        userId: user.id,
        username: user.username
      });
    } catch (error) {
      console.error('Error fetching QR code data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Device reset request route
  app.post('/api/auth/device-reset-request', async (req, res) => {
    try {
      const { username, email } = req.body;

      if (!username) {
        return res.status(400).json({ message: 'Username is required' });
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        // For security, don't reveal if user exists or not
        return res.status(200).json({ message: 'If the account exists, a reset request has been submitted' });
      }

      // Verify email matches
      if (email && user.email !== email) {
        // For security, don't reveal the mismatch
        return res.status(200).json({ message: 'If the account exists, a reset request has been submitted' });
      }

      // In a real implementation, send email to admin or user
      // For now, just log the request and clear the device ID
      console.log(`Device reset requested for user: ${username}, observer ID: ${user.observerId}`);

      // Clear the device ID binding to allow login from a new device
      // In a production app, this might require admin approval
      await storage.updateUser(user.id, { deviceId: null });

      // Return success
      res.status(200).json({ message: 'Device reset request has been submitted' });
    } catch (error) {
      console.error('Error processing device reset request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
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

      // Create user with hashed password and device ID (if provided)
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        // Device ID is now passed from the client for binding
        deviceId: userData.deviceId || null
      });

      // Set session data with explicit type safety
      req.session.userId = user.id;
      req.session.observerId = user.observerId;
      req.session.role = user.role;

      logger.info('Registration successful, setting session data', {
        userId: user.id,
        observerId: user.observerId,
        role: user.role,
        sessionID: req.sessionID,
        path: req.path
      });

      // Save session explicitly to ensure it's persisted
      req.session.save((err) => {
        if (err) {
          logger.error('Failed to save session during registration', err, {
            userId: user.id,
            sessionID: req.sessionID
          });
          return res.status(500).json({ 
            message: 'Session error. Please try again.',
            details: 'Failed to save authentication state' 
          });
        }

        logger.info(`Registration successful, session saved for user ${user.username}`, {
          userId: user.id,
          sessionID: req.sessionID
        });

        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Unified login endpoint with device binding and bcrypt password check
  app.post('/api/auth/login', async (req, res) => {
    try {
      logger.info('Login attempt received', { ip: req.ip });
      // Validate login data
      const result = loginUserSchema.safeParse(req.body);
      if (!result.success) {
        logger.warn('Invalid login data', { errors: result.error.format() });
        return res.status(400).json({ message: 'Invalid login data', errors: result.error.format() });
      }
      const { username, password, deviceId } = result.data;
      logger.info(`Looking up user by username: ${username}`);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        logger.warn(`Login failed: User not found: ${username}`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      // Use bcrypt for password comparison
      const bcrypt = require('bcrypt');
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        logger.warn(`Login failed: Invalid password for user: ${username}`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      // Device binding security check
      if (user.deviceId && deviceId && user.deviceId !== deviceId) {
        logger.warn(`Device mismatch for user ${username}: Expected: ${user.deviceId}, Received: ${deviceId}`);
        return res.status(401).json({ 
          message: 'Authentication failed. This account may be locked to another device.',
          errorCode: 'DEVICE_MISMATCH'
        });
      }
      if (!user.deviceId && deviceId) {
        await storage.updateUser(user.id, { deviceId });
        user.deviceId = deviceId;
        logger.info(`Device ID set for user ${username}: ${deviceId}`);
      }
      req.session.userId = user.id;
      req.session.observerId = user.observerId;
      req.session.role = user.role;
      logger.info('Login attempt successful, setting session data', {
        userId: user.id,
        observerId: user.observerId,
        role: user.role,
        sessionID: req.sessionID,
        path: req.path
      });
      req.session.save((err) => {
        if (err) {
          logger.error('Failed to save session during login', err, {
            userId: user.id,
            sessionID: req.sessionID
          });
          return res.status(500).json({ 
            message: 'Session error. Please try again.',
            details: 'Failed to save authentication state' 
          });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      logger.error('Login error:', error instanceof Error ? error : new Error('Unknown error'), {
        sessionID: req.sessionID
      });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
  
  // Current user endpoint for client authentication
  app.get('/api/user', async (req, res) => {
    try {
      // If no session or userId, return 401 (client will handle this as "not logged in")
      if (!req.session || !req.session.userId) {
        logger.debug('GET /api/user: No authenticated user', {
          sessionExists: !!req.session,
          sessionID: req.sessionID
        });
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get the user information
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        logger.warn(`GET /api/user: User not found with ID ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      logger.error('Error in GET /api/user:', error instanceof Error ? error : new Error('Unknown error'), {
        sessionID: req.sessionID
      });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Password change endpoint
  app.post('/api/user/change-password', async (req, res) => {
    try {
      // If no session or userId, return 401 (client will handle this as "not logged in")
      if (!req.session || !req.session.userId) {
        logger.debug('POST /api/user/change-password: No authenticated user', {
          sessionExists: !!req.session,
          sessionID: req.sessionID
        });
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Import password utilities
      const { comparePasswords, hashPassword } = await import('./utils/password-utils');
      
      // Get user's current password hash from the database
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        logger.warn(`POST /api/user/change-password: User not found with ID ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password
      await storage.updateUser(userId, { password: hashedPassword });
      
      logger.info(`Password changed successfully for user ${userId}`);
      return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      logger.error('Error in POST /api/user/change-password:', error instanceof Error ? error : new Error('Unknown error'), {
        sessionID: req.sessionID
      });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Two-factor authentication routes
  
  // Setup 2FA - generates a secret and QR code
  app.post('/api/user/2fa/setup', async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Import 2FA utilities
      const { generateSecret, generateOtpAuthUrl, generateQRCode } = await import('./utils/two-factor-auth');
      
      // Generate new secret
      const secret = generateSecret();
      
      // Generate OTP auth URL
      const otpAuthUrl = generateOtpAuthUrl(user.username, secret);
      
      // Generate QR code
      const qrCodeUrl = await generateQRCode(otpAuthUrl);
      
      // Store the secret temporarily (not enabling it yet)
      await storage.updateUser(userId, { 
        twoFactorSecret: secret,
        twoFactorEnabled: false,
        twoFactorVerified: false
      });
      
      // Generate recovery codes (10 alphanumeric codes)
      const recoveryCodes = Array.from({ length: 10 }, () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase() + 
               Math.random().toString(36).substring(2, 8).toUpperCase();
      });
      
      // Store recovery codes
      await storage.updateUser(userId, { recoveryCodes: JSON.stringify(recoveryCodes) });
      
      res.status(200).json({
        secret,
        qrCode: qrCodeUrl,
        recoveryCodes
      });
    } catch (error) {
      logger.error('Error in POST /api/user/2fa/setup:', error instanceof Error ? error : new Error('Unknown error'), {
        sessionID: req.sessionID
      });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Verify and enable 2FA
  app.post('/api/user/2fa/verify', async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: 'Missing verification token' });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || !user.twoFactorSecret) {
        return res.status(404).json({ message: 'User or 2FA setup not found' });
      }
      
      // Import 2FA utilities
      const { verifyToken } = await import('./utils/two-factor-auth');
      
      // Verify the token against the stored secret
      const isValid = verifyToken(token, user.twoFactorSecret);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid verification token' });
      }
      
      // Enable 2FA now that it's verified
      await storage.updateUser(userId, { 
        twoFactorEnabled: true,
        twoFactorVerified: true
      });
      
      res.status(200).json({ 
        message: 'Two-factor authentication enabled successfully',
        enabled: true
      });
    } catch (error) {
      logger.error('Error in POST /api/user/2fa/verify:', error instanceof Error ? error : new Error('Unknown error'), {
        sessionID: req.sessionID
      });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Disable 2FA
  app.post('/api/user/2fa/disable', async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Import password utilities
      const { comparePasswords } = await import('./utils/password-utils');
      
      // Verify current password for security
      const isPasswordValid = await comparePasswords(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Disable 2FA
      await storage.updateUser(userId, { 
        twoFactorEnabled: false,
        twoFactorVerified: false,
        twoFactorSecret: null,
        recoveryCodes: null
      });
      
      res.status(200).json({ 
        message: 'Two-factor authentication disabled successfully',
        enabled: false
      });
    } catch (error) {
      logger.error('Error in POST /api/user/2fa/disable:', error instanceof Error ? error : new Error('Unknown error'), {
        sessionID: req.sessionID
      });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Note: Using standardized middleware from auth.ts

  // Current user endpoint for the auth system
  app.get('/api/user', async (req, res) => {
    try {
      // Check if user is authenticated via session
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // User profile routes
  app.get('/api/users/profile', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const userRole = req.session.role as string;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - No user ID in session' });
      }

      console.log(`Fetching profile for user ID: ${userId}`);

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }

      // Get profile
      const profile = await storage.getUserProfile(userId);
      console.log(`Profile retrieved: ${profile ? 'Yes' : 'No'}`);

      // Get documents
      const documents = await storage.getDocumentsByUserId(userId);
      console.log(`Documents retrieved: ${documents.length}`);

      // Remove sensitive data
      const { password, ...userWithoutPassword } = user;

      // Decrypt profile data if the user has permission (admin/director roles)
      const decryptedProfile = decryptProfileFields(profile, userRole);

      res.status(200).json({
        user: userWithoutPassword,
        profile: decryptedProfile, // Ensure null instead of undefined if no profile
        documents: documents || []
      });
    } catch (error) {
      console.error('Error in /api/users/profile:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

app.post('/api/users/profile', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number; // Type assertion (already verified in ensureAuthenticated)
      const userRole = req.session.role as string;
      console.log(`Creating/updating profile for user ID: ${userId}`);

      try {
        // Parse the incoming data with Zod schema
        const rawProfileData = insertUserProfileSchema.parse({
          ...req.body,
          userId
        });

        // Encrypt sensitive fields like ID number and bank account
        const profileData = encryptSensitiveFields(rawProfileData);

        // Check if profile exists
        const existingProfile = await storage.getUserProfile(userId);
        console.log(`Existing profile found: ${existingProfile ? 'Yes' : 'No'}`);

        let profile;
        if (existingProfile) {
          profile = await storage.updateUserProfile(userId, profileData);
          console.log(`Profile updated for user ${userId}`);
        } else {
          profile = await storage.createUserProfile({
            ...profileData,
            userId
          });
          console.log(`Profile created for user ${userId}`);
        }

        // Update user verification status
        await storage.updateUser(userId, { verificationStatus: 'in-progress' });
        console.log(`User verification status updated for ${userId}`);

        // Return decrypted data to authorized users, otherwise return as-is
        const responseProfile = profile ? decryptProfileFields(profile, userRole) : null;
        res.status(200).json(responseProfile);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          console.error('Validation error in profile data:', validationError);
          return res.status(400).json({ 
            message: fromZodError(validationError).message,
            errors: validationError.errors
          });
        }
        throw validationError; // Re-throw if not a ZodError
      }
    } catch (error) {
      console.error('Error in /api/users/profile (POST):', error);
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Document routes
  app.post('/api/documents', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number; // Type assertion (verified in middleware)

      try {
        const documentData = insertDocumentSchema.parse(req.body);

        const document = await storage.createDocument({
          ...documentData,
          userId
        });

        console.log(`Document created: ID ${document.id} for user ${userId}`);
        res.status(201).json(document);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          console.error('Document data validation error:', validationError);
          return res.status(400).json({ 
            message: fromZodError(validationError).message,
            errors: validationError.errors 
          });
        }
        throw validationError; // Re-throw if not ZodError
      }
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({ 
        message: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/documents', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number; // Type assertion (verified in middleware)
      console.log(`Fetching documents for user ${userId}`);

      const documents = await storage.getDocumentsByUserId(userId);
      console.log(`Found ${documents.length} documents for user ${userId}`);

      res.status(200).json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Polling station routes are now handled by pollingStationsRoutes

  app.get('/api/users/assignments', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      console.log(`Fetching assignments for user ${userId}`);

      const assignments = await storage.getAssignmentsByUserId(userId);
      console.log(`Found ${assignments.length} assignments for user ${userId}`);

      // Get full station data
      const assignmentsWithStations = await Promise.all(
        assignments.map(async (assignment) => {
          const station = await storage.getPollingStation(assignment.stationId);
          return {
            ...assignment,
            station: station || null  // Ensure null instead of undefined
          };
        })
      );

      res.status(200).json(assignmentsWithStations);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/users/assignments/active', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      console.log(`Fetching active assignments for user ${userId}`);

      const assignments = await storage.getActiveAssignments(userId);
      console.log(`Found ${assignments.length} active assignments for user ${userId}`);

      // Get full station data
      const assignmentsWithStations = await Promise.all(
        assignments.map(async (assignment) => {
          const station = await storage.getPollingStation(assignment.stationId);
          return {
            ...assignment,
            station: station || null  // Ensure null instead of undefined
          };
        })
      );

      res.status(200).json(assignmentsWithStations);
    } catch (error) {
      console.error('Error fetching active assignments:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/stations/:stationId/assignments', ensureAuthenticated, async (req, res) => {
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

  app.get('/api/assignments/:id', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const role = req.session.role;
      const assignmentId = parseInt(req.params.id);

      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: 'Invalid assignment ID' });
      }

      console.log(`Fetching assignment ${assignmentId} for user ${userId} (role: ${role})`);

      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        console.warn(`Assignment ${assignmentId} not found`);
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // Security check - only allow users to view their own assignments 
      // unless they're an admin
      if (assignment.userId !== userId && role !== 'admin') {
        console.warn(`Unauthorized access to assignment ${assignmentId} by user ${userId}`);
        return res.status(403).json({ message: 'Not authorized to access this assignment' });
      }

      // Get station info
      const station = await storage.getPollingStation(assignment.stationId);

      res.status(200).json({
        ...assignment,
        station: station || null // Ensure null instead of undefined
      });
    } catch (error) {
      console.error('Error fetching assignment:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/assignments', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const role = req.session.role;

      console.log(`Creating assignment by user ${userId} (role: ${role})`);

      // Basic validation
      if (!req.body.stationId || !req.body.startDate || !req.body.endDate) {
        console.warn('Assignment creation missing required fields');
        return res.status(400).json({ 
          message: 'Missing required fields: stationId, startDate, and endDate are required' 
        });
      }

      // Parse dates
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('Invalid date format in assignment creation');
        return res.status(400).json({ message: 'Invalid date format' });
      }

      if (startDate >= endDate) {
        console.warn('End date not after start date in assignment creation');
        return res.status(400).json({ message: 'End date must be after start date' });
      }

      // Only allow admins to assign other users
      const assignUserId = role === 'admin' && req.body.userId 
        ? parseInt(req.body.userId) 
        : userId;

      console.log(`Assignment will be created for user ${assignUserId}`);

      // Create assignment with parsed dates
      const assignment = await storage.createAssignment({
        ...req.body,
        userId: assignUserId,
        startDate,
        endDate
      });

      console.log(`Assignment created: ID ${assignment.id}`);

      // Get station info
      const station = await storage.getPollingStation(assignment.stationId);

      res.status(201).json({
        ...assignment,
        station: station || null // Ensure null instead of undefined
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
      res.status(500).json({ 
        message: 'An error occurred while creating the assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put('/api/assignments/:id', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.role;
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

      if (!updatedAssignment) {
        return res.status(404).json({ message: 'Assignment could not be updated' });
      }

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

  app.post('/api/assignments/:id/check-in', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.role;
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
      
      if (!updatedAssignment) {
        return res.status(404).json({ error: "Assignment not found or could not be updated" });
      }

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

  app.post('/api/assignments/:id/check-out', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.role;
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
      
      if (!updatedAssignment) {
        return res.status(404).json({ error: "Assignment not found or could not be updated" });
      }

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
  app.post('/api/reports', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - user ID not found in session' });
      }
      
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

  app.get('/api/reports', ensureAuthenticated, async (req, res) => {
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
  app.get('/api/events', ensureAuthenticated, async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/events/upcoming', ensureAuthenticated, async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Note: Using standardized middleware from auth.ts

  // System settings routes
  app.get('/api/system-settings', async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
      res.status(500).json({ message: 'Failed to fetch system settings' });
    }
  });

  app.get('/api/system-settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSystemSetting(key);

      if (!setting) {
        return res.status(404).json({ message: `Setting with key ${key} not found` });
      }

      res.json(setting);
    } catch (error) {
      console.error(`Failed to fetch system setting with key ${req.params.key}:`, error);
      res.status(500).json({ message: 'Failed to fetch system setting' });
    }
  });

  app.put('/api/system-settings/:key', ensureAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (!value) {
        return res.status(400).json({ message: 'Setting value is required' });
      }

      const existingSetting = await storage.getSystemSetting(key);
      if (!existingSetting) {
        return res.status(404).json({ message: `Setting with key ${key} not found` });
      }

      const userId = req.session.userId;
      const updatedSetting = await storage.updateSystemSetting(key, value, userId);

      res.json(updatedSetting);
    } catch (error) {
      console.error(`Failed to update system setting with key ${req.params.key}:`, error);
      res.status(500).json({ message: 'Failed to update system setting' });
    }
  });

  app.post('/api/system-settings', ensureAdmin, async (req, res) => {
    try {
      const { settingKey, settingValue, description } = req.body;

      if (!settingKey || !settingValue) {
        return res.status(400).json({ message: 'Setting key and value are required' });
      }

      const existingSetting = await storage.getSystemSetting(settingKey);
      if (existingSetting) {
        return res.status(409).json({ message: `Setting with key ${settingKey} already exists` });
      }

      const userId = req.session.userId;

      const newSetting = await storage.createSystemSetting({
        settingKey,
        settingValue,
        description: description || null,
        updatedBy: userId
      });

      res.status(201).json(newSetting);
    } catch (error) {
      console.error('Failed to create system setting:', error);
      res.status(500).json({ message: 'Failed to create system setting' });
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
  app.get('/api/messages/:receiverId', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - user ID not found in session' });
      }
      
      const receiverId = parseInt(req.params.receiverId);
      if (isNaN(receiverId)) {
        return res.status(400).json({ message: 'Invalid receiver ID' });
      }

      const messages = await storage.getMessagesBetweenUsers(userId, receiverId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/messages/:receiverId/read/:messageId', ensureAuthenticated, async (req, res) => {
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
  app.get('/api/users/qrcode', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - user ID not found in session' });
      }
      
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

  // Verification settings endpoints
  app.get('/api/admin/settings/verification', ensureAdmin, async (req, res) => {
    try {
      // Get verification settings from the system settings table
      const setting = await storage.getSystemSetting('verification_settings');
      
      if (setting) {
        return res.json(setting.settingValue);
      } else {
        // Return default settings if not found
        const defaultSettings = {
          autoApproval: false,
          requireIdCard: true,
          requireAddress: true,
          requireProfilePhoto: true,
          requireIdentificationNumber: true,
          allowPhotoUpdates: true,
          verificationMessage: "Please upload your identification documents and complete your profile to verify your account.",
          minVerificationAge: 18,
        };
        return res.json(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching verification settings:', error);
      res.status(500).json({ message: 'Failed to fetch verification settings' });
    }
  });

  app.post('/api/admin/settings/verification', ensureAdmin, async (req, res) => {
    try {
      const { verificationSettingsSchema } = await import('@shared/schema');
      
      // Validate request body against the schema
      const settings = verificationSettingsSchema.parse(req.body);
      
      // Update or create the verification settings
      const updatedSetting = await storage.updateSystemSetting(
        'verification_settings',
        settings,
        req.session.userId as number
      );
      
      if (!updatedSetting) {
        // If update failed, create the setting
        await storage.createSystemSetting({
          settingKey: 'verification_settings',
          settingValue: settings,
          description: 'Verification requirements and process configuration',
          updatedBy: req.session.userId as number
        });
      }
      
      return res.status(200).json(settings);
    } catch (error: any) {
      console.error('Error updating verification settings:', error);
      if (error.errors) {
        return res.status(400).json({ message: 'Invalid verification settings', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update verification settings' });
    }
  });

  // Admin endpoints - get all users
  app.get('/api/admin/users', ensureAdmin, async (req, res) => {
    try {
      // Get all users from the database
      const allUsers = await storage.getAllUsers();

      // Map users to proper format
      const formattedUsers = allUsers.map(user => {
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          role: user.role || 'observer',
          observerId: user.observerId,
          phoneNumber: user.phoneNumber,
          verificationStatus: user.verificationStatus,
          trainingStatus: user.trainingStatus || 'not_started',
          createdAt: user.createdAt
        };
      });

      return res.json(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Endpoint for approving or rejecting user verification
  app.post('/api/admin/users/:userId/verify', ensureAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { verificationStatus } = req.body;

      if (!userId || !verificationStatus) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      if (verificationStatus !== 'verified' && verificationStatus !== 'rejected' && verificationStatus !== 'pending') {
        return res.status(400).json({ message: 'Invalid verification status' });
      }

      // Update the user's verification status
      const updatedUser = await storage.updateUser(userId, { verificationStatus });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user verification:', error);
      res.status(500).json({ message: 'Failed to update user verification' });
    }
  });

  // Pending profile photo approvals
  app.get('/api/admin/pending-photo-approvals', ensureAdmin, async (req, res) => {
    try {
      console.log('Fetching pending photo approvals');
      const pendingPhotos = await storage.getPendingPhotoApprovals();
      console.log('Found pending photos:', pendingPhotos);

      // Enhance with user information
      const pendingPhotosWithUserInfo = await Promise.all(
        pendingPhotos.map(async (photo) => {
          console.log('Processing photo approval:', photo);
          const user = await storage.getUser(photo.userId);
          console.log('Found user for photo:', user);

          return {
            id: photo.id,
            userId: photo.userId,
            photoUrl: photo.photoUrl,
            submittedAt: photo.createdAt ? photo.createdAt.toISOString() : new Date().toISOString(),
            username: user?.username || 'unknown',
            fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown User'
          };
        })
      );

      console.log('Returning enhanced photo approvals:', pendingPhotosWithUserInfo);
      res.status(200).json(pendingPhotosWithUserInfo);
    } catch (error) {
      console.error('Error fetching pending photo approvals:', error);
      res.status(500).json({ message: 'Failed to fetch pending photo approvals' });
    }
  });

  // Approve a pending profile photo
  app.post('/api/admin/pending-photo-approvals/:id/approve', ensureAdmin, async (req, res) => {
    try {
      const approvalId = parseInt(req.params.id);
      if (isNaN(approvalId)) {
        return res.status(400).json({ message: 'Invalid approval ID' });
      }

      // Get the pending approval
      const pendingApproval = await storage.getPhotoApproval(approvalId);
      if (!pendingApproval) {
        return res.status(404).json({ message: 'Pending approval not found' });
      }

      // Update the user's profile with the approved photo
      const userId = pendingApproval.userId;
      const photoUrl = pendingApproval.photoUrl;

      // Check if user has a profile
      const profile = await storage.getUserProfile(userId);

      if (profile) {
        // Update existing profile
        await storage.updateUserProfile(userId, {
          profilePhotoUrl: photoUrl
        });
      } else {
        // Create new profile
        await storage.createUserProfile({
          userId: userId,
          profilePhotoUrl: photoUrl
        });
      }

      // Mark the approval as completed using the dedicated approval method
      const adminId = req.session.userId;
      if (!adminId) {
        return res.status(401).json({ message: 'Unauthorized - admin ID not found in session' });
      }
      
      await storage.approvePhotoApproval(approvalId, adminId);

      res.status(200).json({ message: 'Photo approved successfully' });
    } catch (error) {
      console.error('Error approving profile photo:', error);
      res.status(500).json({ message: 'Failed to approve profile photo' });
    }
  });

  // Reject a pending profile photo
  app.post('/api/admin/pending-photo-approvals/:id/reject', ensureAdmin, async (req, res) => {
    try {
      const approvalId = parseInt(req.params.id);
      if (isNaN(approvalId)) {
        return res.status(400).json({ message: 'Invalid approval ID' });
      }

      // Get the pending approval
      const pendingApproval = await storage.getPhotoApproval(approvalId);
      if (!pendingApproval) {
        return res.status(404).json({ message: 'Pending approval not found' });
      }

      // Mark the approval as rejected using the dedicated rejection method
      const adminId = req.session.userId;
      if (!adminId) {
        return res.status(401).json({ message: 'Unauthorized - admin ID not found in session' });
      }
      
      await storage.rejectPhotoApproval(approvalId, adminId);

      res.status(200).json({ message: 'Photo rejected successfully' });
    } catch (error) {
      console.error('Error rejecting profile photo:', error);
      res.status(500).json({ message: 'Failed to reject profile photo' });
    }
  });

  // Observer verification queue
  app.get('/api/admin/verification-queue', ensureAdmin, async (req, res) => {
    try {
      // If using DatabaseStorage, we need to query the database differently
      if (storage instanceof DatabaseStorage) {
        // This would use methods defined in DatabaseStorage
        const users = await storage.getAllUsers();

        // Filter to only get observers
        const observers = await Promise.all(
          users
            .filter(user => user.role === 'observer')
            .map(async (user) => {
              // Get user profile data
              const profile = await storage.getUserProfile(user.id);

              return {
                id: user.id,
                observerId: user.observerId || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email,
                phoneNumber: user.phoneNumber,
                verificationStatus: user.verificationStatus || 'pending',
                submittedAt: (user.createdAt || new Date()).toISOString(),
                profileData: profile ? {
                  idPhotoUrl: profile.idPhotoUrl,
                  address: profile.address,
                  city: profile.city,
                  state: profile.state,
                  country: profile.country
                } : undefined
              };
            })
        );

        return res.status(200).json(observers);
      } else {
        // For any storage type, use the getAllUsers method
        const users = await storage.getAllUsers();

        // Filter to only get observers
        const allUsers = users
          .filter(user => user.role === 'observer') // Only include observers
          .map(async (user) => {
            // Get user profile data
            const profile = await storage.getUserProfile(user.id);

            return {
              id: user.id,
              observerId: user.observerId || '',
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email,
              phoneNumber: user.phoneNumber,
              verificationStatus: user.verificationStatus || 'pending',
              submittedAt: (user.createdAt || new Date()).toISOString(),
              profileData: profile ? {
                idPhotoUrl: profile.idPhotoUrl,
                address: profile.address,
                city: profile.city,
                state: profile.state,
                country: profile.country
              } : undefined
            };
          });

        const observers = await Promise.all(allUsers);
        res.status(200).json(observers);
      }
    } catch (error) {
      console.error('Error fetching verification queue:', error);
      res.status(500).json({ message: 'Failed to fetch verification queue' });
    }
  });

  // Approve observer verification
  app.post('/api/admin/verification/:id/approve', ensureAdmin, async (req, res) => {
    try {
      const observerId = parseInt(req.params.id);
      if (isNaN(observerId)) {
        return res.status(400).json({ message: 'Invalid observer ID' });
      }

      // Update user verification status
      const updatedUser = await storage.updateUser(observerId, {
        verificationStatus: 'approved'
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'Observer not found' });
      }

      res.status(200).json({
        message: 'Observer approved successfully',
        observer: {
          id: updatedUser.id,
          observerId: updatedUser.observerId,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          verificationStatus: updatedUser.verificationStatus
        }
      });
    } catch (error) {
      console.error('Error approving observer:', error);
      res.status(500).json({ message: 'Failed to approve observer' });
    }
  });

  // Reject observer verification
  app.post('/api/admin/verification/:id/reject', ensureAdmin, async (req, res) => {
    try {
      const observerId = parseInt(req.params.id);
      if (isNaN(observerId)) {
        return res.status(400).json({ message: 'Invalid observer ID' });
      }

      // Validate request body to ensure reason is provided
      const { reason } = z.object({
        reason: z.string().min(1, 'Rejection reason is required')
      }).parse(req.body);

      // Update user verification status
      const updatedUser = await storage.updateUser(observerId, {
        verificationStatus: 'rejected',
        // In a real system, you might want to store the reason in a separate table
        // For simplicity, we're not doing that here
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'Observer not found' });
      }

      res.status(200).json({
        message: 'Observer rejected successfully',
        observer: {
          id: updatedUser.id,
          observerId: updatedUser.observerId,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          verificationStatus: updatedUser.verificationStatus
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('Error rejecting observer:', error);
      res.status(500).json({ message: 'Failed to reject observer' });
    }
  });

  // Admin dashboard statistics
  app.get('/api/admin/system-stats', ensureAdmin, async (req, res) => {
    try {
      // Get stats from database
      const totalUsers = await storage.getTotalUserCount();
      const activeObservers = await storage.getActiveObserverCount();
      const pendingReports = await storage.getReportsByStatus('pending').then(reports => reports.length);
      const totalPollingStations = await storage.getAllPollingStations().then(stations => stations.length);
      const usersByRole = await storage.getUserCountByRole();
      const reportCountByType = await storage.getReportCountByType();
      const reportCountByStatus = await storage.getReportCountByStatus();
      const activeAssignmentsCount = await storage.getActiveAssignmentsCount();

      // Risk assessment for polling stations
      const stationsWithIssues = await storage.getStationsWithIssueReports();

      // Group stations by risk level based on issue count
      const stationRiskAssessment = {
        highRisk: stationsWithIssues.filter(station => station.issueCount > 5).length,
        mediumRisk: stationsWithIssues.filter(station => station.issueCount > 2 && station.issueCount <= 5).length,
        lowRisk: stationsWithIssues.filter(station => station.issueCount > 0 && station.issueCount <= 2).length,
        noRisk: totalPollingStations - stationsWithIssues.length
      };

      // Create statistics response
      const stats = {
        users: {
          total: totalUsers,
          activeObservers,
          byRole: usersByRole
        },
        reports: {
          pending: pendingReports,
          byType: reportCountByType,
          byStatus: reportCountByStatus
        },
        pollingStations: {
          total: totalPollingStations,
          riskAssessment: stationRiskAssessment
        },
        assignments: {
          active: activeAssignmentsCount
        },
        system: {
          databaseUsage: 68, // percentage - mock data, replace with actual metrics in production
          mediaStorageUsage: 42, // percentage - mock data, replace with actual metrics in production
          systemMemoryUsage: 54, // percentage - mock data, replace with actual metrics in production
          apiRequestsLast24h: 14382, // mock data, replace with actual metrics
          activeSessions: 87, // mock data, replace with actual metrics
          systemUptime: 99.8, // percentage - mock data, replace with actual metrics
        }
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching system statistics:', error);
      res.status(500).json({ message: 'Error fetching system statistics' });
    }
  });

  // Get all form templates
  app.get('/api/form-templates', ensureAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllFormTemplates();
      res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching form templates:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get active form templates
  app.get('/api/form-templates/active', ensureAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getActiveFormTemplates();
      res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching active form templates:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get form templates by category
  app.get('/api/form-templates/category/:category', ensureAuthenticated, async (req, res) => {
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
  app.get('/api/form-templates/:id', ensureAuthenticated, async (req, res) => {
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
  app.post('/api/form-templates', ensureAdmin, async (req, res) => {
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
  app.put('/api/form-templates/:id', ensureAdmin, async (req, res) => {
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
  app.patch('/api/form-templates/:id/status', ensureAdmin, async (req, res) => {
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
  app.delete('/api/form-templates/:id', ensureAdmin, async (req, res) => {
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

  // Registration form routes
  app.use('/api/registration-forms', registrationFormRoutes);

  // User import routes
  app.use('/api/user-imports', userImportRoutes);

  // Training integrations (Moodle, Zoom)
  app.use('/api/training', trainingIntegrationRoutes);

  // AI Analytics routes
  app.use('/api/analytics', analyticsRoutes);
  
  // Admin analytics routes (requires admin authentication)
  app.use('/api/admin/analytics', adminAnalyticsRoutes);
  
  // Admin user management routes
  app.use('/', adminUserRoutes);
  
  // Admin system information routes
  app.use('/', adminSystemRoutes);
  
  // Admin role management routes
  app.use('/', adminRolesRoutes);

  // ID Card routes
  app.use('/api/id-cards', idCardRoutes);

  // AI-powered image processing routes
  app.use('/api/images', imageProcessingRoutes);

  // Add Didit.me verification routes
  app.use('/api/verification', diditVerificationRoutes);

  // Add polling stations routes
  app.use('/api/polling-stations', pollingStationsRoutes);
  
  // News Enhanced Predictions - for Jamaica electoral news data integration
  // Register news enhanced predictions routes with specific path
  app.use('/api/admin/analytics', newsEnhancedPredictionsRoutes);
  
  // Permission management routes - properly secured for role-based access
  app.use('/api', permissionRoutes);
  
  // Add supervisor routes
  app.use('/api', supervisorRoutes);

  // Add project management routes
  app.use('/api/project-management', projectManagementRoutes);
  console.log('Project management routes registered at /api/project-management');
  
  // Add regions routes for parish/polling station regions
  app.use('/api/regions', regionsRoutes);

  // We'll initialize the Didit.me integration on demand instead of on startup
  // This prevents redirect issues and allows more control over when verification is used

  // Register error logging routes
  app.use('/api', errorLogRoutes);
  
  // Register admin error logs routes
  app.use('/api/admin', adminErrorLogRoutes);
  
  // Add error logging middleware as the last middleware before error handlers
  app.use(ErrorLogger.createErrorMiddleware());
  
  // Final error handler that sends response to client
  app.use((err: any, req: any, res: any, next: any) => {
    // Error already logged by previous middleware
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  });

  // Get a single report by ID
  app.get('/api/reports/:id', ensureAuthenticated, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: 'Invalid report ID' });
      }
      // Fetch the report
      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      // Optionally fetch related station and user info
      let station = null;
      let user = null;
      if (report.stationId) {
        station = await storage.getPollingStation(report.stationId);
      }
      if (report.userId) {
        user = await storage.getUser(typeof report.userId === 'string' ? parseInt(report.userId) : report.userId);
      }
      res.status(200).json({ ...report, station, user });
    } catch (error) {
      console.error('Error fetching report by ID:', error);
      res.status(500).json({ message: 'Failed to fetch report' });
    }
  });

  return httpServer;
}