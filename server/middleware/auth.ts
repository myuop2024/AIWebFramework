/**
 * Authentication middleware for protecting routes
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';
import logger from '../utils/logger';

/**
 * Enhanced type definition for Express Request with typed user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'password'>;
    }
  }
}

/**
 * Middleware to ensure a user is authenticated
 * Enforces type safety with session values
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check if session exists and userId is set
  if (!req.session || !req.session.userId) {
    logger.warn('Authentication failed: userId is undefined, session exists: ' + !!req.session);
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'Session expired or invalid. Please log in again.' 
    });
  }
  
  // Additional validation that userId is a number
  if (typeof req.session.userId !== 'number') {
    const metadata = {
      sessionData: {
        userId: req.session.userId,
        typeOfUserId: typeof req.session.userId
      },
      requestPath: req.path
    };
    logger.error('Authentication error: userId exists but is not a number', new Error('Type validation failed'), metadata);
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'Invalid session format. Please log in again.' 
    });
  }
  
  // Valid session, continue to next middleware or route handler
  next();
};

/**
 * Middleware to ensure a user is an admin
 * Includes enhanced error handling and logging
 */
export const ensureAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated
  if (!req.session || !req.session.userId) {
    logger.warn('Admin check failed: No authenticated user');
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'You must be logged in to access this resource' 
    });
  }
  
  // Then check if the user has admin role
  const role = req.session.role;
  if (role !== 'admin' && role !== 'director') { // Allow directors same access as admins
    logger.warn(`Admin access denied: User ${req.session.userId} with role ${role} attempted admin action`);
    return res.status(403).json({ 
      message: 'Forbidden', 
      details: 'You do not have permission to access this resource' 
    });
  }
  
  // Admin user, continue to next middleware or route handler
  next();
};

/**
 * Middleware to attach current user information to request
 * Useful for routes that need user context but don't require authentication
 */
export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId) {
    // User is authenticated, get full user info from database
    try {
      // Note: Here we would typically query the database for the full user object
      // For now, we just add the user ID from the session
      req.user = {
        id: req.session.userId,
        observerId: req.session.observerId || '',
        role: req.session.role || 'user',
        // Add other fields here as needed
      } as Omit<User, 'password'>;
    } catch (error) {
      logger.error('Error attaching user to request', error as Error);
      // Continue without attaching user rather than failing the request
    }
  }
  
  next();
};

/**
 * Middleware to ensure a user has one of the specified roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const hasRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // First ensure the user is authenticated
    if (!req.session || !req.session.userId) {
      logger.warn('Role check failed: No authenticated user');
      return res.status(401).json({ 
        message: 'Unauthorized', 
        details: 'You must be logged in to access this resource' 
      });
    }
    
    // Then check if the user has one of the allowed roles
    const role = req.session.role;
    if (!role || !allowedRoles.includes(role)) {
      logger.warn(`Access denied: User ${req.session.userId} with role ${role} attempted restricted action. Allowed roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        message: 'Forbidden', 
        details: 'You do not have permission to access this resource' 
      });
    }
    
    // User has allowed role, continue to next middleware or route handler
    next();
  };
};

/**
 * Middleware to ensure user is a supervisor or higher role
 */
export const ensureSupervisor = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated
  if (!req.session || !req.session.userId) {
    logger.warn('Supervisor check failed: No authenticated user');
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'You must be logged in to access this resource' 
    });
  }
  
  // Then check if the user has supervisor or higher role
  const role = req.session.role;
  const allowedRoles = ['supervisor', 'admin', 'director'];
  
  if (!role || !allowedRoles.includes(role)) {
    logger.warn(`Supervisor access denied: User ${req.session.userId} with role ${role} attempted supervisor action`);
    return res.status(403).json({ 
      message: 'Forbidden', 
      details: 'You do not have permission to access this resource' 
    });
  }
  
  // Supervisor or higher, continue to next middleware or route handler
  next();
};

/**
 * Middleware to ensure user is a roving observer or higher role
 */
export const ensureRovingObserver = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated
  if (!req.session || !req.session.userId) {
    logger.warn('Roving observer check failed: No authenticated user');
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'You must be logged in to access this resource' 
    });
  }
  
  // Then check if the user has roving observer or higher role
  const role = req.session.role;
  const allowedRoles = ['roving_observer', 'supervisor', 'admin', 'director'];
  
  if (!role || !allowedRoles.includes(role)) {
    logger.warn(`Roving observer access denied: User ${req.session.userId} with role ${role} attempted roving observer action`);
    return res.status(403).json({ 
      message: 'Forbidden', 
      details: 'You do not have permission to access this resource' 
    });
  }
  
  // Roving observer or higher, continue to next middleware or route handler
  next();
};

/**
 * Middleware to ensure user is a director (highest role)
 */
export const ensureDirector = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated
  if (!req.session || !req.session.userId) {
    logger.warn('Director check failed: No authenticated user');
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'You must be logged in to access this resource' 
    });
  }
  
  // Then check if the user has director role or admin role (admin has highest permissions)
  const role = req.session.role;
  
  if (role !== 'director' && role !== 'admin') {
    logger.warn(`Director/admin access denied: User ${req.session.userId} with role ${role} attempted privileged action`);
    return res.status(403).json({ 
      message: 'Forbidden', 
      details: 'You do not have permission to access this resource' 
    });
  }
  
  // Director, continue to next middleware or route handler
  next();
};

export default {
  ensureAuthenticated,
  ensureAdmin,
  ensureSupervisor,
  ensureRovingObserver,
  ensureDirector,
  attachUser,
  hasRole
};