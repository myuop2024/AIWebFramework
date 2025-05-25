import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, Bell, BellOff, Smartphone, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  notificationsEnabled: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  offlineData: {
    reports: number;
    forms: number;
    images: number;
  };
  cacheSize: string;
  lastSync: Date;
}

interface ProgressiveWebAppProps {
  className?: string;
}

export function ProgressiveWebApp({ className }: ProgressiveWebAppProps) {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstallable: true,
    isInstalled: false,
    isOnline: navigator.onLine,
    notificationsEnabled: false,
    syncStatus: 'synced',
    offlineData: {
      reports: 3,
      forms: 7,
      images: 12
    },
    cacheSize: '24.5 MB',
    lastSync: new Date()
  });

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setPwaStatus(prev => ({ ...prev, isInstalled: isStandalone }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setPwaStatus(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for online/offline status
    const handleOnline = () => {
      setPwaStatus(prev => ({ ...prev, isOnline: true, syncStatus: 'syncing' }));
      startSync();
    };

    const handleOffline = () => {
      setPwaStatus(prev => ({ ...prev, isOnline: false, syncStatus: 'offline' }));
    };

    // Check notification permission
    if ('Notification' in window) {
      setPwaStatus(prev => ({ 
        ...prev, 
        notificationsEnabled: Notification.permission === 'granted' 
      }));
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startSync = async () => {
    setSyncProgress(0);
    setPwaStatus(prev => ({ ...prev, syncStatus: 'syncing' }));

    // Simulate sync progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setSyncProgress(i);
    }

    setPwaStatus(prev => ({ 
      ...prev, 
      syncStatus: 'synced',
      lastSync: new Date(),
      offlineData: { reports: 0, forms: 0, images: 0 }
    }));
    setSyncProgress(0);
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;

    const result = await installPrompt.prompt();
    if (result.outcome === 'accepted') {
      setPwaStatus(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const permission = await Notification.requestPermission();
      setPwaStatus(prev => ({ 
        ...prev, 
        notificationsEnabled: permission === 'granted' 
      }));

      if (permission === 'granted') {
        new Notification('CAFFE Notifications Enabled', {
          body: 'You will now receive important updates and alerts.',
          icon: '/favicon.ico'
        });
      }
    } else {
      setPwaStatus(prev => ({ ...prev, notificationsEnabled: false }));
    }
  };

  const clearOfflineData = () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    setPwaStatus(prev => ({ 
      ...prev, 
      offlineData: { reports: 0, forms: 0, images: 0 },
      cacheSize: '0 MB'
    }));
  };

  const getSyncStatusColor = (status: PWAStatus['syncStatus']) => {
    switch (status) {
      case 'synced': return 'text-green-600';
      case 'syncing': return 'text-blue-600';
      case 'offline': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSyncStatusIcon = (status: PWAStatus['syncStatus']) => {
    switch (status) {
      case 'synced': return <Cloud className="h-4 w-4" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'offline': return <CloudOff className="h-4 w-4" />;
      case 'error': return <CloudOff className="h-4 w-4" />;
      default: return <Cloud className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Install Banner */}
      {pwaStatus.isInstallable && !pwaStatus.isInstalled && showInstallBanner && (
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Install CAFFE as an app for better performance and offline access.</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstallApp}>
                <Download className="h-4 w-4 mr-1" />
                Install
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowInstallBanner(false)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* PWA Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Status
            {pwaStatus.isInstalled && (
              <Badge variant="secondary">Installed</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {pwaStatus.isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="font-medium">
                  {pwaStatus.isOnline ? 'Online' : 'Offline'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pwaStatus.isOnline ? 'Connected to server' : 'Working offline'}
                </p>
              </div>
            </div>
            <Badge variant={pwaStatus.isOnline ? 'default' : 'destructive'}>
              {pwaStatus.isOnline ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {/* Sync Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={getSyncStatusColor(pwaStatus.syncStatus)}>
                {getSyncStatusIcon(pwaStatus.syncStatus)}
              </div>
              <div>
                <p className="font-medium capitalize">{pwaStatus.syncStatus}</p>
                <p className="text-sm text-muted-foreground">
                  Last sync: {pwaStatus.lastSync.toLocaleTimeString()}
                </p>
              </div>
            </div>
            {pwaStatus.isOnline && pwaStatus.syncStatus !== 'syncing' && (
              <Button variant="outline" size="sm" onClick={startSync}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Sync Now
              </Button>
            )}
          </div>

          {/* Sync Progress */}
          {pwaStatus.syncStatus === 'syncing' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Syncing data...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}

          {/* Notifications */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {pwaStatus.notificationsEnabled ? (
                <Bell className="h-5 w-5 text-blue-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-600" />
              )}
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {pwaStatus.notificationsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <Switch
              checked={pwaStatus.notificationsEnabled}
              onCheckedChange={handleNotificationToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Offline Data */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {pwaStatus.offlineData.reports}
              </p>
              <p className="text-sm text-muted-foreground">Reports</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {pwaStatus.offlineData.forms}
              </p>
              <p className="text-sm text-muted-foreground">Forms</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {pwaStatus.offlineData.images}
              </p>
              <p className="text-sm text-muted-foreground">Images</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Cache Size</p>
              <p className="text-sm text-muted-foreground">{pwaStatus.cacheSize}</p>
            </div>
            <Button variant="outline" size="sm" onClick={clearOfflineData}>
              Clear Cache
            </Button>
          </div>

          {!pwaStatus.isOnline && (
            <Alert>
              <CloudOff className="h-4 w-4" />
              <AlertDescription>
                You're working offline. Changes will sync when connection is restored.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* App Features */}
      <Card>
        <CardHeader>
          <CardTitle>App Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CloudOff className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Offline Mode</p>
                <p className="text-sm text-muted-foreground">Work without internet</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Real-time alerts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Download className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">App Install</p>
                <p className="text-sm text-muted-foreground">Native app experience</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <RefreshCw className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Background Sync</p>
                <p className="text-sm text-muted-foreground">Automatic data sync</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 