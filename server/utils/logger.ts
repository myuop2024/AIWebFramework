/**
 * Central logging utility for the CAFFE Observer Platform
 * Provides consistent logging and error tracking functionality
 */

import { createLogger, format, transports } from 'winston';
import { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: isProduction
        ? format.combine(format.timestamp(), format.json())
        : format.combine(format.colorize(), format.simple())
    }),
    ...(isProduction
      ? [
          new transports.File({ filename: 'logs/error.log', level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' })
        ]
      : [])
  ],
  exitOnError: false,
});

// Configure log directories
const LOG_DIR = 'logs';
const ERROR_LOG_PATH = 'logs/error.log';
const ACCESS_LOG_PATH = 'logs/access.log';
const SYSTEM_LOG_PATH = 'logs/system.log';

// Log severity levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}



/**
 * Extract useful information from request object for logging
 */
export function getRequestInfo(req: Request): Record<string, any> {
  return {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.session?.userId || 'unauthenticated',
    observerId: req.session?.observerId || 'unknown',
    userAgent: req.headers['user-agent']
  };
}

/**
 * Log debug message
 */
export function debug(message: string, metadata: Record<string, any> = {}): void {
  logger.debug(message, metadata);
}

/**
 * Log informational message
 */
export function info(message: string, metadata: Record<string, any> = {}): void {
  logger.info(message, metadata);
}

/**
 * Log warning message
 */
export function warn(message: string, metadata: Record<string, any> = {}): void {
  logger.warn(message, metadata);
}

/**
 * Log error message
 */
export function error(message: string, err?: Error, metadata: Record<string, any> = {}): void {
  // Combine error information with metadata
  const errorData = err ? {
    ...metadata,
    errorMessage: err.message,
    stack: err.stack,
    name: err.name
  } : metadata;

  logger.error(message, errorData);
}

/**
 * Log critical error message
 */
export function critical(message: string, err?: Error, metadata: Record<string, any> = {}): void {
  // Combine error information with metadata
  const errorData = err ? {
    ...metadata,
    errorMessage: err.message,
    stack: err.stack,
    name: err.name
  } : metadata;

  logger.error(`[CRITICAL] ${message}`, errorData);
}

/**
 * Log API request details
 */
export function logApiRequest(req: Request, statusCode: number, responseTime: number): void {
  const info = getRequestInfo(req);
  
  logger.info('API Request', {
    ...info,
    statusCode,
    responseTime: `${responseTime}ms`
  });
}

export default logger;