import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import logger from "../utils/logger";
import { setUserContext, clearUserContext } from "./rls-middleware";

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
        
        // Set RLS context for database operations
        await setUserContext(user.id, user.role || 'observer');
        
        logger.debug(`Attached user ${userId} to request and set RLS context`);
      } else {
        logger.warn(`User ${userId} found in session but not in database`);
        // Only clear context if we had a session but no user in DB
        await clearUserContext();
      }
    }
    // Don't clear context for every unauthenticated request - this was causing the loop
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

  // Check for traditional login session via passport
  if (req.user && (req.user as any).id) {
    // Set session data from passport user for compatibility
    if (req.session) {
      req.session.userId = (req.user as any).id.toString();
    }
    return next();
  }

  // Check for Replit Auth session
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const user = req.user as any;
    if (user.claims?.sub) {
      // Set session data from Replit auth for compatibility
      req.session.userId = user.claims.sub;
      return next();
    }
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
  try {
    let user = req.locals?.user;
    let userIdToLog = req.locals?.user?.id || req.session?.userId;

    if (!user && req.session?.userId) {
      const fetchedUser = await storage.getUser(req.session.userId);
      if (fetchedUser) {
        user = fetchedUser;
        // Optionally attach to req.locals for consistency if other local middlewares expect it
        req.locals = req.locals || {};
        req.locals.user = fetchedUser;
      }
      userIdToLog = req.session.userId;
    }

    if (!user) {
      logger.warn(`Admin check failed: No user found for ID ${userIdToLog || 'unknown'}. User must be logged in and exist in DB.`);
      return res.status(401).json({
        message: 'Unauthorized',
        details: 'You must be logged in and user data available to access this resource.',
      });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      logger.warn(`Admin access denied: User ${user.id} with role ${user.role} attempted to access admin resource`);
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
  try {
    let user = req.locals?.user;
    let userIdToLog = req.locals?.user?.id || req.session?.userId;

    if (!user && req.session?.userId) {
      const fetchedUser = await storage.getUser(req.session.userId);
      if (fetchedUser) {
        user = fetchedUser;
        req.locals = req.locals || {};
        req.locals.user = fetchedUser;
      }
      userIdToLog = req.session.userId;
    }

    if (!user) {
      logger.warn(`Supervisor check failed: No user found for ID ${userIdToLog || 'unknown'}. User must be logged in and exist in DB.`);
      return res.status(401).json({
        message: 'Unauthorized',
        details: 'You must be logged in and user data available to access this resource.',
      });
    }

    // Check if user has supervisor or admin role
    if (user.role !== 'supervisor' && user.role !== 'admin') {
      logger.warn(`Supervisor access denied: User ${user.id} with role ${user.role} attempted to access supervisor resource`);
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
  try {
    let user = req.locals?.user;
    let userIdToLog = req.locals?.user?.id || req.session?.userId;

    if (!user && req.session?.userId) {
      const fetchedUser = await storage.getUser(req.session.userId);
      if (fetchedUser) {
        user = fetchedUser;
        req.locals = req.locals || {};
        req.locals.user = fetchedUser;
      }
      userIdToLog = req.session.userId;
    }

    if (!user) {
      logger.warn(`Roving observer check failed: No user found for ID ${userIdToLog || 'unknown'}. User must be logged in and exist in DB.`);
      return res.status(401).json({
        message: 'Unauthorized',
        details: 'You must be logged in and user data available to access this resource.',
      });
    }

    // Check if user has roving_observer, supervisor, or admin role
    if (user.role !== 'roving_observer' && user.role !== 'supervisor' && user.role !== 'admin') {
      logger.warn(`Roving observer access denied: User ${user.id} with role ${user.role} attempted to access roving observer resource`);
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
    try {
      let user = req.locals?.user;
      let userIdToLog = req.locals?.user?.id || req.session?.userId;

      if (!user && req.session?.userId) {
        const fetchedUser = await storage.getUser(req.session.userId);
        if (fetchedUser) {
          user = fetchedUser;
          req.locals = req.locals || {};
          req.locals.user = fetchedUser;
        }
        userIdToLog = req.session.userId;
      }

      if (!user) {
        logger.warn(`Role check failed: No user found for ID ${userIdToLog || 'unknown'}. User must be logged in and exist in DB.`);
        return res.status(401).json({
          message: 'Unauthorized',
          details: 'You must be logged in and user data available to access this resource.',
        });
      }

      // Check if user has one of the allowed roles
      if (!user.role || !allowedRoles.includes(user.role)) {
        logger.warn(`Access denied: User ${user.id} with role ${user.role || 'none'} attempted to access resource requiring one of ${allowedRoles.join(', ')}`);
        return res.status(403).json({ 
          message: 'Forbidden', 
          details: 'You do not have permission to access this resource' 
        });
      }

      // User has required role
      next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error in hasRoleMiddleware:', err);
      return res.status(500).json({ 
        message: 'Internal Server Error', 
        details: 'An error occurred while checking permissions' 
      });
    }
  };
};

export const ensureDirector = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let user = req.locals?.user;
    let userIdToLog = req.locals?.user?.id || req.session?.userId;

    if (!user && req.session?.userId) {
      const fetchedUser = await storage.getUser(req.session.userId);
      if (fetchedUser) {
        user = fetchedUser;
        req.locals = req.locals || {};
        req.locals.user = fetchedUser;
      }
      userIdToLog = req.session.userId;
    }

    if (!user) {
      logger.warn(`Director check failed: No user found for ID ${userIdToLog || 'unknown'}. User must be logged in and exist in DB.`);
      return res.status(401).json({
        message: 'Unauthorized',
        details: 'You must be logged in and user data available to access this resource.',
      });
    }

    // Check if user has director or admin role
    if (user.role !== 'director' && user.role !== 'admin') {
      logger.warn(`Director access denied: User ${user.id} with role ${user.role} attempted to access director resource`);
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

// New hasPermission middleware factory
export const hasPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let user = req.locals?.user;
    let userIdForAuthCheck: string | number | undefined;

    if (user?.id) {
        userIdForAuthCheck = user.id;
    } else if (req.session?.userId) {
        userIdForAuthCheck = req.session.userId;
    } else if ((req.user as any)?.claims?.sub) { // Fallback for Replit Auth if session.userId not yet populated
        userIdForAuthCheck = (req.user as any).claims.sub;
    }
    // Note: ensureAuthenticated should ideally run before this and populate req.session.userId or req.locals.user

    if (!userIdForAuthCheck) {
      logger.warn('Permission check failed: No user ID found in locals, session or request context.');
      return res.status(401).json({
        message: 'Unauthorized',
        details: 'You must be logged in to perform this action.',
      });
    }

    try {
      // If user wasn't in req.locals, fetch them
      if (!user) {
        const fetchedUser = await storage.getUser(typeof userIdForAuthCheck === 'string' ? parseInt(userIdForAuthCheck) : userIdForAuthCheck);
        if (fetchedUser) {
          user = fetchedUser;
          // Optionally attach to req.locals for future middlewares in the same chain
          req.locals = req.locals || {};
          req.locals.user = fetchedUser;
        }
      }

      if (!user) {
        logger.warn(`Permission check failed: User ${userIdForAuthCheck} not found in database.`);
        return res.status(404).json({ message: 'User not found.' });
      }

      if (!user.role) {
        logger.warn(`Permission check failed: User ${user.id} has no role assigned.`);
        return res.status(403).json({
          message: 'Forbidden',
          details: 'You do not have permissions to access this resource (no role).',
        });
      }

      const roleDetails = await storage.getRoleByName(user.role);
      if (!roleDetails || !roleDetails.permissions || !Array.isArray(roleDetails.permissions)) {
        logger.warn(`Permission check failed: Role '${user.role}' for user ${user.id} not found or has no valid permissions defined.`);
        return res.status(403).json({
          message: 'Forbidden',
          details: 'You do not have permissions to access this resource (role configuration issue).',
        });
      }

      const userPermissions = roleDetails.permissions.filter(p => typeof p === 'string') as string[];
      if (!userPermissions.includes(requiredPermission)) {
        logger.warn(`Permission denied: User ${user.id} (Role: ${user.role}) lacks required permission: '${requiredPermission}'.`);
        return res.status(403).json({
          message: 'Forbidden',
          details: 'You do not have the specific permission required for this action.',
        });
      }

      // User has the required permission
      next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error in hasPermission middleware:', err);
      return res.status(500).json({
        message: 'Internal Server Error',
        details: 'An error occurred while checking permissions.',
      });
    }
  };
};

export default {
  ensureAuthenticated,
  ensureAdmin,
  ensureSupervisor,
  ensureRovingObserver,
  ensureDirector,
  attachUser,
  checkUserRole,
  hasRole: hasRoleMiddleware,
  hasPermission: hasPermission, // Added hasPermission to exports
};