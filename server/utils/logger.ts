/**
 * Central logging utility for the CAFFE Observer Platform
 * Provides consistent logging and error tracking functionality
 */

import fs from 'fs';
import path from 'path';
import { Request } from 'express';

// Configure log directories
const LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');
const ACCESS_LOG_PATH = path.join(LOG_DIR, 'access.log');
const SYSTEM_LOG_PATH = path.join(LOG_DIR, 'system.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`Created log directory at ${LOG_DIR}`);
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
    fs.appendFileSync(filePath, logEntry);
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
  if (process.env.NODE_ENV !== 'production') {
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

export default {
  debug,
  info,
  warn,
  error,
  critical,
  logApiRequest,
  getRequestInfo
};
