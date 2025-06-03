import { useEffect, useState } from "react";
import { getHereApiKey, isHereMapsConfigured } from "./here-maps-config";

// Define the loadScript utility function
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

// Type definitions for HERE Maps API
interface HereMapsApi {
  Map: any;
  service: {
    Platform: any;
    SearchService: any;
    RoutingService: any;
  };
  mapevents: {
    MapEvents: any;
    Behavior: any;
  };
  ui: {
    UI: {
      createDefault: (map: any, defaultLayers: any) => any;
    };
  };
  map: {
    Marker: any;
    DomMarker: any;
    Group: any;
    Polyline: any;
    Polygon: any;
  };
  geo: {
    LineString: any;
    Polygon: any;
  };
  data: {
    AbstractProvider: any;
    geojson: {
      Reader: any;
    };
    Marker: any;
  };
}

interface UseHereMapsResult {
  H: HereMapsApi | null;
  isLoaded: boolean;
  loadError: Error | null;
}

// Global variables to track loading state
let isHereMapsLoaded = false;
let hereMapsLoadError: Error | null = null;
let hereMapsLoadPromise: Promise<void> | null = null;

// Function to reset HERE Maps loading state
export function resetHereMapsState(): void {
  isHereMapsLoaded = false;
  hereMapsLoadError = null;
  hereMapsLoadPromise = null;

  // Remove existing scripts
  const existingScripts = document.querySelectorAll('script[src*="here.com"]');
  existingScripts.forEach(script => script.remove());

  const existingLinks = document.querySelectorAll('link[href*="here.com"]');
  existingLinks.forEach(link => link.remove());

  console.log('HERE Maps state reset - ready for retry');
}

// Function to load HERE Maps script
export const loadHereMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if HERE Maps is already loaded
    if (window.H && window.H.Map) {
      resolve();
      return;
    }

    // Check if API key is available
    const apiKey = import.meta.env.VITE_HERE_API_KEY;
    if (!apiKey) {
      console.error('HERE Maps API key not found');
      reject(new Error('HERE Maps API key not configured'));
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js';
    script.async = true;

    script.onload = () => {
      // Load additional HERE Maps modules
      Promise.all([
        loadScript('https://js.api.here.com/v3/3.1/mapsjs-service.js'),
        loadScript('https://js.api.here.com/v3/3.1/mapsjs-ui.js'),
        loadScript('https://js.api.here.com/v3/3.1/mapsjs-mapevents.js')
      ]).then(() => {
        console.log('HERE Maps API loaded successfully');
        resolve();
      }).catch((error) => {
        console.error('Failed to load HERE Maps modules:', error);
        reject(error);
      });
    };

    script.onerror = () => {
      console.error('Failed to load HERE Maps API');
      reject(new Error('Failed to load HERE Maps API'));
    };

    document.head.appendChild(script);
  });
};

// React hook to use HERE Maps
export function useHereMaps(): UseHereMapsResult {
  const [H, setH] = useState<HereMapsApi | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(isHereMapsLoaded);
  const [loadError, setLoadError] = useState<Error | null>(hereMapsLoadError);

  useEffect(() => {
    let isMounted = true;

    // If already loaded, set state accordingly
    if (isHereMapsLoaded && window.H) {
      setH(window.H as HereMapsApi);
      setIsLoaded(true);
      setLoadError(null);
      return;
    }

    // If already errored, set error state
    if (hereMapsLoadError) {
      setLoadError(hereMapsLoadError);
      setIsLoaded(false);
      return;
    }

    // Check if API key is configured before loading
    try {
      const apiKey = getHereApiKey();
      console.log('HERE Maps API key configured, length:', apiKey.length);
    } catch (error) {
      if (isMounted) {
        const configError = error instanceof Error ? error : new Error("HERE Maps API key not configured. Please check your environment variables.");
        console.error('HERE Maps configuration error:', configError.message);
        setLoadError(configError);
        hereMapsLoadError = configError;
      }
      return;
    }

    // Load the HERE Maps script
    loadHereMapsScript()
      .then(() => {
        if (isMounted) {
          if (window.H) {
            setH(window.H as HereMapsApi);
            setIsLoaded(true);
            setLoadError(null);
          } else {
            const error = new Error("HERE Maps scripts loaded but API not available");
            setLoadError(error);
          }
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error("HERE Maps loading error:", error);
          setLoadError(error);
          setIsLoaded(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { H, isLoaded, loadError };
}

// Format coordinates in a human-readable format
export function formatDecimalCoordinates(lat: number, lng: number): string {
  const latDirection = lat >= 0 ? "N" : "S";
  const lngDirection = lng >= 0 ? "E" : "W";

  const formatCoordinate = (value: number, isLat: boolean) => {
    const absValue = Math.abs(value);
    const degrees = Math.floor(absValue);
    const minutesDecimal = (absValue - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const secondsDecimal = (minutesDecimal - minutes) * 60;
    const seconds = Math.round(secondsDecimal * 100) / 100;

    return `${degrees}° ${minutes}' ${seconds}" ${isLat ? latDirection : lngDirection}`;
  };

  return `${formatCoordinate(lat, true)}, ${formatCoordinate(lng, false)}`;
}

// Note: calculateHaversineDistance has been moved to route-planning-service.ts

// Format distance in a human-readable format
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  } else {
    return `${Math.round(distance * 10) / 10} km`;
  }
}

// HERE Maps Service Implementation
export const hereMapsService = {
  // Get API key using centralized configuration
  getApiKey(): string {
    return getHereApiKey();
  },

  // Reverse geocode coordinates to get address
  async reverseGeocode(lat: number, lng: number) {
    const apiKey = this.getApiKey();

    try {
      const response = await fetch(
        `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}&apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        return {
          position: { lat, lng },
          address: { label: data.items[0].address.label }
        };
      }

      return null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      throw error;
    }
  },

  // Geocode address to get coordinates
  async geocodeAddress(address: string) {
    const apiKey = this.getApiKey();

    try {
      const response = await fetch(
        `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          position: {
            lat: item.position.lat,
            lng: item.position.lng
          },
          address: { label: item.address.label }
        };
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      throw error;
    }
  },

  // Calculate route between two points
  async calculateRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    transportMode: "car" | "pedestrian" | "bicycle" = "car"
  ) {
    const apiKey = this.getApiKey();

    try {
      const response = await fetch(
        `https://router.hereapi.com/v8/routes?transportMode=${transportMode}&origin=${originLat},${originLng}&destination=${destLat},${destLng}&return=summary,polyline&apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Route calculation error:", error);
      throw error;
    }
  },

  // Search for places/addresses
  async searchPlaces(query: string, lat?: number, lng?: number) {
    const apiKey = this.getApiKey();

    try {
      let url = `https://discover.search.hereapi.com/v1/discover?q=${encodeURIComponent(query)}&apiKey=${apiKey}`;

      if (lat && lng) {
        url += `&at=${lat},${lng}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Place search error:", error);
      throw error;
    }
  }
};

// Format duration in a human-readable format
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

// Global diagnostics and utility functions
if (typeof window !== 'undefined') {
  (window as any).testHereMaps = async () => {
    console.log('🔍 Running HERE Maps diagnostics...');

    try {
      // Import and run diagnostics
      const { logHereDiagnostics } = await import('./here-maps-diagnostics');
      const result = await logHereDiagnostics();

      if (result.overallStatus === 'working') {
        console.log('✅ HERE Maps is working correctly');
      } else if (result.overallStatus === 'partial') {
        console.log('⚠️ HERE Maps has some issues but partially working');
      } else {
        console.log('❌ HERE Maps is not working');
        console.log('💡 Try running window.resetHereMaps() to reset and reload');
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to run diagnostics:', error);
      console.log('💡 Try running window.resetHereMaps() to reset and reload');
      return null;
    }
  };

  (window as any).resetHereMaps = () => {
    resetHereMapsState();
    console.log('HERE Maps reset complete. Refresh the page to reload.');
  };

  console.log('💡 HERE Maps diagnostics available: Run window.testHereMaps() in console to test');
}

// Augment window interface to include HERE Maps
declare global {
  interface Window {
    H: HereMapsApi;
    testHereMaps?: () => Promise<any>;
  }
}