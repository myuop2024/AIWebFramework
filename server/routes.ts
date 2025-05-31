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
// New comprehensive CRUD routes
import newsRoutes from './routes/news-routes';
import eventsRoutes from './routes/events-routes';
import reportsRoutes from './routes/reports-routes';
import assignmentsRoutes from './routes/assignments-routes';
import usersRoutes from './routes/users-routes';
import { encryptSensitiveFields, decryptProfileFields } from './services/encryption-service';
import permissionRoutes from './routes/permission-routes';
import supervisorRoutes from './routes/supervisor-routes';
import errorLogRoutes from './routes/error-logs';
import adminErrorLogRoutes from './routes/admin-error-logs';
import projectManagementRoutes from './routes/project-management-routes';
import regionsRoutes from './routes/regions-routes';
import googleSyncRoutes from './routes/google-sync-routes'; // Import Google Sync routes
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
import bcrypt from 'bcrypt';

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
      
      // Attempt to verify with bcrypt first (preferred)
      let passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch && user.password.length === 64 && !user.password.startsWith('$2')) {
          // Potentially an old SHA256 hash (64 chars, doesn't look like bcrypt hash)
          logger.info(`Attempting SHA256 fallback for user: ${username}`);
          const sha256HashedPassword = createHash('sha256').update(password).digest('hex');
          if (user.password === sha256HashedPassword) {
              logger.info(`SHA256 password match for user: ${username}. Re-hashing with bcrypt.`);
              passwordMatch = true; // Treat as a match for login purposes
              // Rehash and update the password in the database
              const saltRounds = 10; // Or use a configurable value
              const newBcryptHash = await bcrypt.hash(password, saltRounds);
              try {
                  await storage.updateUser(user.id, { password: newBcryptHash });
                  logger.info(`Password for user ${username} successfully re-hashed to bcrypt.`);
              } catch (rehashError) {
                  logger.error(`Failed to re-hash password for user ${username} to bcrypt`, rehashError);
                  // Proceed with login, but log the failure to update hash
              }
          }
      }

      if (!passwordMatch) {
          logger.warn(`Login failed: Invalid password for user: ${username}`);
          return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      logger.info(`Password verified for user: ${username}`);
      // Log user object for debugging (excluding password)
      const userForDebug = {...user};
      delete userForDebug.password; // Do not log the password hash
      logger.debug('User object for login:', userForDebug);
      
      // Store user in session
      req.login(user, (err: any) => { // Added type for err
        if (err) {
          logger.error('Error during login/session creation', { error: err.message, stack: err.stack, username: username });
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
          // Ensure deviceId is not sent here unless specifically intended for this older route
        };
        
        logger.info(`Login successful for user: ${username}`);
        return res.status(200).json(safeUser);
      });
    } catch (error) {
      const err = error as Error; // Type assertion
      logger.error('Login error:', { username: req.body?.username, error: err.message, stack: err.stack });
      res.status(500).json({ message: 'Internal server error', details: err.message });
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
      const result = insertUserSchema.safeParse(req.body); // Attempt to parse for context even in error
      logger.error('Registration error:', error instanceof Error ? error : new Error(String(error)), {
        username: result.success ? result.data.username : req.body?.username,
        email: result.success ? result.data.email : req.body?.email
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/user', ensureAuthenticated, async (req, res) => {
    let userId = req.user?.id; // Define userId in a scope accessible by catch block
    try {
      userId = req.user?.id;
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
      logger.error('Error fetching authenticated user', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Setup static file serving for uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
  logger.info(`Serving static files from: ${uploadsDir}`);

  // Initialize the communication service
  const communicationService = new CommunicationService(httpServer);
  setCommunicationService(communicationService);
  app.use('/api/communications', communicationRoutes);
  logger.info('Communication service initialized with WebSocket support');

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
      logger.error('Error fetching user metadata', { username: req.query?.username, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // QR code data endpoint for observer verification
  app.get('/api/users/qrcode', ensureAuthenticated, async (req, res) => {
    let userId = req.session.userId as number; // Define userId in a scope accessible by catch block
    try {
      userId = req.session.userId as number;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - No user ID in session' });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        logger.warn(`User not found with ID: ${userId} in GET /api/users/qrcode`);
        return res.status(404).json({ message: 'User not found' });
      }

      // Return observer ID for QR code generation
      res.status(200).json({
        observerId: user.observerId,
        userId: user.id,
        username: user.username
      });
    } catch (error) {
      logger.error('Error fetching QR code data', { userId, error: error instanceof Error ? error : new Error(String(error)) });
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
      logger.info(`Device reset requested for user: ${username}, observer ID: ${user.observerId}`);

      // Clear the device ID binding to allow login from a new device
      // In a production app, this might require admin approval
      await storage.updateUser(user.id, { deviceId: null });

      // Return success
      res.status(200).json({ message: 'Device reset request has been submitted' });
    } catch (error) {
      logger.error('Error processing device reset request', { username: req.body?.username, email: req.body?.email, error: error instanceof Error ? error : new Error(String(error)) });
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
        const { password, twoFactorSecret, recoveryCodes, ...userWithoutPassword } = user;

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
        const { password: _, twoFactorSecret, recoveryCodes, ...userWithoutPassword } = user;
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
  
  // Password change endpoint
  // NOTE: The redundant GET /api/user route that was here has been removed.
  // The correct one is defined earlier with ensureAuthenticated middleware.
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

  // User profile route (supports both session-based auth and Replit Auth)
  app.get('/api/users/profile', async (req, res) => {
    try {
      // Determine authentication method
      let userId = req.session?.userId || (req.user as any)?.claims?.sub; // Define userId in a scope accessible by catch block
      const userRole = req.session?.role || (req.user as any)?.claims?.role;

      if (!userId) {
        logger.warn('[AUTH] /api/users/profile: No authenticated user', { sessionExists: !!req.session, userIdFromSession: req.session?.userId, userFromReq: (req.user as any)?.claims?.sub });
        return res.status(401).json({ message: 'Unauthorized - No user ID in session' });
      }
      userId = req.session?.userId || (req.user as any)?.claims?.sub; // Re-assign for clarity

      logger.debug(`/api/users/profile hit for user ID: ${userId}`);

      // Fetch user
      const user = await storage.getUser(userId);
      if (!user) {
        logger.warn(`User not found with ID: ${userId} in GET /api/users/profile`);
        return res.status(404).json({ message: 'User not found' });
      }

      // Fetch related data
      const [profile, documents] = await Promise.all([
        storage.getUserProfile(userId),
        storage.getDocumentsByUserId(userId),
      ]);

      // Remove sensitive data
      const { password, ...userWithoutPassword } = user;

      // Decrypt profile fields for privileged roles
      const decryptedProfile = decryptProfileFields(profile, userRole);

      res.status(200).json({
        user: userWithoutPassword,
        profile: decryptedProfile || null,
        documents: documents || [],
      });
    } catch (error) {
      logger.error('Error in GET /api/users/profile', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

app.post('/api/users/profile', ensureAuthenticated, async (req, res) => {
    let userId = req.session.userId as number; // Define userId in a scope accessible by catch block
    try {
      userId = req.session.userId as number; // Type assertion (already verified in ensureAuthenticated)
      const userRole = req.session.role as string;
      logger.info(`Creating/updating profile for user ID: ${userId}`);

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
        logger.debug(`Existing profile for user ${userId}: ${existingProfile ? 'Yes' : 'No'}`);

        let profile;
        if (existingProfile) {
          profile = await storage.updateUserProfile(userId, profileData);
          logger.info(`Profile updated for user ${userId}`);
        } else {
          profile = await storage.createUserProfile({
            ...profileData,
            userId
          });
          logger.info(`Profile created for user ${userId}`);
        }

        // Update user verification status
        await storage.updateUser(userId, { verificationStatus: 'in-progress' });
        logger.info(`User verification status updated for ${userId}`);

        // Return decrypted data to authorized users, otherwise return as-is
        const responseProfile = profile ? decryptProfileFields(profile, userRole) : null;
        res.status(200).json(responseProfile);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          logger.warn('Validation error in profile data for POST /api/users/profile', { userId, errors: validationError.errors });
          return res.status(400).json({ 
            message: fromZodError(validationError).message,
            errors: validationError.errors
          });
        }
        throw validationError; // Re-throw if not a ZodError
      }
    } catch (error) {
      logger.error('Error in POST /api/users/profile', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Document routes
  app.post('/api/documents', ensureAuthenticated, async (req, res) => {
    let userId = req.session.userId as number; // Define userId in a scope accessible by catch block
    try {
      userId = req.session.userId as number; // Type assertion (verified in middleware)

      try {
        const documentData = insertDocumentSchema.parse(req.body);

        const document = await storage.createDocument({
          ...documentData,
          userId
        });

        logger.info(`Document created: ID ${document.id} for user ${userId}`);
        res.status(201).json(document);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          logger.warn('Document data validation error for POST /api/documents', { userId, errors: validationError.errors });
          return res.status(400).json({ 
            message: fromZodError(validationError).message,
            errors: validationError.errors 
          });
        }
        throw validationError; // Re-throw if not ZodError
      }
    } catch (error) {
      logger.error('Error creating document for POST /api/documents', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ 
        message: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/documents', ensureAuthenticated, async (req, res) => {
    let userId = req.session.userId as number; // Define userId in a scope accessible by catch block
    try {
      userId = req.session.userId as number; // Type assertion (verified in middleware)
      logger.debug(`Fetching documents for user ${userId}`);

      const documents = await storage.getDocumentsByUserId(userId);
      logger.debug(`Found ${documents.length} documents for user ${userId}`);

      res.status(200).json(documents);
    } catch (error) {
      logger.error('Error fetching documents for GET /api/documents', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Polling station routes are now handled by pollingStationsRoutes

  app.get('/api/users/assignments', ensureAuthenticated, async (req, res) => {
    let userId = req.session.userId as number; // Define userId in a scope accessible by catch block
    try {
      userId = req.session.userId as number;
      logger.debug(`Fetching assignments for user ${userId}`);

      const assignments = await storage.getAssignmentsByUserId(userId);
      logger.debug(`Found ${assignments.length} assignments for user ${userId}`);

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
      logger.error('Error fetching assignments for GET /api/users/assignments', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/users/assignments/active', ensureAuthenticated, async (req, res) => {
    let userId = req.session.userId as number; // Define userId in a scope accessible by catch block
    try {
      userId = req.session.userId as number;
      logger.debug(`Fetching active assignments for user ${userId}`);

      const assignments = await storage.getActiveAssignments(userId);
      logger.debug(`Found ${assignments.length} active assignments for user ${userId}`);

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
      logger.error('Error fetching active assignments for GET /api/users/assignments/active', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/stations/:stationId/assignments', ensureAuthenticated, async (req, res) => {
    let stationIdParam = req.params.stationId; // Define in a scope accessible by catch block
    try {
      stationIdParam = req.params.stationId;
      const stationId = parseInt(stationIdParam);
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
      logger.error('Error fetching station assignments for GET /api/stations/:stationId/assignments', { stationId: stationIdParam, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/assignments/:id', ensureAuthenticated, async (req, res) => {
    let assignmentIdParam = req.params.id; // Define in a scope accessible by catch block
    let userId = req.session.userId as number;
    let role = req.session.role;
    try {
      userId = req.session.userId as number;
      role = req.session.role;
      assignmentIdParam = req.params.id;
      const assignmentId = parseInt(assignmentIdParam);

      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: 'Invalid assignment ID' });
      }

      logger.debug(`Fetching assignment ${assignmentId} for user ${userId} (role: ${role})`);

      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        logger.warn(`Assignment ${assignmentId} not found for GET /api/assignments/:id`, { assignmentId, userId });
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // Security check - only allow users to view their own assignments 
      // unless they're an admin
      if (assignment.userId !== userId && role !== 'admin') {
        logger.warn(`Unauthorized access to assignment ${assignmentId} by user ${userId}`, { assignmentId, userId, role });
        return res.status(403).json({ message: 'Not authorized to access this assignment' });
      }

      // Get station info
      const station = await storage.getPollingStation(assignment.stationId);

      res.status(200).json({
        ...assignment,
        station: station || null // Ensure null instead of undefined
      });
    } catch (error) {
      logger.error('Error fetching assignment for GET /api/assignments/:id', { assignmentId: assignmentIdParam, userId, role, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/assignments', ensureAuthenticated, async (req, res) => {
    let userId = req.session.userId as number; // Define for catch block
    let role = req.session.role; // Define for catch block
    let assignUserId = userId; // Default for catch block
    try {
      userId = req.session.userId as number;
      role = req.session.role;

      logger.info(`Creating assignment by user ${userId} (role: ${role})`);

      // Basic validation
      if (!req.body.stationId || !req.body.startDate || !req.body.endDate) {
        logger.warn('Assignment creation missing required fields for POST /api/assignments', { userId, body: req.body });
        return res.status(400).json({ 
          message: 'Missing required fields: stationId, startDate, and endDate are required' 
        });
      }

      // Parse dates
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        logger.warn('Invalid date format in assignment creation for POST /api/assignments', { userId, body: req.body });
        return res.status(400).json({ message: 'Invalid date format' });
      }

      if (startDate >= endDate) {
        logger.warn('End date not after start date in assignment creation for POST /api/assignments', { userId, body: req.body });
        return res.status(400).json({ message: 'End date must be after start date' });
      }

      // Only allow admins to assign other users
      assignUserId = role === 'admin' && req.body.userId
        ? parseInt(req.body.userId) 
        : userId;

      logger.info(`Assignment will be created for user ${assignUserId}`);

      // Create assignment with parsed dates
      const assignment = await storage.createAssignment({
        ...req.body,
        userId: assignUserId,
        startDate,
        endDate
      });

      logger.info(`Assignment created: ID ${assignment.id} for user ${assignUserId}`);

      // Get station info
      const station = await storage.getPollingStation(assignment.stationId);

      res.status(201).json({
        ...assignment,
        station: station || null // Ensure null instead of undefined
      });
    } catch (error) {
      logger.error('Error creating assignment for POST /api/assignments', { userId, role, creatingForUserId: assignUserId, body: req.body, error: error instanceof Error ? error : new Error(String(error)) });
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
    let assignmentIdParam = req.params.id; // Define for catch block
    let userId = req.session.userId;
    let userRole = req.session.role;
    try {
      userId = req.session.userId;
      userRole = req.session.role;
      assignmentIdParam = req.params.id;
      const assignmentId = parseInt(assignmentIdParam);

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
      logger.error('Error updating assignment for PUT /api/assignments/:id', { assignmentId: assignmentIdParam, userId, userRole, body: req.body, error: error instanceof Error ? error : new Error(String(error)) });
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
    let assignmentIdParam = req.params.id; // Define for catch block
    let userId = req.session.userId;
    let userRole = req.session.role;
    try {
      userId = req.session.userId;
      userRole = req.session.role;
      assignmentIdParam = req.params.id;
      const assignmentId = parseInt(assignmentIdParam);

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
      logger.error('Error checking in for POST /api/assignments/:id/check-in', { assignmentId: assignmentIdParam, userId, userRole, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'An error occurred while checking in' });
    }
  });

  app.post('/api/assignments/:id/check-out', ensureAuthenticated, async (req, res) => {
    let assignmentIdParam = req.params.id; // Define for catch block
    let userId = req.session.userId;
    let userRole = req.session.role;
    try {
      userId = req.session.userId;
      userRole = req.session.role;
      assignmentIdParam = req.params.id;
      const assignmentId = parseInt(assignmentIdParam);

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
      logger.error('Error checking out for POST /api/assignments/:id/check-out', { assignmentId: assignmentIdParam, userId, userRole, error: error instanceof Error ? error : new Error(String(error)) });
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
            logger.error('Error getting station for report in GET /api/reports', { reportId: report.id, stationId: report.stationId, error: err instanceof Error ? err : new Error(String(err)) });
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
      logger.error('Error fetching reports for GET /api/reports', { userId: req.session.userId, error: error instanceof Error ? error : new Error(String(error)) });
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
      logger.error('Failed to fetch system settings for GET /api/system-settings', { error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to fetch system settings' });
    }
  });

  app.get('/api/system-settings/:key', async (req, res) => {
    let keyParam = req.params.key; // Define for catch block
    try {
      keyParam = req.params.key;
      const { key } = req.params;
      const setting = await storage.getSystemSetting(key);

      if (!setting) {
        return res.status(404).json({ message: `Setting with key ${key} not found` });
      }

      res.json(setting);
    } catch (error) {
      logger.error(`Failed to fetch system setting with key ${keyParam} for GET /api/system-settings/:key`, { key: keyParam, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to fetch system setting' });
    }
  });

  app.put('/api/system-settings/:key', ensureAdmin, async (req, res) => {
    let keyParam = req.params.key; // Define for catch block
    let userId = req.session.userId;
    try {
      keyParam = req.params.key;
      userId = req.session.userId;
      const { key } = req.params;
      const { value } = req.body;

      if (!value) {
        return res.status(400).json({ message: 'Setting value is required' });
      }

      const existingSetting = await storage.getSystemSetting(key);
      if (!existingSetting) {
        return res.status(404).json({ message: `Setting with key ${key} not found` });
      }

      const updatedSetting = await storage.updateSystemSetting(key, value, userId);

      res.json(updatedSetting);
    } catch (error) {
      logger.error(`Failed to update system setting with key ${keyParam} for PUT /api/system-settings/:key`, { key: keyParam, value: req.body.value, userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to update system setting' });
    }
  });

  app.post('/api/system-settings', ensureAdmin, async (req, res) => {
    let userId = req.session.userId; // Define for catch block
    try {
      userId = req.session.userId;
      const { settingKey, settingValue, description } = req.body;

      if (!settingKey || !settingValue) {
        return res.status(400).json({ message: 'Setting key and value are required' });
      }

      const existingSetting = await storage.getSystemSetting(settingKey);
      if (existingSetting) {
        return res.status(409).json({ message: `Setting with key ${settingKey} already exists` });
      }

      const newSetting = await storage.createSystemSetting({
        settingKey,
        settingValue,
        description: description || null,
        updatedBy: userId
      });

      res.status(201).json(newSetting);
    } catch (error) {
      logger.error('Failed to create system setting for POST /api/system-settings', { body: req.body, userId, error: error instanceof Error ? error : new Error(String(error)) });
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
      logger.error('Error fetching verification settings for GET /api/admin/settings/verification', { error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to fetch verification settings' });
    }
  });

  app.post('/api/admin/settings/verification', ensureAdmin, async (req, res) => {
    let adminUserId = req.session.userId as number; // Define for catch block
    try {
      adminUserId = req.session.userId as number;
      const { verificationSettingsSchema } = await import('@shared/schema');
      
      // Validate request body against the schema
      const settings = verificationSettingsSchema.parse(req.body);
      
      // Update or create the verification settings
      const updatedSetting = await storage.updateSystemSetting(
        'verification_settings',
        settings,
        adminUserId
      );
      
      if (!updatedSetting) {
        // If update failed, create the setting
        await storage.createSystemSetting({
          settingKey: 'verification_settings',
          settingValue: settings,
          description: 'Verification requirements and process configuration',
          updatedBy: adminUserId
        });
      }
      
      return res.status(200).json(settings);
    } catch (error: any) {
      logger.error('Error updating verification settings for POST /api/admin/settings/verification', { userId: adminUserId, body: req.body, error: error instanceof Error ? error : new Error(String(error)), zodErrors: error.errors });
      if (error.errors) { // This is specific to ZodError, logger already captures full error.
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
      logger.error('Error fetching users for GET /api/admin/users', { error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Endpoint for approving or rejecting user verification
  app.post('/api/admin/users/:userId/verify', ensureAdmin, async (req, res) => {
    let targetUserId = req.params.userId; // Define for catch block
    let adminUserId = req.session.userId;
    try {
      targetUserId = req.params.userId;
      adminUserId = req.session.userId;
      const userIdInt = parseInt(targetUserId);
      const { verificationStatus } = req.body;

      if (!userIdInt || !verificationStatus) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      if (verificationStatus !== 'verified' && verificationStatus !== 'rejected' && verificationStatus !== 'pending') {
        return res.status(400).json({ message: 'Invalid verification status' });
      }

      // Update the user's verification status
      const userFromStorage = await storage.updateUser(userIdInt, { verificationStatus });

      if (!userFromStorage) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Sanitize user object before sending
      const { password, twoFactorSecret, recoveryCodes, ...updatedUser } = userFromStorage;
      return res.json(updatedUser);
    } catch (error) {
      logger.error('Error updating user verification for POST /api/admin/users/:userId/verify', { targetUserId, verificationStatus: req.body.verificationStatus, adminUserId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to update user verification' });
    }
  });

  // Pending profile photo approvals
  app.get('/api/admin/pending-photo-approvals', ensureAdmin, async (req, res) => {
    try {
      logger.debug('Fetching pending photo approvals');
      const pendingPhotos = await storage.getPendingPhotoApprovals();
      logger.debug('Found pending photos count:', {count: pendingPhotos.length});

      // Enhance with user information
      const pendingPhotosWithUserInfo = await Promise.all(
        pendingPhotos.map(async (photo) => {
          logger.debug('Processing photo approval', { photoId: photo.id, userId: photo.userId });
          const user = await storage.getUser(photo.userId);
          logger.debug('Found user for photo approval', { userId: photo.userId, username: user?.username });

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

      logger.debug('Returning enhanced photo approvals count:', {count: pendingPhotosWithUserInfo.length});
      res.status(200).json(pendingPhotosWithUserInfo);
    } catch (error) {
      logger.error('Error fetching pending photo approvals for GET /api/admin/pending-photo-approvals', { adminUserId: req.session.userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to fetch pending photo approvals' });
    }
  });

  // Approve a pending profile photo
  app.post('/api/admin/pending-photo-approvals/:id/approve', ensureAdmin, async (req, res) => {
    let approvalIdParam = req.params.id; // Define for catch block
    let adminUserId = req.session.userId;
    try {
      approvalIdParam = req.params.id;
      adminUserId = req.session.userId;
      const approvalId = parseInt(approvalIdParam);
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
      if (!adminUserId) {
        // This case should ideally be caught by ensureAdmin, but good for robustness
        logger.warn('Admin ID not found in session during photo approval');
        return res.status(401).json({ message: 'Unauthorized - admin ID not found in session' });
      }
      
      await storage.approvePhotoApproval(approvalId, adminUserId);

      res.status(200).json({ message: 'Photo approved successfully' });
    } catch (error) {
      logger.error('Error approving profile photo for POST /api/admin/pending-photo-approvals/:id/approve', { approvalId: approvalIdParam, adminUserId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to approve profile photo' });
    }
  });

  // Reject a pending profile photo
  app.post('/api/admin/pending-photo-approvals/:id/reject', ensureAdmin, async (req, res) => {
    let approvalIdParam = req.params.id; // Define for catch block
    let adminUserId = req.session.userId;
    try {
      approvalIdParam = req.params.id;
      adminUserId = req.session.userId;
      const approvalId = parseInt(approvalIdParam);
      if (isNaN(approvalId)) {
        return res.status(400).json({ message: 'Invalid approval ID' });
      }

      // Get the pending approval
      const pendingApproval = await storage.getPhotoApproval(approvalId);
      if (!pendingApproval) {
        return res.status(404).json({ message: 'Pending approval not found' });
      }

      // Mark the approval as rejected using the dedicated rejection method
      if (!adminUserId) {
        logger.warn('Admin ID not found in session during photo rejection');
        return res.status(401).json({ message: 'Unauthorized - admin ID not found in session' });
      }
      
      await storage.rejectPhotoApproval(approvalId, adminUserId);

      res.status(200).json({ message: 'Photo rejected successfully' });
    } catch (error) {
      logger.error('Error rejecting profile photo for POST /api/admin/pending-photo-approvals/:id/reject', { approvalId: approvalIdParam, adminUserId, error: error instanceof Error ? error : new Error(String(error)) });
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
      logger.error('Error fetching verification queue for GET /api/admin/verification-queue', { adminUserId: req.session.userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to fetch verification queue' });
    }
  });

  // Approve observer verification
  app.post('/api/admin/verification/:id/approve', ensureAdmin, async (req, res) => {
    let observerIdParam = req.params.id; // Define for catch block
    let adminUserId = req.session.userId;
    try {
      observerIdParam = req.params.id;
      adminUserId = req.session.userId;
      const observerId = parseInt(observerIdParam);
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
      logger.error('Error approving observer for POST /api/admin/verification/:id/approve', { observerIdToApprove: observerIdParam, adminUserId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to approve observer' });
    }
  });

  // Reject observer verification
  app.post('/api/admin/verification/:id/reject', ensureAdmin, async (req, res) => {
    let observerIdParam = req.params.id; // Define for catch block
    let adminUserId = req.session.userId;
    try {
      observerIdParam = req.params.id;
      adminUserId = req.session.userId;
      const observerId = parseInt(observerIdParam);
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
      const errorDetails = {
        observerIdToReject: observerIdParam,
        reason: req.body.reason,
        adminUserId,
        error: error instanceof Error ? error : new Error(String(error)),
        zodErrors: error instanceof ZodError ? fromZodError(error).message : undefined
      };
      logger.error('Error rejecting observer for POST /api/admin/verification/:id/reject', errorDetails);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
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
      logger.error('Error fetching system statistics for GET /api/admin/system-stats', { adminUserId: req.session.userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Error fetching system statistics' });
    }
  });

  // Get all form templates
  app.get('/api/form-templates', ensureAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllFormTemplates();
      res.status(200).json(templates);
    } catch (error) {
      logger.error('Error fetching form templates for GET /api/form-templates', { userId: req.session.userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get active form templates
  app.get('/api/form-templates/active', ensureAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getActiveFormTemplates();
      res.status(200).json(templates);
    } catch (error) {
      logger.error('Error fetching active form templates for GET /api/form-templates/active', { userId: req.session.userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get form templates by category
  app.get('/api/form-templates/category/:category', ensureAuthenticated, async (req, res) => {
    let categoryParam = req.params.category; // Define for catch block
    try {
      categoryParam = req.params.category;
      const { category } = req.params;
      const templates = await storage.getFormTemplatesByCategory(category);
      res.status(200).json(templates);
    } catch (error) {
      logger.error('Error fetching form templates by category for GET /api/form-templates/category/:category', { category: categoryParam, userId: req.session.userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get form template by ID
  app.get('/api/form-templates/:id', ensureAuthenticated, async (req, res) => {
    let idParam = req.params.id; // Define for catch block
    try {
      idParam = req.params.id;
      const id = parseInt(idParam);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }

      const template = await storage.getFormTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Form template not found' });
      }

      res.status(200).json(template);
    } catch (error) {
      logger.error('Error fetching form template for GET /api/form-templates/:id', { templateId: idParam, userId: req.session.userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create form template (admin only)
  app.post('/api/form-templates', ensureAdmin, async (req, res) => {
    let adminUserId = req.session.userId; // Define for catch block
    try {
      adminUserId = req.session.userId;

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
        createdBy: adminUserId
      });

      res.status(201).json(template);
    } catch (error) {
      const errorDetails = {
        userId: adminUserId,
        body: req.body,
        error: error instanceof Error ? error : new Error(String(error)),
        zodErrors: error instanceof ZodError ? fromZodError(error).message : undefined
      };
      logger.error('Error creating form template for POST /api/form-templates', errorDetails);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update form template (admin only)
  app.put('/api/form-templates/:id', ensureAdmin, async (req, res) => {
    let idParam = req.params.id; // Define for catch block
    let adminUserId = req.session.userId;
    try {
      idParam = req.params.id;
      adminUserId = req.session.userId;
      const id = parseInt(idParam);
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
      const errorDetails = {
        templateId: idParam,
        userId: adminUserId,
        body: req.body,
        error: error instanceof Error ? error : new Error(String(error)),
        zodErrors: error instanceof ZodError ? fromZodError(error).message : undefined
      };
      logger.error('Error updating form template for PUT /api/form-templates/:id', errorDetails);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Activate/deactivate form template (admin only)
  app.patch('/api/form-templates/:id/status', ensureAdmin, async (req, res) => {
    let idParam = req.params.id; // Define for catch block
    let adminUserId = req.session.userId;
    try {
      idParam = req.params.id;
      adminUserId = req.session.userId;
      const id = parseInt(idParam);
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
      const errorDetails = {
        templateId: idParam,
        isActive: req.body.isActive,
        userId: adminUserId,
        error: error instanceof Error ? error : new Error(String(error)),
        zodErrors: error instanceof ZodError ? fromZodError(error).message : undefined
      };
      logger.error('Error updating form template status for PATCH /api/form-templates/:id/status', errorDetails);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete form template (admin only)
  app.delete('/api/form-templates/:id', ensureAdmin, async (req, res) => {
    let idParam = req.params.id; // Define for catch block
    let adminUserId = req.session.userId;
    try {
      idParam = req.params.id;
      adminUserId = req.session.userId;
      const id = parseInt(idParam);
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
      logger.error('Error deleting form template for DELETE /api/form-templates/:id', { templateId: idParam, userId: adminUserId, error: error instanceof Error ? error : new Error(String(error)) });
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
  logger.info('Project management routes registered at /api/project-management');
  
  // Add regions routes for parish/polling station regions
  app.use('/api/regions', regionsRoutes);

  // We'll initialize the Didit.me integration on demand instead of on startup
  // This prevents redirect issues and allows more control over when verification is used

  // Register error logging routes
  app.use('/api', errorLogRoutes);
  
  // Register admin error logs routes
  app.use('/api/admin', adminErrorLogRoutes);
  
  // New comprehensive CRUD routes for data management
  app.use('/api/news', newsRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/assignments', assignmentsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/google-sync', googleSyncRoutes); // Register Google Sync routes
  
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
      let userFromStorage = null;
      if (report.stationId) {
        station = await storage.getPollingStation(report.stationId);
      }
      if (report.userId) {
        userFromStorage = await storage.getUser(typeof report.userId === 'string' ? parseInt(report.userId) : report.userId);
      }

      let safeUser = null;
      if (userFromStorage) {
        const { password, twoFactorSecret, recoveryCodes, ...sanitizedUser } = userFromStorage;
        safeUser = sanitizedUser;
      }

      res.status(200).json({ ...report, station, user: safeUser });
    } catch (error) {
      logger.error('Error fetching report by ID for GET /api/reports/:id', { reportId: req.params.id, userId: req.session?.userId, error: error instanceof Error ? error : new Error(String(error)) });
      res.status(500).json({ message: 'Failed to fetch report' });
    }
  });

  return httpServer;
}