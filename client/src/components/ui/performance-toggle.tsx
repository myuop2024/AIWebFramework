
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, Zap, ZapOff } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface PerformanceSettings {
  reducedAnimations: boolean;
  reducedMotion: boolean;
  lowDataMode: boolean;
  optimizedImages: boolean;
  disableBackgroundEffects: boolean;
}

const DEFAULT_SETTINGS: PerformanceSettings = {
  reducedAnimations: false,
  reducedMotion: false,
  lowDataMode: false,
  optimizedImages: false,
  disableBackgroundEffects: false,
};

function usePerformanceSettings() {
  const [settings, setSettings] = useState<PerformanceSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load settings from localStorage only once on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('performanceSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to parse saved performance settings:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save settings to localStorage when they change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('performanceSettings', JSON.stringify(settings));
    }
  }, [settings, isInitialized]);

  // Apply reduced animations setting to document
  useEffect(() => {
    if (settings.reducedAnimations) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings.reducedAnimations]);

  const updateSetting = useCallback((key: keyof PerformanceSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  return { settings, updateSetting };
}

export function PerformanceToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting } = usePerformanceSettings();

  const isPerformanceModeActive = useMemo(() => 
    Object.values(settings).some(Boolean), 
    [settings]
  );

  const handleSettingChange = useCallback((key: keyof PerformanceSettings) => {
    return (checked: boolean) => {
      updateSetting(key, checked);
    };
  }, [updateSetting]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isPerformanceModeActive ? 'text-green-600' : 'text-gray-600'}`}
          title="Performance Settings"
        >
          {isPerformanceModeActive ? (
            <Zap className="h-4 w-4" />
          ) : (
            <ZapOff className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <h3 className="font-medium">Performance Settings</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Reduced Animations</label>
                <p className="text-xs text-gray-500">Minimize UI animations for better performance</p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedAnimations}
                onChange={(e) => handleSettingChange('reducedAnimations')(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Reduced Motion</label>
                <p className="text-xs text-gray-500">Respect system motion preferences</p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => handleSettingChange('reducedMotion')(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Low Data Mode</label>
                <p className="text-xs text-gray-500">Reduce data usage for mobile connections</p>
              </div>
              <input
                type="checkbox"
                checked={settings.lowDataMode}
                onChange={(e) => handleSettingChange('lowDataMode')(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Optimized Images</label>
                <p className="text-xs text-gray-500">Load compressed images for faster loading</p>
              </div>
              <input
                type="checkbox"
                checked={settings.optimizedImages}
                onChange={(e) => handleSettingChange('optimizedImages')(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Disable Background Effects</label>
                <p className="text-xs text-gray-500">Turn off visual effects and gradients</p>
              </div>
              <input
                type="checkbox"
                checked={settings.disableBackgroundEffects}
                onChange={(e) => handleSettingChange('disableBackgroundEffects')(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>
          
          {isPerformanceModeActive && (
            <div className="pt-2 border-t">
              <p className="text-xs text-green-600 flex items-center">
                <Zap className="h-3 w-3 mr-1" />
                Performance mode is active
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
