import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, Eye, Type, Volume2, Keyboard, 
  Monitor, CheckCircle, Info, Accessibility 
} from 'lucide-react';

interface AccessibilitySettings {
  voiceControl: boolean;
  highContrast: boolean;
  largeText: boolean;
  audioDescription: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
}

const defaultSettings: AccessibilitySettings = {
  voiceControl: false,
  highContrast: false,
  largeText: false,
  audioDescription: false,
  screenReaderOptimized: false,
  keyboardNavigation: true,
  reducedMotion: false,
};

export default function AccessibilitySettingsComponent() {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      applySettings(parsed);
    }

    // Check for voice control support
    setVoiceSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  // Apply settings to the document
  const applySettings = (newSettings: AccessibilitySettings) => {
    const root = document.documentElement;
    
    // High Contrast
    if (newSettings.highContrast) {
      root.classList.add('high-contrast');
      root.style.setProperty('--contrast-multiplier', '2');
    } else {
      root.classList.remove('high-contrast');
      root.style.setProperty('--contrast-multiplier', '1');
    }

    // Large Text
    if (newSettings.largeText) {
      root.classList.add('large-text');
      root.style.fontSize = '120%';
    } else {
      root.classList.remove('large-text');
      root.style.fontSize = '100%';
    }

    // Reduced Motion
    if (newSettings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Screen Reader Optimized
    if (newSettings.screenReaderOptimized) {
      root.setAttribute('aria-live', 'polite');
    } else {
      root.removeAttribute('aria-live');
    }
  };

  // Handle setting change
  const handleSettingChange = (key: keyof AccessibilitySettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    applySettings(newSettings);
    setSaved(false);

    // Special handling for voice control
    if (key === 'voiceControl' && value && voiceSupported) {
      initializeVoiceControl();
    }
  };

  // Initialize voice control
  const initializeVoiceControl = () => {
    if (!voiceSupported) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
      handleVoiceCommand(command);
    };

    recognition.start();
  };

  // Handle voice commands
  const handleVoiceCommand = (command: string) => {
    // Simple command mapping
    if (command.includes('go to dashboard')) {
      window.location.href = '/dashboard';
    } else if (command.includes('submit report')) {
      window.location.href = '/reports/new';
    } else if (command.includes('help')) {
      window.location.href = '/faq';
    }
    // Add more commands as needed
  };

  // Save settings
  const saveSettings = () => {
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettings(defaultSettings);
    applySettings(defaultSettings);
    localStorage.removeItem('accessibilitySettings');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5" />
          Accessibility Settings
        </CardTitle>
        <CardDescription>
          Customize your experience with accessibility features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Control */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-3">
            <Mic className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="voice-control" className="text-base">
                Voice Control
              </Label>
              <p className="text-sm text-gray-500">
                Navigate using voice commands
              </p>
            </div>
          </div>
          <Switch
            id="voice-control"
            checked={settings.voiceControl}
            onCheckedChange={(checked) => handleSettingChange('voiceControl', checked)}
            disabled={!voiceSupported}
          />
        </div>

        {!voiceSupported && settings.voiceControl && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Voice control is not supported in your browser. Try using Chrome or Edge.
            </AlertDescription>
          </Alert>
        )}

        {/* High Contrast */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-3">
            <Monitor className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="high-contrast" className="text-base">
                High Contrast Mode
              </Label>
              <p className="text-sm text-gray-500">
                Increase contrast for better visibility
              </p>
            </div>
          </div>
          <Switch
            id="high-contrast"
            checked={settings.highContrast}
            onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
          />
        </div>

        {/* Large Text */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-3">
            <Type className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="large-text" className="text-base">
                Large Text
              </Label>
              <p className="text-sm text-gray-500">
                Increase text size by 20%
              </p>
            </div>
          </div>
          <Switch
            id="large-text"
            checked={settings.largeText}
            onCheckedChange={(checked) => handleSettingChange('largeText', checked)}
          />
        </div>

        {/* Audio Description */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-3">
            <Volume2 className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="audio-description" className="text-base">
                Audio Descriptions
              </Label>
              <p className="text-sm text-gray-500">
                Enable audio descriptions for visual content
              </p>
            </div>
          </div>
          <Switch
            id="audio-description"
            checked={settings.audioDescription}
            onCheckedChange={(checked) => handleSettingChange('audioDescription', checked)}
          />
        </div>

        {/* Screen Reader Optimization */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-3">
            <Eye className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="screen-reader" className="text-base">
                Screen Reader Optimization
              </Label>
              <p className="text-sm text-gray-500">
                Optimize for screen reader software
              </p>
            </div>
          </div>
          <Switch
            id="screen-reader"
            checked={settings.screenReaderOptimized}
            onCheckedChange={(checked) => handleSettingChange('screenReaderOptimized', checked)}
          />
        </div>

        {/* Keyboard Navigation */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-3">
            <Keyboard className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="keyboard-nav" className="text-base">
                Enhanced Keyboard Navigation
              </Label>
              <p className="text-sm text-gray-500">
                Navigate using keyboard shortcuts
              </p>
            </div>
          </div>
          <Switch
            id="keyboard-nav"
            checked={settings.keyboardNavigation}
            onCheckedChange={(checked) => handleSettingChange('keyboardNavigation', checked)}
          />
        </div>

        {/* Reduced Motion */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-3">
            <Monitor className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="reduced-motion" className="text-base">
                Reduce Motion
              </Label>
              <p className="text-sm text-gray-500">
                Minimize animations and transitions
              </p>
            </div>
          </div>
          <Switch
            id="reduced-motion"
            checked={settings.reducedMotion}
            onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={resetSettings}>
            Reset to Defaults
          </Button>
          <Button onClick={saveSettings} className="flex items-center gap-2">
            {saved && <CheckCircle className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save Settings'}
          </Button>
        </div>

        {/* Voice Commands Help */}
        {settings.voiceControl && voiceSupported && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Available voice commands:</p>
              <ul className="text-sm space-y-1">
                <li>• "Go to dashboard" - Navigate to dashboard</li>
                <li>• "Submit report" - Go to report submission</li>
                <li>• "Help" - Open help page</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 