import { db } from '../db';
import { errorLogs, type InsertErrorLog } from '@shared/schema';
import { Request } from 'express';

/**
 * ErrorLogger service for handling server-side error logging
 * Provides methods to log errors to console and database
 */
export class ErrorLogger {
  /**
   * Log an error with context to console and optionally to database
   */
  static async logError(options: {
    message: string;
    source: string;
    level?: 'error' | 'warning' | 'info';
    error?: Error;
    userId?: number;
    request?: Request;
    context?: Record<string, any>;
    saveToDb?: boolean;
  }) {
    const {
      message,
      source,
      level = 'error',
      error,
      userId,
      request,
      context = {},
      saveToDb = true
    } = options;

    // Extract additional info from request if available
    const requestInfo = request ? {
      url: request.originalUrl || request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      path: request.path
    } : {};

    // Format the error for console logging
    const logData = {
      timestamp: new Date().toISOString(),
      message,
      level,
      source,
      userId,
      ...requestInfo,
      ...(error && { 
        errorName: error.name,
        stack: error.stack 
      }),
      context
    };

    // Console logging based on level
    switch (level) {
      case 'error':
        console.error('[ERROR]', JSON.stringify(logData, null, 2));
        break;
      case 'warning':
        console.warn('[WARNING]', JSON.stringify(logData, null, 2));
        break;
      case 'info':
      default:
        console.info('[INFO]', JSON.stringify(logData, null, 2));
    }

    // Save to database if option is enabled
    if (saveToDb) {
      try {
        const errorData: InsertErrorLog = {
          userId: userId || null,
          source,
          level,
          message,
          code: error?.name || null,
          stack: error?.stack || null,
          url: requestInfo.url || null,
          userAgent: requestInfo.userAgent || null,
          path: requestInfo.path || null,
          method: requestInfo.method || null,
          context: context ? context : null
        };

        await db.insert(errorLogs).values(errorData);
      } catch (dbError) {
        // Don't let database errors prevent application operation
        console.error('[ERROR LOGGER] Failed to save error to database:', dbError);
      }
    }

    return logData;
  }

  /**
   * Create a middleware to catch and log Express errors
   */
  static createErrorMiddleware() {
    return async (err: any, req: Request, res: any, next: any) => {
      await ErrorLogger.logError({
        message: err.message || 'Internal server error',
        source: 'express',
        error: err,
        userId: req.user?.id,
        request: req,
        context: { 
          body: req.body,
          params: req.params,
          query: req.query
        }
      });

      // Pass to next error handler
      next(err);
    };
  }

  /**
   * Log errors from WebSockets
   */
  static logSocketError(error: Error, socketId: string, userId?: number) {
    return this.logError({
      message: error.message,
      source: 'websocket',
      error,
      userId,
      context: { socketId }
    });
  }

  /**
   * Log errors from WebRTC
   */
  static logWebRtcError(error: Error, peerId: string, userId?: number) {
    return this.logError({
      message: error.message,
      source: 'webrtc',
      error,
      userId,
      context: { peerId }
    });
  }
}

export default ErrorLogger;