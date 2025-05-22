import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Key, Globe, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";

// Define form schema for Didit settings
const diditSettingsSchema = z.object({
  apiKey: z.string().min(1, {
    message: "API Key is required.",
  }),
  apiSecret: z.string().min(1, {
    message: "API Secret is required.",
  }),
  baseUrl: z.string().url({
    message: "Base URL must be a valid URL.",
  }),
  enabled: z.boolean(),
});

type DiditSettingsFormValues = z.infer<typeof diditSettingsSchema>;

export default function DiditSettingsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Define interface for Didit settings response
  interface DiditSettings {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
    enabled: boolean;
  }
  
  // Fetch current Didit settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery<DiditSettings>({
    queryKey: ['/api/verification/admin/settings'],
  });

  // Form setup
  const form = useForm<DiditSettingsFormValues>({
    resolver: zodResolver(diditSettingsSchema),
    defaultValues: {
      apiKey: '',
      apiSecret: '',
      baseUrl: process.env.NEXT_PUBLIC_DIDIT_API_URL || 'https://api.didit.me/v1',
      enabled: false,
    },
    values: settings ? {
      apiKey: settings.apiKey || '',
      apiSecret: settings.apiSecret || '',
      baseUrl: settings.baseUrl || process.env.NEXT_PUBLIC_DIDIT_API_URL || 'https://api.didit.me/v1',
      enabled: settings.enabled || false,
    } : undefined,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (values: DiditSettingsFormValues) => {
      const response = await fetch('/api/verification/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save Didit settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Didit integration settings have been updated successfully.',
        variant: 'default',
        className: 'bg-green-600 text-white',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/verification/admin/settings'] });
    },
    onError: (error) => {
      toast({
        title: 'Error Saving Settings',
        description: error.message || 'There was an error saving Didit integration settings.',
        variant: 'destructive',
      });
    },
  });

  // Test connection
  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      // Use current form values, not the saved settings
      const formValues = form.getValues();
      
      // Call test endpoint
      const response = await fetch('/api/verification/admin/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formValues),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Connection successful! Didit API credentials are valid.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed. Please check your API credentials.',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed due to an unexpected error.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handle form submission
  const onSubmit = (values: DiditSettingsFormValues) => {
    saveSettingsMutation.mutate(values);
  };

  if (isLoadingSettings) {
    return (
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="mr-2 h-5 w-5" /> Didit.me Integration Settings
          </CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <RefreshCw className="animate-spin h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Fingerprint className="mr-2 h-5 w-5" /> Didit.me Integration Settings
        </CardTitle>
        <CardDescription>Configure the Didit.me identity verification service integration</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="info">Integration Guide</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Didit Integration
                          </FormLabel>
                          <FormDescription>
                            Turn on to allow users to verify their identity through Didit.me
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
                              placeholder="Enter Didit API Key" 
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Your Didit.me API key from your account dashboard
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
                              type="password"
                              placeholder={field.value === '********' ? 'Leave unchanged to keep current secret' : 'Enter Didit API Secret'}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Your Didit.me API secret from your account dashboard
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="baseUrl" className="flex items-center">
                          <Globe className="mr-2 h-4 w-4" /> Base URL
                        </FormLabel>
                        <FormControl>
                          <Input 
                            id="baseUrl" 
                            placeholder={process.env.NEXT_PUBLIC_DIDIT_API_URL || "https://api.didit.me/v1"}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          The base URL for the Didit.me API. 
                          (Default: {process.env.NEXT_PUBLIC_DIDIT_API_URL || "https://api.didit.me/v1"})
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                
                {testResult && (
                  <Alert variant={testResult.success ? "default" : "destructive"} className={testResult.success ? "bg-green-50 border-green-200 text-green-800" : ""}>
                    {testResult.success ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {testResult.success ? "Connection Successful" : "Connection Failed"}
                    </AlertTitle>
                    <AlertDescription>
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={isTestingConnection || saveSettingsMutation.isPending}
                  >
                    {isTestingConnection ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                  
                  <Button 
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="info">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">About Didit.me Identity Verification</h3>
                <p className="text-gray-600 mb-4">
                  Didit.me is a secure identity verification service that helps verify the identity
                  of your observers. The verification process involves a combination of document verification
                  and biometric checks to ensure the person is who they claim to be.
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">How It Works</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-600">
                  <li>
                    <strong>Setup:</strong> Enter your Didit.me API credentials and enable the integration.
                  </li>
                  <li>
                    <strong>User Experience:</strong> Users will see a Verification tab in their profile where
                    they can start the verification process.
                  </li>
                  <li>
                    <strong>Verification Flow:</strong> When a user initiates verification, they'll be redirected
                    to a secure Didit.me verification page where they'll provide their ID document and complete
                    a facial recognition check.
                  </li>
                  <li>
                    <strong>Completion:</strong> Once verified, the user's status in your platform will automatically
                    be updated and they'll gain access to verified features.
                  </li>
                </ol>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Getting API Credentials</h3>
                <p className="text-gray-600 mb-2">
                  To obtain API credentials for Didit.me integration:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Sign up for an account at <a href="https://didit.me" target="_blank" className="text-primary hover:underline">didit.me</a></li>
                  <li>Navigate to your account dashboard</li>
                  <li>Go to API settings or Developer section</li>
                  <li>Generate a new API key and secret</li>
                  <li>Copy and paste these values into the settings here</li>
                </ol>
              </div>
              
              <Alert className="mt-6 bg-blue-50 border-blue-200">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Security Note</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Your API credentials are securely stored and encrypted. For security purposes, the API secret
                  is never displayed in full once saved. If you need to update the secret, simply provide a new
                  value - leaving the field as "********" will keep the existing secret.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}