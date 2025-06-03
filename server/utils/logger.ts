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

// Ensure log directory exists
if (!isProduction) {
  logger.add(new transports.Console({
    format: format.combine(format.colorize(), format.simple())
  }));
}

// Log severity levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Format a log entry with timestamp and metadata
 */
function formatLogEntry(level: LogLevel, message: string, metadata: Record<string, any> = {}): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message} ${JSON.stringify(metadata)}\n`;
}

/**
 * Log to file with appropriate formatting
 */
function logToFile(filePath: string, level: LogLevel, message: string, metadata: Record<string, any> = {}): void {
  try {
    const logEntry = formatLogEntry(level, message, metadata);
    logger.info(logEntry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
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
  if (!isProduction) {
    console.debug(`[DEBUG] ${message}`, metadata);
  }
  logToFile(SYSTEM_LOG_PATH, LogLevel.DEBUG, message, metadata);
}

/**
 * Log informational message
 */
export function info(message: string, metadata: Record<string, any> = {}): void {
  console.info(`[INFO] ${message}`, metadata);
  logToFile(SYSTEM_LOG_PATH, LogLevel.INFO, message, metadata);
}

/**
 * Log warning message
 */
export function warn(message: string, metadata: Record<string, any> = {}): void {
  console.warn(`[WARN] ${message}`, metadata);
  logToFile(SYSTEM_LOG_PATH, LogLevel.WARN, message, metadata);
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

  console.error(`[ERROR] ${message}`, errorData);
  logToFile(ERROR_LOG_PATH, LogLevel.ERROR, message, errorData);
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

  console.error(`[CRITICAL] ${message}`, errorData);
  logToFile(ERROR_LOG_PATH, LogLevel.CRITICAL, message, errorData);
  
  // Also log to system log for easier correlation
  logToFile(SYSTEM_LOG_PATH, LogLevel.CRITICAL, message, { errorRef: new Date().getTime() });
}

/**
 * Log API request details
 */
export function logApiRequest(req: Request, statusCode: number, responseTime: number): void {
  const info = getRequestInfo(req);
  
  logToFile(ACCESS_LOG_PATH, LogLevel.INFO, 'API Request', {
    ...info,
    statusCode,
    responseTime: `${responseTime}ms`
  });
}

export default logger;