import { Request, Response, NextFunction } from 'express';

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
  
  // Set appropriate status code
  const statusCode = err.statusCode || err.status || 500;
  
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
 * Creates a middleware that wraps an async route handler in a try/catch
 * and passes any errors to the next middleware (error handler)
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}