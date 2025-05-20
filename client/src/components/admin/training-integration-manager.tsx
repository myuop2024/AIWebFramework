import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PlusCircle, Trash2, RotateCw, ServerCrash, Check, X } from 'lucide-react';
import { type TrainingIntegration } from '@shared/schema';

// Form schemas
const moodleConfigSchema = z.object({
  type: z.literal('moodle'),
  baseUrl: z.string().url({ message: 'Please enter a valid URL' }).min(1, { message: 'Base URL is required' }),
  requiresAuth: z.boolean().default(true),
  authToken: z.string().min(1, { message: 'Auth token is required' }),
  username: z.string().optional(),
  password: z.string().optional(),
  verifySSL: z.boolean().default(true),
});

const zoomConfigSchema = z.object({
  type: z.literal('zoom'),
  baseUrl: z.string().url({ message: 'Please enter a valid URL' }).default('https://api.zoom.us'),
  requiresAuth: z.boolean().default(true),
  clientId: z.string().min(1, { message: 'Client ID is required' }),
  clientSecret: z.string().min(1, { message: 'Client Secret is required' }),
  redirectUri: z.string().url({ message: 'Please enter a valid Redirect URI' }).optional(),
  verifySSL: z.boolean().default(true),
});

const integrationFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  syncSchedule: z.string().optional(),
  systems: z.array(z.discriminatedUnion('type', [
    moodleConfigSchema,
    zoomConfigSchema
  ])).min(1, { message: 'At least one system configuration is required' }),
});

type IntegrationType = z.infer<typeof integrationFormSchema>;

// Component for managing training integrations
export const TrainingIntegrationManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedIntegration, setSelectedIntegration] = useState<TrainingIntegration | null>(null);
  const [systemType, setSystemType] = useState<'moodle' | 'zoom'>('moodle');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string; data?: object; error?: string } | null>(null);
  
  const { toast } = useToast();
  
  // Query for fetching integrations
  const {
    data: integrations,
    isLoading,
    isError,
  } = useQuery<TrainingIntegration[]>({
    queryKey: ['/api/training/integrations'],
    queryFn: () => apiRequest('/api/training/integrations'),
  });
  
  // Mutations
  const createIntegrationMutation = useMutation({
    mutationFn: (data: IntegrationType) => apiRequest('/api/training/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/integrations'] });
      toast({
        title: 'Integration created',
        description: 'The training integration was created successfully.',
      });
      setActiveTab('list');
    },
    onError: (error: unknown) => {
      let message = 'Please try again.';
      if (error instanceof Error) message = error.message;
      toast({
        title: 'Failed to create integration',
        description: message,
        variant: 'destructive',
      });
    },
  });
  
  const updateIntegrationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: IntegrationType }) => apiRequest(`/api/training/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/integrations'] });
      toast({
        title: 'Integration updated',
        description: 'The training integration was updated successfully.',
      });
      setActiveTab('list');
      setSelectedIntegration(null);
    },
    onError: (error: unknown) => {
      let message = 'Please try again.';
      if (error instanceof Error) message = error.message;
      toast({
        title: 'Failed to update integration',
        description: message,
        variant: 'destructive',
      });
    },
  });
  
  const deleteIntegrationMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/training/integrations/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/integrations'] });
      toast({
        title: 'Integration deleted',
        description: 'The training integration was deleted successfully.',
      });
      setSelectedIntegration(null);
    },
    onError: (error: unknown) => {
      let message = 'Please try again.';
      if (error instanceof Error) message = error.message;
      toast({
        title: 'Failed to delete integration',
        description: message,
        variant: 'destructive',
      });
    },
  });
  
  const testConnectionMutation = useMutation({
    mutationFn: (data: object) => apiRequest('/api/training/test-connection', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    onSuccess: (data) => {
      setConnectionResult({
        success: true,
        message: data.message || 'Connection successful',
        data: data
      });
    },
    onError: (error: unknown) => {
      setConnectionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        error: error instanceof Error ? error : undefined
      });
    },
    onSettled: () => {
      setTestingConnection(false);
    }
  });
  
  // Form for creating/editing integrations
  const form = useForm<IntegrationType>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
      systems: [],
    },
  });
  
  // Initialize editing form
  const initializeEditForm = (integration: TrainingIntegration) => {
    setSelectedIntegration(integration);
    
    form.reset({
      name: integration.name,
      description: integration.description || '',
      isActive: integration.isActive,
      syncSchedule: integration.syncSchedule || '',
      systems: integration.systems || [],
    });
    
    setActiveTab('edit');
  };
  
  // Handle form submission
  const onSubmit = (data: IntegrationType) => {
    if (selectedIntegration) {
      updateIntegrationMutation.mutate({
        id: selectedIntegration.id,
        data
      });
    } else {
      createIntegrationMutation.mutate(data);
    }
  };
  
  // Add a system configuration to the form
  const addSystem = () => {
    const currentSystems = form.getValues('systems') || [];
    
    if (systemType === 'moodle') {
      currentSystems.push({
        type: 'moodle',
        baseUrl: '',
        requiresAuth: true,
        authToken: '',
        verifySSL: true,
      });
    } else {
      currentSystems.push({
        type: 'zoom',
        baseUrl: 'https://api.zoom.us',
        requiresAuth: true,
        clientId: '',
        clientSecret: '',
        verifySSL: true,
      });
    }
    
    form.setValue('systems', currentSystems);
  };
  
  // Remove a system configuration
  const removeSystem = (index: number) => {
    const currentSystems = form.getValues('systems') || [];
    currentSystems.splice(index, 1);
    form.setValue('systems', currentSystems);
  };
  
  // Test a connection to a system
  const testConnection = (system: { type: string; baseUrl: string; authToken?: string; clientId?: string; clientSecret?: string }) => {
    setTestingConnection(true);
    setConnectionResult(null);
    
    const testData = {
      type: system.type,
      baseUrl: system.baseUrl,
      ...(system.type === 'moodle' ? { authToken: system.authToken } : {}),
      ...(system.type === 'zoom' ? { 
        clientId: system.clientId, 
        clientSecret: system.clientSecret 
      } : {}),
    };
    
    testConnectionMutation.mutate(testData);
  };
  
  // Render list of integrations
  const renderIntegrationList = () => {
    if (isLoading) {
      return <div className="flex justify-center p-8"><Spinner /></div>;
    }
    
    if (isError) {
      return (
        <div className="text-center p-8">
          <ServerCrash className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Failed to load integrations</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/training/integrations'] })}
          >
            Retry
          </Button>
        </div>
      );
    }
    
    if (!integrations || integrations.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-muted-foreground">No integrations found</p>
          <Button 
            variant="default" 
            className="mt-4"
            onClick={() => {
              form.reset({
                name: '',
                description: '',
                isActive: true,
                systems: [],
              });
              setActiveTab('create');
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Integration
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {integrations.map((integration: TrainingIntegration) => (
          <Card key={integration.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{integration.name}</CardTitle>
                  {integration.description && (
                    <CardDescription>{integration.description}</CardDescription>
                  )}
                </div>
                <Badge variant={integration.isActive ? 'default' : 'outline'}>
                  {integration.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Connected Systems:</h4>
                <div className="flex flex-wrap gap-2">
                  {integration.systems && integration.systems.map((system: IntegrationType['systems'][number], idx: number) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="flex items-center"
                    >
                      {system.type === 'moodle' ? 'Moodle' : 'Zoom'}: {system.baseUrl}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      integration and may affect associated training data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => initializeEditForm(integration)}
              >
                Edit
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  // Render form for creating/editing integrations
  const renderIntegrationForm = () => {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Integration Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Training Portal Integration" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Enable or disable this integration
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
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Integration for observer training"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="syncSchedule"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sync Schedule (Cron Format)</FormLabel>
                <FormControl>
                  <Input placeholder="0 0 * * * (Daily at midnight)" {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>
                  Schedule for synchronizing data between systems. Leave empty for manual sync.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Connected Systems</h3>
              <div className="flex items-center space-x-2">
                <Select
                  value={systemType}
                  onValueChange={(value) => setSystemType(value as 'moodle' | 'zoom')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="System Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moodle">Moodle</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addSystem}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Add System
                </Button>
              </div>
            </div>
            
            {form.watch('systems')?.length > 0 ? (
              <div className="space-y-6">
                {form.watch('systems').map((system, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          {system.type === 'moodle' ? 'Moodle LMS' : 'Zoom Meetings'}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSystem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Common fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`systems.${index}.baseUrl`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base URL</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={system.type === 'moodle' ? "https://moodle.example.com" : "https://api.zoom.us"} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`systems.${index}.verifySSL`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full">
                              <div className="space-y-0.5">
                                <FormLabel>Verify SSL</FormLabel>
                                <FormDescription className="text-xs">
                                  Verify SSL certificates
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
                      </div>
                      
                      {/* Moodle specific fields */}
                      {system.type === 'moodle' && (
                        <FormField
                          control={form.control}
                          name={`systems.${index}.authToken`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Authentication Token</FormLabel>
                              <FormControl>
                                <Input placeholder="Moodle API token" {...field} />
                              </FormControl>
                              <FormDescription>
                                The Moodle Web Services token for API access
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Zoom specific fields */}
                      {system.type === 'zoom' && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`systems.${index}.clientId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Client ID</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Zoom Client ID" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`systems.${index}.clientSecret`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Client Secret</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="password"
                                      placeholder="Zoom Client Secret" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name={`systems.${index}.redirectUri`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Redirect URI (Optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://example.com/auth/zoom/callback" 
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Used for OAuth authorization flow
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </CardContent>
                    <CardFooter>
                      {/* Test Connection Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(system)}
                        disabled={testingConnection}
                      >
                        {testingConnection ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4" /> Testing...
                          </>
                        ) : (
                          <>
                            <RotateCw className="mr-2 h-4 w-4" /> Test Connection
                          </>
                        )}
                      </Button>
                      
                      {/* Connection Result */}
                      {connectionResult && (
                        <div className="ml-4">
                          {connectionResult.success ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <Check className="mr-1 h-4 w-4" /> Connected
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="mr-1 h-4 w-4" /> Failed
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-muted-foreground text-center mb-4">
                    No systems connected yet. Add a system to continue.
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addSystem}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add System
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {form.formState.errors.systems && (
              <p className="text-destructive text-sm mt-2">
                {form.formState.errors.systems.message}
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('list');
                setSelectedIntegration(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createIntegrationMutation.isPending || updateIntegrationMutation.isPending}
            >
              {(createIntegrationMutation.isPending || updateIntegrationMutation.isPending) && (
                <Spinner className="mr-2 h-4 w-4" />
              )}
              {selectedIntegration ? 'Update' : 'Create'} Integration
            </Button>
          </div>
        </form>
      </Form>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Training Integrations</h2>
        {activeTab === 'list' && (
          <Button 
            onClick={() => {
              form.reset({
                name: '',
                description: '',
                isActive: true,
                systems: [],
              });
              setActiveTab('create');
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Integration
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="list">Integrations</TabsTrigger>
          <TabsTrigger 
            value={selectedIntegration ? 'edit' : 'create'}
            disabled={activeTab === 'list'}
          >
            {selectedIntegration ? 'Edit' : 'Create'} Integration
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {renderIntegrationList()}
        </TabsContent>
        
        <TabsContent value="create" className="space-y-4">
          {renderIntegrationForm()}
        </TabsContent>
        
        <TabsContent value="edit" className="space-y-4">
          {renderIntegrationForm()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingIntegrationManager;