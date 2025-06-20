import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { ensureAuthenticated, ensureAdmin, hasPermission } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Schema for verification status update
const verificationStatusSchema = z.object({
  verificationStatus: z.enum(['pending', 'verified', 'rejected'])
});

// Get all users
router.get('/api/admin/users', ensureAuthenticated, hasPermission('users:view'), async (req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    
    // For security, filter out sensitive information like password hashes
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      observerId: user.observerId,
      // Map verificationStatus to match the client expectations
      verificationStatus: user.verificationStatus || 'pending',
      // Also provide isActive for backwards compatibility
      isActive: user.verificationStatus === 'verified',
      // Add training status with default
      trainingStatus: user.trainingStatus || 'not_started',
      // Add phone number if available
      phoneNumber: user.phoneNumber || null,
      createdAt: user.createdAt || new Date()
    }));
    
    res.json(safeUsers);
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/api/admin/users/:id', ensureAuthenticated, hasPermission('users:view'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user profile
    const profile = await storage.getUserProfile(userId);
    
    // Return user with profile, removing sensitive information
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      observerId: user.observerId,
      // Handle missing fields with defaults
      isActive: user.verificationStatus === 'verified',
      // Add proper verification status in response
      verificationStatus: user.verificationStatus || 'pending',
      createdAt: user.createdAt || new Date(),
      profile: profile || null
    };
    
    res.json(safeUser);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Update user
router.patch('/api/admin/users/:id', ensureAuthenticated, hasPermission('users:edit'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate input
    const updateSchema = z.object({
      username: z.string().optional(),
      email: z.string().email().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      role: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: validationResult.error });
    }
    
    const updateData = validationResult.data;
    
    // Update user
    const updatedUser = await storage.updateUser(userId, updateData);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName || '',
      lastName: updatedUser.lastName || '',
      role: updatedUser.role,
      observerId: updatedUser.observerId,
      // Handle missing fields with defaults
      isActive: updatedUser.verificationStatus === 'verified',
      verificationStatus: updatedUser.verificationStatus || 'pending'
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get user documents for verification
router.get('/api/admin/users/:id/documents', ensureAuthenticated, hasPermission('users:view-documents'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get all documents for this user
    const documents = await storage.getDocumentsByUserId(userId);
    
    // Get user profile for additional verification data
    const profile = await storage.getUserProfile(userId);
    
    // Return the documents and profile info
    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        verificationStatus: user.verificationStatus
      },
      documents,
      profile
    });
  } catch (error) {
    logger.error('Error fetching user documents:', error);
    res.status(500).json({ error: 'Failed to fetch user documents' });
  }
});

// Update user verification status
router.post('/api/admin/users/:id/verify', ensureAuthenticated, hasPermission('users:verify'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate input
    const validationResult = verificationStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid verification status',
        details: validationResult.error
      });
    }
    
    const { verificationStatus } = validationResult.data;
    
    // Get user to update
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user verification status
    const updatedUser = await storage.updateUser(userId, { verificationStatus });
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update verification status' });
    }
    
    // Return updated user info
    res.json({
      id: updatedUser.id,
      verificationStatus: updatedUser.verificationStatus,
      message: `User verification status updated to ${verificationStatus}`
    });
  } catch (error) {
    logger.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// Disable/Enable user
router.patch('/api/admin/users/:id/toggle-status', ensureAuthenticated, hasPermission('users:edit-status'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Get current user to toggle status
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get current status and toggle it
    const currentStatus = user.verificationStatus === 'verified';
    const newVerificationStatus = currentStatus ? 'pending' : 'verified';
    
    // Update with the new status
    const updatedUser = await storage.updateUser(userId, { 
      verificationStatus: newVerificationStatus 
    });
    
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user status' });
    }
    
    // For response, map verification status to isActive
    const isActive = updatedUser.verificationStatus === 'verified';
    
    res.json({
      id: updatedUser.id,
      isActive: isActive,
      message: isActive ? 'User account activated' : 'User account deactivated'
    });
  } catch (error) {
    logger.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;