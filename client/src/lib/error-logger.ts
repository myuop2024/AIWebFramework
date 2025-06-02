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
 * Sanitizes an object to remove or mask sensitive fields.
 */
function sanitizeObject(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'secret',
    'twoFactorSecret',
    'recoveryCodes',
    'trn',
    'idNumber',
    'bankAccount',
    'creditCard',
    'cvv',
    'ssn',
    'passportNumber'
    // Add other PII or sensitive keys that might appear in requestData
  ];

  const sanitizedData = { ...data };

  for (const key of sensitiveKeys) {
    if (sanitizedData.hasOwnProperty(key)) {
      sanitizedData[key] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects if necessary
  // For simplicity, this example only sanitizes top-level keys in the `requestData` context.
  // A more robust solution might involve deeper inspection or a more generic recursive sanitizer.
  if (sanitizedData.user && typeof sanitizedData.user === 'object') {
    sanitizedData.user = sanitizeObject(sanitizedData.user);
  }
   if (sanitizedData.profile && typeof sanitizedData.profile === 'object') {
    sanitizedData.profile = sanitizeObject(sanitizedData.profile);
  }
  // If requestData itself is an object that might contain sensitive fields directly:
  // Object.keys(sanitizedData).forEach(key => {
  //   if (sensitiveKeys.includes(key) && sanitizedData[key]) {
  //     sanitizedData[key] = '[REDACTED]';
  //   }
  // });


  return sanitizedData;
}

/**
 * Log client-side errors to the server
 */
export async function logClientError(error: ClientErrorLog): Promise<void> {
  try {
    // Add browser information and sanitize context
    const errorData = {
      ...error,
      level: error.level || 'error',
      url: error.url || window.location.href,
      userAgent: error.userAgent || navigator.userAgent,
      context: error.context ? sanitizeObject(error.context) : undefined,
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
    // Prevent default browser behavior
    event.preventDefault();

    logClientError({
      message: `Unhandled Promise Rejection: ${event.reason?.message || 'Unknown error'}`,
      source: 'unhandled-rejection',
      stack: event.reason?.stack,
      context: { reason: event.reason }
    });

    // Show a user-friendly toast for unhandled rejections
    if (import.meta.env.PROD) {
      import('../hooks/use-toast').then(({ toast }) => {
        toast({
          title: 'An error occurred',
          description: 'Something went wrong. Our team has been notified.',
          variant: 'destructive',
        });
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
  // Sanitize requestData before logging
  const sanitizedRequestData = requestData ? sanitizeObject(requestData) : undefined;

  logClientError({
    message: `API Error: ${error.message || 'Unknown error'}`,
    source: 'api-request',
    stack: error.stack,
    code: error.code || error.status?.toString(),
    context: {
      endpoint,
      requestData: sanitizedRequestData, // Use sanitized requestData
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    }
  });
}

export const logError = async (error: string | Error, context: ErrorContext = {}) => {
  try {
    const errorData = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      level: context.level || 'error',
      source: context.source || 'client',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      context
    };

    // Log to console for development
    console.log('[Error logged]', errorData);

    // Send to server
    await fetch('/api/error-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
};