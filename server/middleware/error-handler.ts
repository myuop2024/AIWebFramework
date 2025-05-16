
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Global error handler middleware
 * Logs detailed error information to console and returns appropriate error responses
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Log detailed error information
  console.error('Error caught by error handler:');
  console.error('URL:', req.originalUrl);
  console.error('Method:', req.method);
  console.error('User ID:', req.session?.userId || 'Not authenticated');
  console.error('Error message:', err.message);
  console.error('Stack trace:', err.stack);
  
  // Get request info for logging
  const requestInfo = {
    url: req.originalUrl,
    method: req.method,
    userId: req.session?.userId,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  };
  
  // Set appropriate status code
  const statusCode = err.statusCode || err.status || 500;
  
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
  
  // Return error response
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    errorCode: err.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

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
  
  // Add response listener instead of wrapping the end method
  res.on('finish', () => {
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
  });
  
  next();
}

/**
 * Creates a middleware that wraps an async route handler in a try/catch
 * and passes any errors to the next middleware (error handler)
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  errorHandler,
  requestLogger,
  asyncHandler
};
