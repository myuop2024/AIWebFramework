import { apiRequest } from './queryClient';
import { toast } from '@/hooks/use-toast';

// Types for error logging
export interface ClientErrorLog {
  message: string;
  source: string;
  level?: 'error' | 'warning' | 'info';
  stack?: string;
  url?: string;
  userAgent?: string;
  code?: string;
  context?: Record<string, any>;
}

/**
 * Log client-side errors to the server
 */
export async function logClientError(error: ClientErrorLog): Promise<void> {
  try {
    // Add browser information
    const errorData = {
      ...error,
      level: error.level || 'error',
      url: error.url || window.location.href,
      userAgent: error.userAgent || navigator.userAgent
    };

    // Send error to server
    await apiRequest('POST', '/api/log-error', errorData);
    
    // Local console logging for development
    if (import.meta.env.DEV) {
      console.error('[Error logged]', errorData);
    }
  } catch (loggingError) {
    // If error logging fails, at least log to console
    console.error('[Error logger failed]', loggingError);
    console.error('[Original error]', error);
  }
}

/**
 * Initialize global error listeners
 * Call this function once in your app initialization
 */
export function initGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logClientError({
      message: `Unhandled Promise Rejection: ${event.reason?.message || 'Unknown error'}`,
      source: 'unhandled-rejection',
      stack: event.reason?.stack,
      context: { reason: event.reason }
    });
    
    // Show a user-friendly toast for unhandled rejections
    if (import.meta.env.PROD) {
      toast({
        title: 'An error occurred',
        description: 'Something went wrong. Our team has been notified.',
        variant: 'destructive',
      });
    }
  });

  // Handle runtime errors
  window.addEventListener('error', (event) => {
    // Prevent logging the same error twice
    // (Some errors trigger both error and unhandledrejection)
    if (event.error && event.error.__logged) {
      return;
    }

    logClientError({
      message: event.message || 'Runtime error',
      source: 'window-onerror',
      stack: event.error?.stack,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    });

    // Mark the error as logged to prevent duplicate logging
    if (event.error) {
      event.error.__logged = true;
    }

    // Show a user-friendly toast for runtime errors in production
    if (import.meta.env.PROD) {
      toast({
        title: 'An error occurred',
        description: 'Something went wrong. Our team has been notified.',
        variant: 'destructive',
      });
    }
  });

  // Log console errors in production
  if (import.meta.env.PROD) {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Call the original console.error
      originalConsoleError.apply(console, args);

      // Log to our error system, but avoid infinite loops
      const errorMessage = args.map(arg => 
        typeof arg === 'string' 
          ? arg 
          : (arg instanceof Error) 
            ? arg.message 
            : JSON.stringify(arg)
      ).join(' ');

      // Skip logging for errors already logged by our system
      if (!errorMessage.includes('[Error logged]') && 
          !errorMessage.includes('[Error logger failed]')) {
        logClientError({
          message: `Console error: ${errorMessage}`,
          source: 'console-error',
          level: 'error',
          context: { consoleArgs: args.map(arg => String(arg)) }
        });
      }
    };
  }
}

/**
 * Log API request errors with details
 */
export function logApiError(
  endpoint: string, 
  error: any, 
  requestData?: any
): void {
  logClientError({
    message: `API Error: ${error.message || 'Unknown error'}`,
    source: 'api-request',
    stack: error.stack,
    code: error.code || error.status?.toString(),
    context: {
      endpoint,
      requestData,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    }
  });
}