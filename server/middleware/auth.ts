import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import logger from "../utils/logger";

// Add type declaration to modify the Request type
declare global {
  namespace Express {
    interface Request {
      locals?: {
        user?: any;
      };
      user?: any;
      isAuthenticated?: () => boolean;
    }
  }
}

/**
 * Middleware to attach user to the request
 * Uses req.user.claims.sub from Replit Auth if it exists
 */
export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user && (req.user as any).claims?.sub) {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);

      if (user) {
        // Store user directly in request for easy access
        req.locals = req.locals || {};
        req.locals.user = user;
        logger.debug(`Attached user ${userId} to request`);
      } else {
        logger.warn(`User ${userId} found in session but not in database`);
      }
    }
    next();
  } catch (error) {
    logger.error("Error attaching user to request", error);
    next();
  }
};

/**
 * Middleware to ensure user is authenticated
 * This is a utility middleware that can be used in addition to 
 * the Replit Auth isAuthenticated middleware
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check session first
  if (req.session && req.session.userId) {
    return next();
  }

  // Check for user data from Replit auth headers
  const replitUserId = req.headers['x-replit-user-id'];
  const replitUserName = req.headers['x-replit-user-name'];

  if (replitUserId && replitUserName) {
    // Set session data from Replit auth
    req.session.userId = replitUserId as string;
    req.session.username = replitUserName as string;
    return next();
  }

  res.status(401).json({ message: 'Unauthorized - Please log in' });
};

/**
 * Middleware to ensure user has admin role
 */
export const ensureAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    logger.warn('Admin check failed: No authenticated user');
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'You must be logged in to access this resource' 
    });
  }

  try {
    // Get user ID from Replit Auth session
    const userId = (req.user as any).claims?.sub;

    if (!userId) {
      logger.warn('Admin check failed: No user ID in session');
      return res.status(401).json({ 
        message: 'Unauthorized', 
        details: 'Invalid session, please login again' 
      });
    }

    // Get user from database
    const user = await storage.getUser(userId);

    if (!user) {
      logger.warn(`Admin check failed: User ${userId} not found in database`);
      return res.status(404).json({ 
        message: 'Not Found', 
        details: 'User not found' 
      });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      logger.warn(`Admin access denied: User ${userId} with role ${user.role} attempted to access admin resource`);
      return res.status(403).json({ 
        message: 'Forbidden', 
        details: 'You do not have permission to access this resource' 
      });
    }

    // User is an admin, continue to next middleware or route handler
    next();
  } catch (error) {
    logger.error('Error in admin authorization middleware', error);
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      details: 'An error occurred while checking permissions' 
    });
  }
};

/**
 * Middleware to ensure user has supervisor role or higher
 */
export const ensureSupervisor = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    logger.warn('Supervisor check failed: No authenticated user');
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'You must be logged in to access this resource' 
    });
  }

  try {
    // Get user ID from Replit Auth session
    const userId = (req.user as any).claims?.sub;

    if (!userId) {
      logger.warn('Supervisor check failed: No user ID in session');
      return res.status(401).json({ 
        message: 'Unauthorized', 
        details: 'Invalid session, please login again' 
      });
    }

    // Get user from database
    const user = await storage.getUser(userId);

    if (!user) {
      logger.warn(`Supervisor check failed: User ${userId} not found in database`);
      return res.status(404).json({ 
        message: 'Not Found', 
        details: 'User not found' 
      });
    }

    // Check if user has supervisor or admin role
    if (user.role !== 'supervisor' && user.role !== 'admin') {
      logger.warn(`Supervisor access denied: User ${userId} with role ${user.role} attempted to access supervisor resource`);
      return res.status(403).json({ 
        message: 'Forbidden', 
        details: 'You do not have permission to access this resource' 
      });
    }

    // User is a supervisor, continue to next middleware or route handler
    next();
  } catch (error) {
    logger.error('Error in supervisor authorization middleware', error);
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      details: 'An error occurred while checking permissions' 
    });
  }
};

/**
 * Middleware to ensure user has roving observer role or higher
 */
export const ensureRovingObserver = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    logger.warn('Roving observer check failed: No authenticated user');
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'You must be logged in to access this resource' 
    });
  }

  try {
    // Get user ID from Replit Auth session
    const userId = (req.user as any).claims?.sub;

    if (!userId) {
      logger.warn('Roving observer check failed: No user ID in session');
      return res.status(401).json({ 
        message: 'Unauthorized', 
        details: 'Invalid session, please login again' 
      });
    }

    // Get user from database
    const user = await storage.getUser(userId);

    if (!user) {
      logger.warn(`Roving observer check failed: User ${userId} not found in database`);
      return res.status(404).json({ 
        message: 'Not Found', 
        details: 'User not found' 
      });
    }

    // Check if user has roving_observer, supervisor, or admin role
    if (user.role !== 'roving_observer' && user.role !== 'supervisor' && user.role !== 'admin') {
      logger.warn(`Roving observer access denied: User ${userId} with role ${user.role} attempted to access roving observer resource`);
      return res.status(403).json({ 
        message: 'Forbidden', 
        details: 'You do not have permission to access this resource' 
      });
    }

    // User is a roving observer, continue to next middleware or route handler
    next();
  } catch (error) {
    logger.error('Error in roving observer authorization middleware', error);
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      details: 'An error occurred while checking permissions' 
    });
  }
};

/**
 * Middleware to ensure user is a director (highest role)
 */
/**
 * Middleware factory to check if user has one of the specified roles
 * @param allowedRoles Array of roles that are allowed to access the resource
 * @returns Express middleware function
 */
export const hasRoleMiddleware = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First ensure the user is authenticated
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      logger.warn('Role check failed: No authenticated user');
      return res.status(401).json({ 
        message: 'Unauthorized', 
        details: 'You must be logged in to access this resource' 
      });
    }

    try {
      // Get user ID from Replit Auth session
      const userId = (req.user as any).claims?.sub;

      if (!userId) {
        logger.warn('Role check failed: No user ID in session');
        return res.status(401).json({ 
          message: 'Unauthorized', 
          details: 'Invalid session, please login again' 
        });
      }

      // Get user from database
      const user = await storage.getUser(userId);

      if (!user) {
        logger.warn(`Role check failed: User ${userId} not found in database`);
        return res.status(404).json({ 
          message: 'Not Found', 
          details: 'User not found' 
        });
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(user.role)) {
        logger.warn(`Access denied: User ${userId} with role ${user.role} attempted to access resource requiring one of ${allowedRoles.join(', ')}`);
        return res.status(403).json({ 
          message: 'Forbidden', 
          details: 'You do not have permission to access this resource' 
        });
      }

      // User has required role, attach user to request and continue
      req.locals = req.locals || {};
      req.locals.user = user;
      next();
    } catch (error) {
      logger.error('Error in role middleware:', error);
      return res.status(500).json({ 
        message: 'Internal Server Error', 
        details: 'An error occurred while checking permissions' 
      });
    }
  };
};

export const ensureDirector = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    logger.warn('Director check failed: No authenticated user');
    return res.status(401).json({ 
      message: 'Unauthorized', 
      details: 'You must be logged in to access this resource' 
    });
  }

  try {
    // Get user ID from Replit Auth session
    const userId = (req.user as any).claims?.sub;

    if (!userId) {
      logger.warn('Director check failed: No user ID in session');
      return res.status(401).json({ 
        message: 'Unauthorized', 
        details: 'Invalid session, please login again' 
      });
    }

    // Get user from database
    const user = await storage.getUser(userId);

    if (!user) {
      logger.warn(`Director check failed: User ${userId} not found in database`);
      return res.status(404).json({ 
        message: 'Not Found', 
        details: 'User not found' 
      });
    }

    // Check if user has director or admin role
    if (user.role !== 'director' && user.role !== 'admin') {
      logger.warn(`Director access denied: User ${userId} with role ${user.role} attempted to access director resource`);
      return res.status(403).json({ 
        message: 'Forbidden', 
        details: 'You do not have permission to access this resource' 
      });
    }

    // User is a director, continue to next middleware or route handler
    next();
  } catch (error) {
    logger.error('Error in director authorization middleware', error);
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      details: 'An error occurred while checking permissions' 
    });
  }
};

/**
 * Utility function to check if a user has a specific role
 */
export const checkUserRole = (user: any, roles: string | string[]): boolean => {
  if (!user || !user.role) return false;

  if (Array.isArray(roles)) {
    return roles.includes(user.role);
  }

  return user.role === roles;
};

export default {
  ensureAuthenticated,
  ensureAdmin,
  ensureSupervisor,
  ensureRovingObserver,
  ensureDirector,
  attachUser,
  checkUserRole,
  hasRole: hasRoleMiddleware
};