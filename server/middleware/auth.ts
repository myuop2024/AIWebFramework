import { Request, Response, NextFunction } from 'express';
import { Session, SessionData } from 'express-session';

// Extend the Request type to include user information from the session
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    observerId?: string;
    role?: string;
  }
}

declare module 'express' {
  interface Request {
    user?: {
      id: number;
      role: string;
      observerId?: string;
    };
  }
}

/**
 * Middleware to require authentication for routes
 * @param roles - Optional array of roles that are allowed to access the route
 */
export function requireAuth(roles: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Add user info to request for convenience
    req.user = {
      id: req.session.userId,
      role: req.session.role || 'observer',
      observerId: req.session.observerId
    };

    // If roles are specified, check if user has required role
    if (roles.length > 0 && !roles.includes(req.session.role || '')) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}