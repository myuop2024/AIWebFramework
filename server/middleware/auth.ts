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
    logger.error('Authentication error: userId exists but is not a number', {
      sessionUserId: req.session.userId,
      typeOfUserId: typeof req.session.userId
    });
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
  if (role !== 'admin') {
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

export default {
  ensureAuthenticated,
  ensureAdmin,
  attachUser
};