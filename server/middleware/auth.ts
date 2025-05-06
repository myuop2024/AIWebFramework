import express from 'express';

// Extend the Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        observerId?: string;
      };
    }
  }
}

export function requireAuth(roles: string[] = []) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // First check if user is authenticated
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Then check roles if specified
    if (roles.length > 0) {
      const userRole = req.session.role;
      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }
    }

    // If user is authenticated and has required role (if specified), proceed
    req.user = {
      id: req.session.userId as number,
      role: req.session.role as string || 'observer',
      observerId: req.session.observerId as string | undefined
    };
    
    next();
  };
}