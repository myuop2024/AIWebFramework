
import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Zap, ZapOff } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface PerformanceSettings {
  reducedAnimations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  reducedData: boolean;
  enable3D: boolean;
}

const defaultSettings: PerformanceSettings = {
  reducedAnimations: false,
  reducedMotion: false,
  highContrast: false,
  reducedData: false,
  enable3D: true,
};

function usePerformanceSettings() {
  const [settings, setSettings] = useState<PerformanceSettings>(() => {
    try {
      const saved = localStorage.getItem('performanceSettings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem('performanceSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save performance settings to localStorage:', error);
    }
  }, [settings]);

  // Apply CSS class for reduced animations
  useEffect(() => {
    if (settings.reducedAnimations) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings.reducedAnimations]);

  // Apply CSS class for high contrast
  useEffect(() => {
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [settings.highContrast]);

  const updateSetting = useCallback((key: keyof PerformanceSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  return { settings, updateSetting };
}

export { usePerformanceSettings };

export function PerformanceToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting } = usePerformanceSettings();

  const isPerformanceModeActive = Object.values(settings).some(Boolean);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${isPerformanceModeActive ? 'text-yellow-600' : 'text-gray-600'}`}
          title="Performance Settings"
        >
          {isPerformanceModeActive ? (
            <ZapOff className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {isPerformanceModeActive && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Performance Settings</h4>
            <p className="text-sm text-muted-foreground">
              Adjust settings to optimize performance on your device
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Reduced Animations</label>
                <p className="text-xs text-muted-foreground">
                  Disable smooth transitions and animations
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedAnimations}
                onChange={(e) => updateSetting('reducedAnimations', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Reduced Motion</label>
                <p className="text-xs text-muted-foreground">
                  Minimize motion effects for accessibility
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">High Contrast</label>
                <p className="text-xs text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSetting('highContrast', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Reduced Data Usage</label>
                <p className="text-xs text-muted-foreground">
                  Limit background data and image loading
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedData}
                onChange={(e) => updateSetting('reducedData', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Enable 3D Graphics</label>
                <p className="text-xs text-muted-foreground">
                  Allow 3D charts and visualizations
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enable3D}
                onChange={(e) => updateSetting('enable3D', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                Object.keys(defaultSettings).forEach(key => {
                  updateSetting(key as keyof PerformanceSettings, defaultSettings[key as keyof PerformanceSettings]);
                });
              }}
              className="w-full"
            >
              <Settings className="h-3 w-3 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
