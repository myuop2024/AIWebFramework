import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    username?: string;
  };
}

/**
 * Middleware to set RLS context for authenticated requests
 */
export const setRLSContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // If user is authenticated, set the RLS context
    if (req.user?.id && req.user?.role) {
      await db.execute(
        sql`SELECT auth.set_user_context(${req.user.id}, ${req.user.role})`
      );
    } else {
      // Clear any existing context for unauthenticated requests
      await db.execute(sql`SELECT set_config('app.current_user_id', '', true)`);
      await db.execute(sql`SELECT set_config('app.current_user_role', '', true)`);
    }
    
    next();
  } catch (error) {
    console.error('Error setting RLS context:', error);
    // Continue even if RLS context setting fails
    next();
  }
};

/**
 * Utility function to manually set user context for specific operations
 */
export const setUserContext = async (userId: number, userRole: string) => {
  await db.execute(sql`SELECT auth.set_user_context(${userId}, ${userRole})`);
};

/**
 * Utility function to clear user context
 */
export const clearUserContext = async () => {
  await db.execute(sql`SELECT set_config('app.current_user_id', '', true)`);
  await db.execute(sql`SELECT set_config('app.current_user_role', '', true)`);
};