import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Import directly using ES modules
import { logClientError } from '@/lib/error-logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  captureContext?: Record<string, unknown>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree
 * and displays a fallback UI instead of crashing the entire app
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our error logging service
    logClientError({
      message: error.message,
      source: 'react-error-boundary',
      stack: error.stack,
      context: {
        componentStack: errorInfo.componentStack,
        ...this.props.captureContext
      }
    });
  }

  handleReset = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Card className="w-full max-w-lg mx-auto my-8">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Something went wrong
            </CardTitle>
            <CardDescription className="text-red-600">
              An error occurred while rendering this component
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm font-mono overflow-auto max-h-[200px]">
              <p className="font-semibold">{this.state.error?.name}: {this.state.error?.message}</p>
              {this.state.error?.stack && (
                <pre className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
            <p className="text-sm text-gray-600">
              This error has been automatically reported to our team.
            </p>
          </CardContent>
          <CardFooter className="bg-gray-50 gap-2">
            <Button variant="outline" onClick={this.handleReset} className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="default" onClick={() => window.location.href = '/'}>
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;