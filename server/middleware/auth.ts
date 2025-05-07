/**
 * Authentication middleware for protecting routes
 */
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { User } from '@shared/schema';

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
  if (!req.session || typeof req.session.userId !== 'number') {
    console.warn(`Authentication failed: userId is ${typeof req.session?.userId}, session exists: ${!!req.session}`);
    return res.status(401).json({ 
      message: 'Unauthorized',
      details: 'Session expired or invalid. Please log in again.'
    });
  }
  next();
};

/**
 * Middleware to ensure a user is an admin
 * Includes enhanced error handling and logging
 */
export const ensureAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || typeof req.session.userId !== 'number') {
    console.warn(`Admin authentication failed: userId is ${typeof req.session?.userId}, session exists: ${!!req.session}`);
    return res.status(401).json({ 
      message: 'Unauthorized',
      details: 'Session expired or invalid. Please log in again.'
    });
  }
  
  const userId = req.session.userId;
  
  try {
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.warn(`Admin check failed: User with ID ${userId} not found in database`);
      return res.status(403).json({ 
        message: 'Forbidden',
        details: 'User account not found. Please contact support.'
      });
    }
    
    if (user.role !== 'admin') {
      console.warn(`Admin access denied: User ${userId} has role ${user.role} instead of admin`);
      return res.status(403).json({ 
        message: 'Forbidden: Admin access required',
        details: 'Your account does not have administrator privileges.'
      });
    }
    
    // All checks passed
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

/**
 * Middleware to fetch and attach the current user to the request
 * Provides strongly typed user object
 */
export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || typeof req.session.userId !== 'number') {
    return next(); // No userId in session, skip user attachment
  }
  
  const userId = req.session.userId;
  
  try {
    const user = await storage.getUser(userId);
    
    if (user) {
      // Remove sensitive data
      const { password, ...userWithoutPassword } = user;
      
      // Attach to request object with proper typing
      req.user = userWithoutPassword;
      
      // Ensure session contains role (this syncs any role changes)
      if (req.session.role !== user.role) {
        req.session.role = user.role;
      }
      
      // Ensure session contains observerId (this syncs any observerId changes)
      if (req.session.observerId !== user.observerId) {
        req.session.observerId = user.observerId;
      }
    } else {
      // User not found in database but exists in session - potential security issue
      console.warn(`User in session not found in database: userId ${userId}`);
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying invalid session:', err);
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Error attaching user to request:', error);
    next(); // Continue without attaching user
  }
};