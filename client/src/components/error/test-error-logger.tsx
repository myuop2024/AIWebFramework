import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Bug, Server, Terminal } from 'lucide-react';
import { logClientError } from '@/lib/error-logger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';

/**
 * Test component for error logging system
 * This component allows developers to trigger various types of errors
 * to test the error logging system
 */
export function TestErrorLogger() {
  const [clientResult, setClientResult] = useState<{ success?: boolean; error?: string }>({});
  const [serverResult, setServerResult] = useState<{ success?: boolean; error?: string }>({});
  const [customMessage, setCustomMessage] = useState('Test error message');

  // Function to trigger client-side error log
  const triggerClientError = () => {
    try {
      setClientResult({ success: undefined, error: undefined });
      
      logClientError({
        message: customMessage || 'Test client error',
        source: 'test-component',
        level: 'error',
        context: {
          testData: 'This is test data',
          timestamp: new Date().toISOString()
        }
      });
      
      setClientResult({ success: true });
    } catch (error) {
      setClientResult({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  };

  // Function to trigger runtime error
  const triggerRuntimeError = () => {
    try {
      // This will cause a TypeError - intentional error for testing
      // @ts-ignore - Deliberately causing a runtime error
      const obj = null;
      // @ts-ignore - TypeScript will warn about this, but we want the runtime error for testing
      obj?.nonExistentMethod();
    } catch (error) {
      // In real scenarios, this would be caught by the global handler
      // but for testing we'll log it manually
      logClientError({
        message: error instanceof Error ? error.message : 'Unknown error',
        source: 'test-runtime-error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      setClientResult({ 
        success: true, 
        error: 'Runtime error was caught and logged'
      });
    }
  };

  // Function to trigger async error
  const triggerAsyncError = () => {
    // This creates a promise that will reject
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Test async error'));
      }, 100);
    });
    
    setClientResult({ 
      success: true, 
      error: 'Async error triggered - check console and server logs'
    });
  };

  // Function to trigger server-side error via API
  const triggerServerError = async () => {
    try {
      setServerResult({ success: undefined, error: undefined });
      
      await apiRequest('GET', '/api/log-error/test');
      
      // This shouldn't be reached as the endpoint throws an error
      setServerResult({ 
        success: false, 
        error: 'Server did not return an error as expected' 
      });
    } catch (error) {
      // This is expected - the endpoint should throw
      setServerResult({ 
        success: true, 
        error: 'Server error was triggered successfully'
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bug className="mr-2 h-5 w-5" />
          Error Logger Testing Tool
        </CardTitle>
        <CardDescription>
          Test the error logging system by triggering different types of errors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="client">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client">Client Errors</TabsTrigger>
            <TabsTrigger value="server">Server Errors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="client" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-message">Custom Error Message</Label>
              <Input
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter a custom error message"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button onClick={triggerClientError} variant="outline" className="flex items-center">
                <Terminal className="mr-2 h-4 w-4" />
                Log Client Error
              </Button>
              
              <Button onClick={triggerRuntimeError} variant="outline" className="flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Trigger Runtime Error
              </Button>
              
              <Button onClick={triggerAsyncError} variant="outline" className="flex items-center">
                <Terminal className="mr-2 h-4 w-4" />
                Trigger Async Error
              </Button>
            </div>
            
            {clientResult.success !== undefined && (
              <Alert variant={clientResult.success ? "default" : "destructive"}>
                <AlertTitle>{clientResult.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>
                  {clientResult.success
                    ? "Client error logged successfully"
                    : `Failed to log client error: ${clientResult.error}`}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="server" className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={triggerServerError} variant="outline" className="flex items-center">
                <Server className="mr-2 h-4 w-4" />
                Trigger Server Error
              </Button>
            </div>
            
            {serverResult.success !== undefined && (
              <Alert variant={serverResult.success ? "default" : "destructive"}>
                <AlertTitle>{serverResult.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>
                  {serverResult.error || (serverResult.success 
                    ? "Server error logged successfully" 
                    : "Failed to log server error")}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-gray-500">
        <span>Check server console and database for error logs</span>
      </CardFooter>
    </Card>
  );
}

export default TestErrorLogger;