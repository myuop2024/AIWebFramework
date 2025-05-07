/**
 * Error monitoring middleware for the CAFFE Observer Platform
 * Provides request tracking, error logging, and response time monitoring
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to log all API requests with timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Skip non-API requests
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }
  
  // Record request start time
  const startTime = Date.now();
  
  // Capture original end method to add timing
  const originalEnd = res.end;
  
  // Override end method to calculate and log response time
  res.end = function(...args: any[]): Response {
    const responseTime = Date.now() - startTime;
    
    // Log request with timing
    logger.logApiRequest(req, res.statusCode, responseTime);
    
    // Log slow requests
    if (responseTime > 500) {
      logger.warn('Slow API request', {
        ...logger.getRequestInfo(req),
        responseTime: `${responseTime}ms`,
        threshold: '500ms'
      });
    }
    
    // Call original end method with proper type handling
    return originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Middleware to handle and log uncaught errors
 */
export function errorMonitor(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || err.status || 500;
  const requestInfo = logger.getRequestInfo(req);
  
  // Log based on error severity
  if (statusCode >= 500) {
    logger.error('Server error in API request', err, requestInfo);
  } else if (statusCode >= 400) {
    logger.warn('Client error in API request', { 
      message: err.message,
      stack: err.stack,
      ...requestInfo 
    });
  }
  
  // Format error response
  const errorResponse = {
    message: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    (errorResponse as any).stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Middleware to catch unhandled promise rejections in async route handlers
 */
export function asyncErrorHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  requestLogger,
  errorMonitor,
  asyncErrorHandler
};