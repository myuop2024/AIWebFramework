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

    // Sanitize context if it contains request body, params, or query
    let sanitizedContext = context;
    if (context && (context.body || context.params || context.query)) {
      sanitizedContext = {
        ...context,
        ...(context.body && { body: ErrorLogger.sanitizeRequestBody(context.body) }),
        ...(context.params && { params: ErrorLogger.sanitizeRequestParams(context.params) }),
        ...(context.query && { query: ErrorLogger.sanitizeRequestQuery(context.query) }),
      };
    }

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
      context: sanitizedContext // Use sanitized context
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
          source: source || 'unknown', // Ensure source is never null
          level,
          message,
          code: error?.name || null,
          stack: error?.stack || null,
          url: requestInfo.url || null,
          userAgent: requestInfo.userAgent || null,
          path: requestInfo.path || null,
          method: requestInfo.method || null,
          context: sanitizedContext || null // Use sanitized context
        } as any;

        await db.insert(errorLogs).values(errorData as any);
      } catch (dbError) {
        // Don't let database errors prevent application operation
        console.error('[ERROR LOGGER] Failed to save error to database:', dbError);
        // Log to file as fallback if database fails
        try {
          const { appendFileSync } = await import('fs');
          const logEntry = JSON.stringify({ ...logData, dbError: dbError.message }) + '\n';
          appendFileSync('error-fallback.log', logEntry);
        } catch (fileError) {
          console.error('[ERROR LOGGER] Also failed to write to fallback log:', fileError);
        }
      }
    }

    return logData;
  }

  /**
   * Create a middleware to catch and log Express errors
   */
  static createErrorMiddleware() {
    return async (err: any, req: Request, res: any, next: any) => {
      // The body, params, query will be sanitized by the logError method.
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

  /**
   * Sanitizes a request body to remove or mask sensitive fields.
   */
  static sanitizeRequestBody(body: any): any {
    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sensitiveKeys = [
      'password',
      'currentPassword',
      'newPassword',
      'token',
      'secret',
      'twoFactorSecret',
      'recoveryCodes',
      'trn', // Tax Registration Number
      'idNumber', // Generic ID number
      'bankAccount',
      // Add other PII or sensitive keys as needed
      'creditCard',
      'cvv',
      'ssn',
      'passportNumber'
    ];

    const sanitizedBody = { ...body };

    for (const key of sensitiveKeys) {
      if (sanitizedBody.hasOwnProperty(key)) {
        sanitizedBody[key] = '[REDACTED]';
      }
    }

    // Example for nested objects, can be made more recursive if needed
    if (sanitizedBody.user && typeof sanitizedBody.user === 'object') {
        sanitizedBody.user = ErrorLogger.sanitizeRequestBody(sanitizedBody.user);
    }
    if (sanitizedBody.profile && typeof sanitizedBody.profile === 'object') {
        sanitizedBody.profile = ErrorLogger.sanitizeRequestBody(sanitizedBody.profile);
    }

    return sanitizedBody;
  }

  /**
   * Sanitizes request parameters (e.g., from req.params).
   */
  static sanitizeRequestParams(params: any): any {
    if (typeof params !== 'object' || params === null) {
      return params;
    }
    const sensitiveKeys = ['userId', 'email', 'token', 'observerId', 'stationId', 'reportId', 'assignmentId']; // Add others if they appear in paths
    const sanitizedParams = { ...params };
    for (const key of sensitiveKeys) {
      if (sanitizedParams.hasOwnProperty(key)) {
        // Params are often IDs or simple strings, redacting might obscure too much.
        // Consider if partial redaction or type checking is needed.
        // For now, simple redaction for consistency.
        sanitizedParams[key] = '[REDACTED_PARAM]';
      }
    }
    return sanitizedParams;
  }

  /**
   * Sanitizes request query parameters (e.g., from req.query).
   */
  static sanitizeRequestQuery(query: any): any {
    if (typeof query !== 'object' || query === null) {
      return query;
    }
    const sensitiveKeys = ['token', 'apiKey', 'signature', 'email', 'search', 'q', 'userId']; // Common sensitive query params
    const sanitizedQuery = { ...query };
    for (const key of sensitiveKeys) {
      if (sanitizedQuery.hasOwnProperty(key)) {
        sanitizedQuery[key] = '[REDACTED_QUERY]';
      }
    }
    return sanitizedQuery;
  }
}

export default ErrorLogger;