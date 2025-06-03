import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/layout/admin-layout';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ArrowUpRight, Check, ExternalLink, RefreshCcw, Save, Settings, X } from 'lucide-react';

// Define types for the data structures
interface PlatformSyncInfo {
  lastSyncTime: string;
  status: 'success' | 'error' | 'pending';
  itemsSynced: number;
  errors: number;
}

interface UserMapping {
  id: number;
  userId: number;
  externalId: string;
  externalUsername: string;
  syncStatus: 'synced' | 'pending' | 'error';
  lastSync: string;
}

interface UserMappingsData {
  moodle: UserMapping[];
  zoom: UserMapping[];
}

interface SyncStatusData {
  moodle: PlatformSyncInfo;
  zoom: PlatformSyncInfo;
}

export default function TrainingIntegrationsAdmin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('moodle');
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Moodle form state
  const [moodleSettings, setMoodleSettings] = useState({
    enabled: true,
    url: 'https://moodle.example.org',
    apiKey: 'moodle_api_key_123456',
    siteId: 'CAFFE_ELECTION',
    autoSync: true,
    syncFrequency: 'daily'
  });

  // Zoom form state
  const [zoomSettings, setZoomSettings] = useState({
    enabled: true,
    apiKey: 'zoom_api_key_123456',
    apiSecret: 'zoom_api_secret_123456',
    accountId: 'zoom_account_id',
    autoSync: true,
    syncFrequency: 'hourly'
  });

  // User mapping data
  const { data: userMappings, isLoading: userMappingsLoading } = useQuery<UserMappingsData>({
    queryKey: ['/api/training/integrations/user-mappings'],
    queryFn: async () => {
      // In a real implementation, this would fetch data from the API
      // For now, we'll return mock data
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            moodle: [
              { id: 1, userId: 2, externalId: 'moodle_101', externalUsername: 'admin_moodle', syncStatus: 'synced', lastSync: '2023-10-10T10:15:30Z' },
              { id: 2, userId: 3, externalId: 'moodle_102', externalUsername: 'observer1_moodle', syncStatus: 'error', lastSync: '2023-10-09T14:22:10Z' },
              { id: 3, userId: 4, externalId: 'moodle_103', externalUsername: 'observer2_moodle', syncStatus: 'synced', lastSync: '2023-10-10T09:45:12Z' }
            ],
            zoom: [
              { id: 1, userId: 2, externalId: 'zoom_user_101', externalUsername: 'admin@example.com', syncStatus: 'synced', lastSync: '2023-10-10T10:20:15Z' },
              { id: 2, userId: 3, externalId: 'zoom_user_102', externalUsername: 'observer1@example.com', syncStatus: 'synced', lastSync: '2023-10-10T10:22:30Z' },
              { id: 3, userId: 4, externalId: 'zoom_user_103', externalUsername: 'observer2@example.com', syncStatus: 'pending', lastSync: '2023-10-09T16:30:00Z' }
            ]
          });
        }, 800);
      });
    }
  });

  // Sync status data
  const { data: syncStatus, isLoading: syncStatusLoading } = useQuery<SyncStatusData>({
    queryKey: ['/api/training/integrations/sync-status'],
    queryFn: async () => {
      // In a real implementation, this would fetch data from the API
      // For now, we'll return mock data
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            moodle: {
              lastSyncTime: '2023-10-10T10:30:45Z',
              status: 'success',
              itemsSynced: 48,
              errors: 2
            },
            zoom: {
              lastSyncTime: '2023-10-10T11:15:22Z',
              status: 'success',
              itemsSynced: 12,
              errors: 0
            }
          });
        }, 1000);
      });
    }
  });

  const handleMoodleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setMoodleSettings({
      ...moodleSettings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleZoomSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setZoomSettings({
      ...zoomSettings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleTestConnection = (platform: 'moodle' | 'zoom') => {
    setTestingConnection(true);
    // In a real implementation, this would call the API to test the connection
    setTimeout(() => {
      setTestingConnection(false);
      toast({
        title: 'Connection Test Successful',
        description: `Successfully connected to ${platform === 'moodle' ? 'Moodle LMS' : 'Zoom'}.`,
        variant: 'default',
      });
    }, 1500);
  };

  const handleSaveSettings = (platform: 'moodle' | 'zoom') => {
    setSavingSettings(true);
    // In a real implementation, this would call the API to save the settings
    setTimeout(() => {
      setSavingSettings(false);
      toast({
        title: 'Settings Saved',
        description: `${platform === 'moodle' ? 'Moodle' : 'Zoom'} integration settings have been updated.`,
        variant: 'default',
      });
    }, 1000);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };

  const renderSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return (
          <div className="flex items-center text-green-600">
            <Check className="h-4 w-4 mr-1" />
            <span>Synced</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center text-amber-600">
            <RefreshCcw className="h-4 w-4 mr-1" />
            <span>Pending</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-600">
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span>Error</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-600">
            <X className="h-4 w-4 mr-1" />
            <span>Unknown</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Training Integrations">
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Training Integrations">
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Training Integrations</h1>
          <p className="text-muted-foreground">
            Manage external training platform integrations for Moodle and Zoom.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="moodle">Moodle Integration</TabsTrigger>
            <TabsTrigger value="zoom">Zoom Integration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="moodle" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Moodle LMS Configuration
                </CardTitle>
                <CardDescription>
                  Configure the connection to your Moodle Learning Management System.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Moodle Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn on to allow users to access Moodle courses from the platform.
                    </p>
                  </div>
                  <Switch
                    checked={moodleSettings.enabled}
                    onCheckedChange={(checked) => 
                      setMoodleSettings({ ...moodleSettings, enabled: checked })
                    }
                    name="enabled"
                  />
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="moodle-url">Moodle Site URL</Label>
                    <Input
                      id="moodle-url"
                      name="url"
                      placeholder="https://moodle.yourorganization.org"
                      value={moodleSettings.url}
                      onChange={handleMoodleSettingsChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      The URL of your Moodle installation.
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="moodle-api-key">API Key</Label>
                    <Input
                      id="moodle-api-key"
                      name="apiKey"
                      type="password"
                      placeholder="Enter your Moodle API key"
                      value={moodleSettings.apiKey}
                      onChange={handleMoodleSettingsChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      The API key generated in your Moodle administration settings.
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="moodle-site-id">Site Identifier</Label>
                    <Input
                      id="moodle-site-id"
                      name="siteId"
                      placeholder="Enter a unique site identifier"
                      value={moodleSettings.siteId}
                      onChange={handleMoodleSettingsChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      A unique identifier for this Moodle site in your system.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="moodle-auto-sync"
                      name="autoSync"
                      checked={moodleSettings.autoSync}
                      onCheckedChange={(checked) => 
                        setMoodleSettings({ ...moodleSettings, autoSync: checked })
                      }
                    />
                    <Label htmlFor="moodle-auto-sync">Enable Automatic Synchronization</Label>
                  </div>
                  
                  {moodleSettings.autoSync && (
                    <div className="grid gap-2">
                      <Label htmlFor="moodle-sync-frequency">Sync Frequency</Label>
                      <select
                        id="moodle-sync-frequency"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={moodleSettings.syncFrequency}
                        onChange={(e) => setMoodleSettings({ ...moodleSettings, syncFrequency: e.target.value })}
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                      <p className="text-sm text-muted-foreground">
                        How often to synchronize data with Moodle.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => handleTestConnection('moodle')}
                  disabled={testingConnection}
                >
                  {testingConnection ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Test Connection
                </Button>
                <Button
                  onClick={() => handleSaveSettings('moodle')}
                  disabled={savingSettings}
                >
                  {savingSettings ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Settings
                </Button>
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Synchronization Status</CardTitle>
                  <CardDescription>
                    Current status of data synchronization with Moodle.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {syncStatusLoading ? (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Last Sync</span>
                        <span className="text-sm">{formatDate(syncStatus?.moodle.lastSyncTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Status</span>
                        <span className={`text-sm ${syncStatus?.moodle.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                          {syncStatus?.moodle.status === 'success' ? 'Successful' : 'Failed'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Items Synced</span>
                        <span className="text-sm">{syncStatus?.moodle.itemsSynced}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Errors</span>
                        <span className="text-sm">{syncStatus?.moodle.errors}</span>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Sync Now
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Mappings</CardTitle>
                  <CardDescription>
                    Connections between platform users and Moodle accounts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userMappingsLoading ? (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userMappings?.moodle.map((mapping) => (
                        <div key={mapping.id} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">User ID: {mapping.userId}</p>
                            <p className="text-xs text-muted-foreground">
                              Moodle: {mapping.externalUsername} ({mapping.externalId})
                            </p>
                          </div>
                          <div>{renderSyncStatusBadge(mapping.syncStatus)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline">Manage Mappings</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Moodle User Mappings</DialogTitle>
                        <DialogDescription>
                          Manage connections between platform users and Moodle accounts.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        {/* Mapping management UI would go here */}
                        <p className="text-sm text-muted-foreground">
                          This dialog would contain the interface for adding, editing, and removing user mappings.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Moodle Courses</CardTitle>
                <CardDescription>
                  Manage course synchronization settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Election Laws and Regulations</p>
                      <p className="text-xs text-muted-foreground">
                        Course ID: 101, Category: Legal
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View
                      </a>
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Observer Field Operations</p>
                      <p className="text-xs text-muted-foreground">
                        Course ID: 102, Category: Operations
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View
                      </a>
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Data Collection Methodology</p>
                      <p className="text-xs text-muted-foreground">
                        Course ID: 103, Category: Methodology
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Manage Courses in Moodle
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="zoom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Zoom Configuration
                </CardTitle>
                <CardDescription>
                  Configure the connection to your Zoom account for live training sessions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Zoom Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn on to allow users to access Zoom sessions from the platform.
                    </p>
                  </div>
                  <Switch
                    checked={zoomSettings.enabled}
                    onCheckedChange={(checked) => 
                      setZoomSettings({ ...zoomSettings, enabled: checked })
                    }
                    name="enabled"
                  />
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="zoom-api-key">API Key</Label>
                    <Input
                      id="zoom-api-key"
                      name="apiKey"
                      type="password"
                      placeholder="Enter your Zoom API key"
                      value={zoomSettings.apiKey}
                      onChange={handleZoomSettingsChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      The API key from your Zoom developer account.
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="zoom-api-secret">API Secret</Label>
                    <Input
                      id="zoom-api-secret"
                      name="apiSecret"
                      type="password"
                      placeholder="Enter your Zoom API secret"
                      value={zoomSettings.apiSecret}
                      onChange={handleZoomSettingsChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      The API secret from your Zoom developer account.
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="zoom-account-id">Account ID</Label>
                    <Input
                      id="zoom-account-id"
                      name="accountId"
                      placeholder="Enter your Zoom account ID"
                      value={zoomSettings.accountId}
                      onChange={handleZoomSettingsChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your Zoom account identifier.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="zoom-auto-sync"
                      name="autoSync"
                      checked={zoomSettings.autoSync}
                      onCheckedChange={(checked) => 
                        setZoomSettings({ ...zoomSettings, autoSync: checked })
                      }
                    />
                    <Label htmlFor="zoom-auto-sync">Enable Automatic Synchronization</Label>
                  </div>
                  
                  {zoomSettings.autoSync && (
                    <div className="grid gap-2">
                      <Label htmlFor="zoom-sync-frequency">Sync Frequency</Label>
                      <select
                        id="zoom-sync-frequency"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={zoomSettings.syncFrequency}
                        onChange={(e) => setZoomSettings({ ...zoomSettings, syncFrequency: e.target.value })}
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                      <p className="text-sm text-muted-foreground">
                        How often to synchronize session data with Zoom.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => handleTestConnection('zoom')}
                  disabled={testingConnection}
                >
                  {testingConnection ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Test Connection
                </Button>
                <Button
                  onClick={() => handleSaveSettings('zoom')}
                  disabled={savingSettings}
                >
                  {savingSettings ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Settings
                </Button>
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Synchronization Status</CardTitle>
                  <CardDescription>
                    Current status of data synchronization with Zoom.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {syncStatusLoading ? (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Last Sync</span>
                        <span className="text-sm">{formatDate(syncStatus?.zoom.lastSyncTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Status</span>
                        <span className={`text-sm ${syncStatus?.zoom.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                          {syncStatus?.zoom.status === 'success' ? 'Successful' : 'Failed'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Items Synced</span>
                        <span className="text-sm">{syncStatus?.zoom.itemsSynced}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Errors</span>
                        <span className="text-sm">{syncStatus?.zoom.errors}</span>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Sync Now
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Mappings</CardTitle>
                  <CardDescription>
                    Connections between platform users and Zoom accounts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userMappingsLoading ? (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userMappings?.zoom.map((mapping) => (
                        <div key={mapping.id} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">User ID: {mapping.userId}</p>
                            <p className="text-xs text-muted-foreground">
                              Zoom: {mapping.externalUsername} ({mapping.externalId})
                            </p>
                          </div>
                          <div>{renderSyncStatusBadge(mapping.syncStatus)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline">Manage Mappings</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Zoom User Mappings</DialogTitle>
                        <DialogDescription>
                          Manage connections between platform users and Zoom accounts.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        {/* Mapping management UI would go here */}
                        <p className="text-sm text-muted-foreground">
                          This dialog would contain the interface for adding, editing, and removing user mappings.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Zoom Sessions</CardTitle>
                <CardDescription>
                  View and manage scheduled training sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Live Q&A: Election Day Procedures</p>
                      <p className="text-xs text-muted-foreground">
                        Oct 15, 2:00 PM • Maria Johnson, Head of Training
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Manage
                      </a>
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Report Writing Best Practices</p>
                      <p className="text-xs text-muted-foreground">
                        Oct 18, 11:00 AM • Sarah Okonjo, Senior Observer
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Manage
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Schedule New Session
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}