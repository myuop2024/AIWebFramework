/**
 * Authentication middleware for protecting routes
 */
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware to ensure a user is authenticated
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

/**
 * Middleware to ensure a user is an admin
 */
export const ensureAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to fetch and attach the current user to the request
 */
export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session?.userId;
  
  if (!userId) {
    return next();
  }
  
  try {
    const user = await storage.getUser(userId);
    
    if (user) {
      // Remove sensitive data
      const { password, ...userWithoutPassword } = user;
      
      // Attach to request object
      req.user = userWithoutPassword;
    }
    
    next();
  } catch (error) {
    console.error('Error fetching user:', error);
    next();
  }
};

// Extend the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}