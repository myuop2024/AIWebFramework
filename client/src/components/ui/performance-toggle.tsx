import React, { useState, useEffect } from 'react';
import { Settings, Zap, ZapOff } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Switch } from './switch';
import { Label } from './label';
import { Separator } from './separator';

interface PerformanceSettings {
  reducedAnimations: boolean;
  limitBackgroundTasks: boolean;
  optimizeImages: boolean;
  prefetchDisabled: boolean;
}

// Custom hook to manage performance settings
export function usePerformanceSettings() {
  const [settings, setSettings] = useState<PerformanceSettings>({
    reducedAnimations: false,
    limitBackgroundTasks: false,
    optimizeImages: true,
    prefetchDisabled: false,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('performanceSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse performance settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('performanceSettings', JSON.stringify(settings));

    // Apply settings to document
    if (settings.reducedAnimations) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings]);

  const updateSetting = (key: keyof PerformanceSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return { settings, updateSetting };
}

export function PerformanceToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting } = usePerformanceSettings();

  

  const isPerformanceModeActive = Object.values(settings).some(Boolean);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Performance Settings"
        >
          {isPerformanceModeActive ? (
            <Zap className="h-4 w-4 text-yellow-500" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ZapOff className="h-4 w-4" />
            <h3 className="font-medium">Performance Settings</h3>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reducedAnimations" className="text-sm">
                Reduce Animations
              </Label>
              <Switch
                id="reducedAnimations"
                checked={settings.reducedAnimations}
                onCheckedChange={(checked) => updateSetting('reducedAnimations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="limitBackgroundTasks" className="text-sm">
                Limit Background Tasks
              </Label>
              <Switch
                id="limitBackgroundTasks"
                checked={settings.limitBackgroundTasks}
                onCheckedChange={(checked) => updateSetting('limitBackgroundTasks', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="optimizeImages" className="text-sm">
                Optimize Images
              </Label>
              <Switch
                id="optimizeImages"
                checked={settings.optimizeImages}
                onCheckedChange={(checked) => updateSetting('optimizeImages', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="prefetchDisabled" className="text-sm">
                Disable Prefetch
              </Label>
              <Switch
                id="prefetchDisabled"
                checked={settings.prefetchDisabled}
                onCheckedChange={(checked) => updateSetting('prefetchDisabled', checked)}
              />
            </div>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">
            These settings help improve performance on slower devices or connections.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}