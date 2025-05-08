import { Router, Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { 
  ensureAuthenticated, 
  ensureAdmin,
  ensureSupervisor,
  ensureRovingObserver,
  ensureDirector
} from '../middleware/auth';
import { storage } from '../storage';

const router = Router();

/**
 * Get all available permissions - Admin & Director only
 */
router.get('/permissions', ensureAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
  try {
    // Example permission data - in a real implementation this would come from the database
    const permissions = [
      { id: 1, name: 'view_reports', description: 'View reports submitted by observers' },
      { id: 2, name: 'create_reports', description: 'Create new incident reports' },
      { id: 3, name: 'approve_reports', description: 'Approve reports submitted by observers' },
      { id: 4, name: 'manage_observers', description: 'Add, edit, and remove observers' },
      { id: 5, name: 'manage_stations', description: 'Add, edit, and remove polling stations' },
      { id: 6, name: 'manage_assignments', description: 'Assign observers to polling stations' },
      { id: 7, name: 'view_analytics', description: 'View analytics and predictions dashboard' },
      { id: 8, name: 'manage_roles', description: 'Assign and manage user roles' },
      { id: 9, name: 'view_all_users', description: 'View all users in the system' },
      { id: 10, name: 'access_system_settings', description: 'Access and modify system settings' },
    ];

    return res.status(200).json(permissions);
  } catch (error) {
    logger.error('Error retrieving permissions', error as Error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Get user permissions - Supervisor+ only
 */
router.get('/users/:userId/permissions', ensureAuthenticated, ensureSupervisor, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // In a real implementation we would fetch the user's permissions from the database
    // Here we return mock data based on the user's role
    let rolePermissions: string[] = [];
    
    // Basic permissions for all roles
    const basePermissions = ['view_reports', 'create_reports'];
    
    if (user.role === 'observer') {
      rolePermissions = [...basePermissions];
    } else if (user.role === 'roving_observer') {
      rolePermissions = [...basePermissions, 'view_stations_in_area'];
    } else if (user.role === 'supervisor') {
      rolePermissions = [...basePermissions, 'approve_reports', 'manage_observers', 'view_analytics'];
    } else if (user.role === 'admin') {
      rolePermissions = [
        ...basePermissions,
        'approve_reports',
        'manage_observers',
        'manage_stations',
        'manage_assignments',
        'view_analytics',
        'view_all_users'
      ];
    } else if (user.role === 'director') {
      // Director has all permissions
      rolePermissions = [
        ...basePermissions,
        'approve_reports',
        'manage_observers',
        'manage_stations',
        'manage_assignments',
        'view_analytics',
        'manage_roles',
        'view_all_users',
        'access_system_settings'
      ];
    }

    return res.status(200).json({
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: rolePermissions
    });
  } catch (error) {
    logger.error(`Error retrieving permissions for user ID ${req.params.userId}`, error as Error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Update user roles - Director only
 */
router.post('/users/:userId/role', ensureAuthenticated, ensureDirector, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    // Validate role
    const validRoles = ['observer', 'roving_observer', 'supervisor', 'admin', 'director'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Get the user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user role
    const updatedUser = await storage.updateUser(userId, { role });
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update user role' });
    }

    logger.info(`User ${req.session?.userId} updated role of user ${userId} to ${role}`);

    return res.status(200).json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role
      }
    });
  } catch (error) {
    logger.error(`Error updating role for user ID ${req.params.userId}`, error as Error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;