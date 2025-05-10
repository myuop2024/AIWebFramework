import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { ensureAuthenticated as isAuthenticated, ensureAdmin as isAdmin } from '../middleware/auth';

const router = Router();

// Schema for verification status update
const verificationStatusSchema = z.object({
  verificationStatus: z.enum(['pending', 'verified', 'rejected'])
});

// Get all users
router.get('/api/admin/users', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
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
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
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
      updatedAt: user.updatedAt || new Date(),
      profile: profile || null
    };
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Update user
router.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
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
      isActive: updatedUser.verificationStatus === 'approved',
      updatedAt: updatedUser.updatedAt || new Date()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user verification status
router.post('/api/admin/users/:id/verify', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
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
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// Disable/Enable user
router.patch('/api/admin/users/:id/toggle-status', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
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
    const currentStatus = user.verificationStatus === 'approved';
    const newVerificationStatus = currentStatus ? 'pending' : 'approved';
    
    // Update with the new status
    const updatedUser = await storage.updateUser(userId, { 
      verificationStatus: newVerificationStatus 
    });
    
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user status' });
    }
    
    // For response, map verification status to isActive
    const isActive = updatedUser.verificationStatus === 'approved';
    
    res.json({
      id: updatedUser.id,
      isActive: isActive,
      message: isActive ? 'User account activated' : 'User account deactivated'
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;