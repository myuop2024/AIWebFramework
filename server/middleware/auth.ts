import { Request, Response, NextFunction } from 'express';
import type { Session, SessionData } from 'express-session';

// Add session type declarations
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: string;
    observerId?: string;
  }
}

// Middleware to check if user is logged in
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  next();
};

// Middleware to check if user is an admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  if (req.session.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden - Admin access required' });
    return;
  }
  
  next();
};