import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { isAuthenticated, isAdmin } from '../middleware/auth';

const router = Router();

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
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
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
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
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
    
    // Toggle status
    const updatedUser = await storage.updateUser(userId, { isActive: !user.isActive });
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user status' });
    }
    
    res.json({
      id: updatedUser.id,
      isActive: updatedUser.isActive,
      message: updatedUser.isActive ? 'User account activated' : 'User account deactivated'
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;