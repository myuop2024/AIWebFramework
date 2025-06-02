import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Global final error handler middleware
 * Logs detailed error information using logger and sends appropriate error responses to the client.
 * This should be registered AFTER database logging middleware.
 */
export function finalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Log detailed error information
  // console.error('Error caught by error handler:'); // Replaced by logger calls
  // console.error('URL:', req.originalUrl); // Covered by logger
  // console.error('Method:', req.method); // Covered by logger
  // console.error('User ID:', req.session?.userId || 'Not authenticated'); // Covered by logger
  // console.error('Error message:', err.message); // Covered by logger
  // console.error('Stack trace:', err.stack); // Covered by logger

  const statusCode = err.statusCode || err.status || 500;

  // Construct consistent log object
  const logObject = {
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.session?.userId || (req.user as any)?.id || 'unauthenticated',
    userAgent: req.headers['user-agent'],
    errorCode: err.code, // Preserve custom error code if any
  };

  // Log based on error severity using the logger utility
  if (statusCode >= 500) {
    logger.error('Final Error Handler: Server Error', logObject);
  } else { // 4xx errors
    logger.warn('Final Error Handler: Client Error', logObject);
  }

  // Send response if headers not sent already
  if (res.headersSent) {
    // If headers already sent, delegate to the default Express error handler
    // which closes the connection and fails the request.
    return _next(err);
  }

  res.status(statusCode).json({
    message: err.message || (statusCode >= 500 ? 'Internal Server Error' : 'Client Error'),
    errorCode: err.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'CLIENT_ERROR'),
    timestamp: new Date().toISOString()
    // Stack trace inclusion can be decided by logger configuration or environment,
    // but generally not sent to client in production for security.
    // For development, it's in the logObject.
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
  finalErrorHandler, // Renamed from errorHandler
  requestLogger,
  asyncHandler
};