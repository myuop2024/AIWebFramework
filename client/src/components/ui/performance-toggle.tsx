import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

// Create a performance context that can be accessed throughout the app
export type PerformanceSettings = {
  enable3D: boolean;
  enableAnimations: boolean;
  enableShadows: boolean;
  lowPerformanceMode: boolean;
};

// Default settings
const defaultSettings: PerformanceSettings = {
  enable3D: false, // Disable 3D by default
  enableAnimations: true,
  enableShadows: false,
  lowPerformanceMode: false,
};

// Use localStorage to persist settings
const STORAGE_KEY = 'caffe-performance-settings';

export function usePerformanceSettings(): [PerformanceSettings, (settings: Partial<PerformanceSettings>) => void] {
  const [settings, setSettings] = useState<PerformanceSettings>(defaultSettings);

  // Load settings from localStorage on initial render
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      } else {
        // Auto-detect performance capabilities
        const isLowPerfDevice = window.navigator.hardwareConcurrency <= 4 || 
                               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        setSettings({
          ...defaultSettings,
          lowPerformanceMode: isLowPerfDevice,
          enable3D: !isLowPerfDevice,
          enableShadows: !isLowPerfDevice
        });
        
        // Save the auto-detected settings
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...defaultSettings,
          lowPerformanceMode: isLowPerfDevice,
          enable3D: !isLowPerfDevice,
          enableShadows: !isLowPerfDevice
        }));
      }
    } catch (error) {
      console.error('Error loading performance settings:', error);
    }
  }, []);

  // Update settings
  const updateSettings = (newSettings: Partial<PerformanceSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving performance settings:', error);
    }
  };

  return [settings, updateSettings];
}

export function PerformanceToggle() {
  const [settings, updateSettings] = usePerformanceSettings();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Performance</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium leading-none mb-2">Performance Settings</h4>
          <p className="text-sm text-muted-foreground">
            Adjust these settings to improve performance on your device.
          </p>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-3d">Enable 3D Visualizations</Label>
              <p className="text-xs text-muted-foreground">
                Disable for better performance on low-end devices
              </p>
            </div>
            <Switch
              id="enable-3d"
              checked={settings.enable3D}
              onCheckedChange={(checked) => updateSettings({ enable3D: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-animations">Enable Animations</Label>
              <p className="text-xs text-muted-foreground">
                Controls UI animations and transitions
              </p>
            </div>
            <Switch
              id="enable-animations"
              checked={settings.enableAnimations}
              onCheckedChange={(checked) => updateSettings({ enableAnimations: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-shadows">Enable Shadows</Label>
              <p className="text-xs text-muted-foreground">
                Shadows and advanced lighting effects
              </p>
            </div>
            <Switch
              id="enable-shadows"
              checked={settings.enableShadows}
              onCheckedChange={(checked) => updateSettings({ enableShadows: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="low-perf-mode">Low Performance Mode</Label>
              <p className="text-xs text-muted-foreground">
                Optimizes all settings for maximum performance
              </p>
            </div>
            <Switch
              id="low-perf-mode"
              checked={settings.lowPerformanceMode}
              onCheckedChange={(checked) => 
                updateSettings({ 
                  lowPerformanceMode: checked,
                  enable3D: !checked,
                  enableShadows: !checked,
                  enableAnimations: !checked 
                })
              }
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}