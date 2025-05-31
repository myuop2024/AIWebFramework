import { Router, Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { 
  ensureAuthenticated, 
  ensureAdmin,
  ensureSupervisor,
  hasPermission
} from '../middleware/auth';
import { storage } from '../storage';

const router = Router();

/**
 * Get all available permissions - Admin & Director only
 */
router.get('/permissions', ensureAuthenticated, hasPermission('permissions:view-all-available'), async (req: Request, res: Response) => {
  try {
    const allRoles = await storage.getAllRoles();
    const uniquePermissions = new Set<string>();
    allRoles.forEach(role => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(permission => {
          if (typeof permission === 'string') { // Ensure permission is a string
            uniquePermissions.add(permission);
          }
        });
      }
    });
    res.status(200).json({ permissions: Array.from(uniquePermissions).sort() });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error retrieving all permissions', err);
    return res.status(500).json({ message: 'Internal server error while retrieving permissions', details: err.message });
  }
});

/**
 * Get user permissions - Supervisor+ only
 */
router.get('/users/:userId/permissions', ensureAuthenticated, hasPermission('users:view-permissions'), async (req: Request, res: Response) => {
  try {
    const userIdParam = req.params.userId;
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let rolePermissions: string[] = [];
    if (user.role) {
      const role = await storage.getRoleByName(user.role); // Assumes user.role is the role name
      if (role && role.permissions && Array.isArray(role.permissions)) {
        // Ensure all permissions are strings, just in case of data inconsistency
        rolePermissions = role.permissions.filter(p => typeof p === 'string') as string[];
      } else if (role) {
        logger.warn(`Role '${user.role}' for user ID ${userId} has no permissions array or it's malformed.`);
      } else {
        logger.warn(`Role '${user.role}' not found in roles table for user ID ${userId}. User will have no permissions.`);
      }
    } else {
      logger.warn(`User ID ${userId} has no role assigned. User will have no permissions.`);
    }

    return res.status(200).json({
      userId: user.id,
      username: user.username,
      role: user.role || 'N/A', // Handle cases where role might be null/undefined
      permissions: rolePermissions.sort()
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Error retrieving permissions for user ID ${req.params.userId}`, err);
    return res.status(500).json({ message: 'Internal server error while fetching user permissions', details: err.message });
  }
});

/**
 * Update user roles - Admin & Director only
 */
router.post('/users/:userId/role', ensureAuthenticated, hasPermission('users:assign-role'), async (req: Request, res: Response) => {
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Error updating role for user ID ${req.params.userId}`, err);
    return res.status(500).json({ message: 'Internal server error while updating user role', details: err.message });
  }
});

export default router;