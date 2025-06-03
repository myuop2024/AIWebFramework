/**
 * HERE Maps Debug Hook
 * Provides debugging information and utilities for HERE Maps integration
 */

import { useEffect, useState } from 'react';
import { isHereMapsConfigured } from '@/lib/here-maps-config';
import { useHereMaps } from '@/lib/here-maps';

export interface HereMapsDebugInfo {
  apiKeyConfigured: boolean;
  apiKeySource: string | null;
  hereMapsLoaded: boolean;
  loadError: Error | null;
  scriptTags: number;
  windowHAvailable: boolean;
}

export function useHereMapsDebug() {
  const { H, isLoaded, loadError } = useHereMaps();
  const [debugInfo, setDebugInfo] = useState<HereMapsDebugInfo>({
    apiKeyConfigured: false,
    apiKeySource: null,
    hereMapsLoaded: false,
    loadError: null,
    scriptTags: 0,
    windowHAvailable: false
  });

  useEffect(() => {
    // Check API key configuration
    const configured = isHereMapsConfigured();
    
    // Determine API key source
    let apiKeySource = null;
    if (import.meta.env.VITE_HERE_API_KEY) {
      apiKeySource = 'import.meta.env';
    } else if (process.env.VITE_HERE_API_KEY) {
      apiKeySource = 'process.env';
    } else if (typeof window !== 'undefined' && (window as any).REPL_SECRETS?.VITE_HERE_API_KEY) {
      apiKeySource = 'Replit Secrets';
    }

    // Count HERE Maps script tags
    const scriptTags = document.querySelectorAll('script[src*="here.com"]').length;

    // Check if window.H is available
    const windowHAvailable = typeof window !== 'undefined' && !!(window as any).H;

    setDebugInfo({
      apiKeyConfigured: configured,
      apiKeySource,
      hereMapsLoaded: isLoaded,
      loadError,
      scriptTags,
      windowHAvailable
    });
  }, [isLoaded, loadError]);

  const logDebugInfo = () => {
    // Intentionally left blank: no console.log or console.warn
  };

  return {
    debugInfo,
    logDebugInfo,
    isConfigured: debugInfo.apiKeyConfigured,
    isReady: debugInfo.hereMapsLoaded && debugInfo.windowHAvailable
  };
} 