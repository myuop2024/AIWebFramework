import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Zap, ZapOff } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Switch } from './switch';
import { Label } from './label';

interface PerformanceSettings {
  animations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
}

const defaultSettings: PerformanceSettings = {
  animations: true,
  reducedMotion: false,
  highContrast: false,
  largeText: false,
};

// Custom hook for performance settings
export function usePerformanceSettings() {
  const [isHighPerformance, setIsHighPerformance] = useState(() => {
    const saved = localStorage.getItem('highPerformanceMode');
    return saved ? JSON.parse(saved) : false;
  });

  const togglePerformance = useCallback(() => {
    const newValue = !isHighPerformance;
    setIsHighPerformance(newValue);
    localStorage.setItem('highPerformanceMode', JSON.stringify(newValue));
  }, [isHighPerformance]);

  return { isHighPerformance, togglePerformance };
}

export function PerformanceToggle() {
  const [settings, setSettings] = useState<PerformanceSettings>(defaultSettings);
  const [isOpen, setIsOpen] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('performance-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.warn('Failed to parse performance settings:', error);
      }
    }
  }, []); // Empty dependency array - only run on mount

  // Save settings to localStorage when settings change
  useEffect(() => {
    localStorage.setItem('performance-settings', JSON.stringify(settings));

    // Apply settings to document
    const root = document.documentElement;

    if (settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0ms');
      root.style.setProperty('--transition-duration', '0ms');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
  }, [settings]); // Only depend on settings

  const updateSetting = useCallback((key: keyof PerformanceSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const isHighPerformance = settings.animations && !settings.reducedMotion;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title={isHighPerformance ? "High Performance Mode" : "Accessibility Mode"}
        >
          {isHighPerformance ? (
            <Zap className="h-4 w-4 text-green-600" />
          ) : (
            <ZapOff className="h-4 w-4 text-orange-600" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <h3 className="font-medium">Performance & Accessibility</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="animations" className="text-sm">
                Enable Animations
              </Label>
              <Switch
                id="animations"
                checked={settings.animations}
                onCheckedChange={(checked) => updateSetting('animations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reduced-motion" className="text-sm">
                Reduce Motion
              </Label>
              <Switch
                id="reduced-motion"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="high-contrast" className="text-sm">
                High Contrast
              </Label>
              <Switch
                id="high-contrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="large-text" className="text-sm">
                Large Text
              </Label>
              <Switch
                id="large-text"
                checked={settings.largeText}
                onCheckedChange={(checked) => updateSetting('largeText', checked)}
              />
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PerformanceToggle;