import React, { createContext, useContext, useState, useEffect } from 'react';
import { Switch } from './switch';
import { Label } from './label';

interface PerformanceSettings {
  reducedAnimations: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

interface PerformanceContextType {
  settings: PerformanceSettings;
  updateSetting: (key: keyof PerformanceSettings, value: boolean) => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PerformanceSettings>({
    reducedAnimations: false,
    highContrast: false,
    reduceMotion: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('performanceSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to parse performance settings from localStorage');
      }
    }
  }, []);

  const updateSetting = (key: keyof PerformanceSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('performanceSettings', JSON.stringify(newSettings));
  };

  return (
    <PerformanceContext.Provider value={{ settings, updateSetting }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformanceSettings() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformanceSettings must be used within a PerformanceProvider');
  }
  return context;
}

export function PerformanceToggle() {
  const { settings, updateSetting } = usePerformanceSettings();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="reduced-animations">Reduced Animations</Label>
        <Switch
          id="reduced-animations"
          checked={settings.reducedAnimations}
          onCheckedChange={(checked) => updateSetting('reducedAnimations', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="high-contrast">High Contrast</Label>
        <Switch
          id="high-contrast"
          checked={settings.highContrast}
          onCheckedChange={(checked) => updateSetting('highContrast', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="reduce-motion">Reduce Motion</Label>
        <Switch
          id="reduce-motion"
          checked={settings.reduceMotion}
          onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
        />
      </div>
    </div>
  );
}