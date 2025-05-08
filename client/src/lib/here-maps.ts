/**
 * HERE Maps API integration for CAFFE Observer Platform
 * Provides address autocomplete, geocoding, map viewing, and route planning
 */
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    H: any; // HERE Maps JavaScript API global object
  }
}

/**
 * Load HERE Maps scripts in sequence (non-async) to ensure proper dependency loading
 * This solves issues with script loading order and dependencies
 */
const loadHereMapsScripts = (callback: () => void) => {
  const apiKey = import.meta.env.VITE_HERE_API_KEY;
  if (!apiKey) {
    console.error('HERE Maps API key is missing in environment variables');
    return;
  }

  // Track loaded scripts
  const scripts = [
    'https://js.api.here.com/v3/3.1/mapsjs-core.js',
    'https://js.api.here.com/v3/3.1/mapsjs-service.js',
    'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js',
    'https://js.api.here.com/v3/3.1/mapsjs-ui.js'
  ];
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
  document.head.appendChild(link);
  
  // Load scripts in sequence
  let loaded = 0;
  function loadScript(index: number) {
    if (index >= scripts.length) {
      callback();
      return;
    }
    
    const script = document.createElement('script');
    script.src = scripts[index];
    script.onload = () => loadScript(index + 1); // Load next script when this one loads
    script.onerror = (e) => console.error('Error loading HERE Maps script:', e);
    document.head.appendChild(script);
  }
  
  // Start loading the first script
  loadScript(0);
};

// Global variable to track if loading has started
let isLoadingStarted = false;
// Global variable to track if loading is complete
let isHereMapsLoaded = false;
// Callbacks to execute when loading is complete
const loadCallbacks: Array<() => void> = [];

/**
 * Start the loading process and register a callback
 */
function initHereMaps(callback: () => void) {
  // Add this callback to the queue
  loadCallbacks.push(callback);
  
  // If already loaded, execute callback immediately
  if (isHereMapsLoaded) {
    callback();
    return;
  }
  
  // If loading is already in progress, just wait
  if (isLoadingStarted) {
    return;
  }
  
  // Start loading
  isLoadingStarted = true;
  loadHereMapsScripts(() => {
    isHereMapsLoaded = true;
    // Execute all callbacks
    loadCallbacks.forEach(cb => cb());
  });
}

/**
 * React Hook for using HERE Maps in components
 */
export function useHereMaps() {
  const [isLoaded, setIsLoaded] = useState(isHereMapsLoaded);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const apiKey = import.meta.env.VITE_HERE_API_KEY;

  useEffect(() => {
    // If already loaded, update state
    if (isHereMapsLoaded) {
      setIsLoaded(true);
      return;
    }

    // If API key is missing, set error
    if (!apiKey) {
      setLoadError(new Error('HERE Maps API key is missing in environment variables'));
      return;
    }

    // Load HERE Maps
    const handleLoad = () => {
      setIsLoaded(true);
    };
    
    initHereMaps(handleLoad);
    
    return () => {
      // No cleanup needed for script tags
    };
  }, [apiKey]);
  
  return { 
    H: window.H,
    isLoaded,
    loadError,
    apiKey
  };
}

// Define types for HERE API responses
export interface HereAutocompleteResult {
  title: string;
  id: string;
  resultType: string;
  address: {
    label: string;
    countryCode: string;
    countryName: string;
    state: string;
    county: string;
    city: string;
    district: string;
    street: string;
    postalCode: string;
    houseNumber?: string;
  };
  position: {
    lat: number;
    lng: number;
  };
}

export interface HereGeocodeResult {
  title: string;
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  address: {
    label: string;
    countryCode: string;
    countryName: string;
    state: string;
    county: string;
    city: string;
    district: string;
    street: string;
    postalCode: string;
    houseNumber?: string;
  };
}

export interface HereRoute {
  routes: {
    id: string;
    sections: {
      id: string;
      type: string;
      departure: {
        place: {
          type: string;
          location: {
            lat: number;
            lng: number;
          };
        };
        time: string;
      };
      arrival: {
        place: {
          type: string;
          location: {
            lat: number;
            lng: number;
          };
        };
        time: string;
      };
      summary: {
        duration: number;
        length: number;
      };
      polyline: string;
    }[];
  }[];
}

// Service class for HERE Maps API
export class HereMapsService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_HERE_API_KEY;
    if (!this.apiKey) {
      console.error('HERE Maps API key is missing');
    }
    this.baseUrl = 'https://autocomplete.search.hereapi.com/v1';
  }

  /**
   * Search for addresses as user types (autocomplete)
   */
  async autocompleteAddress(query: string, country?: string): Promise<HereAutocompleteResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        apiKey: this.apiKey,
        limit: '5',
        resultTypes: 'address',
        lang: 'en'
      });

      if (country) {
        params.append('in', `countryCode:${country}`);
      }

      const response = await fetch(`${this.baseUrl}/autocomplete?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching address suggestions: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error in autocompleteAddress:', error);
      return [];
    }
  }

  /**
   * Get coordinates from an address (geocoding)
   */
  async geocodeAddress(address: string): Promise<HereGeocodeResult | null> {
    try {
      const params = new URLSearchParams({
        q: address,
        apiKey: this.apiKey,
        limit: '1'
      });

      const response = await fetch(`https://geocode.search.hereapi.com/v1/geocode?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error geocoding address: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.items?.length > 0 ? data.items[0] : null;
    } catch (error) {
      console.error('Error in geocodeAddress:', error);
      return null;
    }
  }

  /**
   * Get address from coordinates (reverse geocoding)
   */
  async reverseGeocode(lat: number, lng: number): Promise<HereGeocodeResult | null> {
    try {
      const params = new URLSearchParams({
        at: `${lat},${lng}`,
        apiKey: this.apiKey,
        limit: '1'
      });

      const response = await fetch(`https://revgeocode.search.hereapi.com/v1/revgeocode?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error reverse geocoding: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.items?.length > 0 ? data.items[0] : null;
    } catch (error) {
      console.error('Error in reverseGeocode:', error);
      return null;
    }
  }

  /**
   * Calculate route between two points
   */
  async calculateRoute(
    startLat: number, 
    startLng: number, 
    endLat: number, 
    endLng: number, 
    transportMode: 'car' | 'pedestrian' | 'bicycle' = 'car',
    options?: {
      departureTime?: Date;
      considerTraffic?: boolean;
      avoidHighways?: boolean;
      avoidTolls?: boolean;
      weatherAware?: boolean;
    }
  ): Promise<HereRoute | null> {
    try {
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        transportMode: transportMode,
        origin: `${startLat},${startLng}`,
        destination: `${endLat},${endLng}`,
        return: 'polyline,summary,typicalDuration,actions'
      });

      // Add optional parameters
      if (options) {
        // Handle departure time
        if (options.departureTime) {
          params.append('departureTime', options.departureTime.toISOString());
        }

        // Consider traffic (traffic-aware routing)
        if (options.considerTraffic) {
          params.append('computeTravelTimeFor', 'all');
          params.append('routingMode', 'fast');
        }

        // Avoid highways
        if (options.avoidHighways) {
          params.append('avoid[features]', 'controlledAccessHighway');
        }

        // Avoid toll roads
        if (options.avoidTolls) {
          params.append('avoid[features]', 'tollRoad');
        }

        // Weather-aware routing (approximation via traffic awareness)
        if (options.weatherAware && options.considerTraffic) {
          params.append('computeTravelTimeFor', 'all');
        }
      }

      const response = await fetch(`https://router.hereapi.com/v8/routes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error calculating route: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in calculateRoute:', error);
      return null;
    }
  }

  /**
   * Get the HERE Maps API key for components that need direct access
   */
  getApiKey(): string {
    return this.apiKey;
  }
}

// Create a singleton instance of the service
export const hereMapsService = new HereMapsService();

// Map display helper functions
export const createMapLink = (lat: number, lng: number, zoom: number = 14): string => {
  return `https://www.here.com/directions/drive/${lat},${lng}?map=${lat},${lng},${zoom},normal`;
};

export const createStaticMapUrl = (
  lat: number, 
  lng: number, 
  width: number = 600, 
  height: number = 400, 
  zoom: number = 14
): string => {
  const params = new URLSearchParams({
    apiKey: hereMapsService.getApiKey(),
    at: `${lat},${lng}`,
    z: zoom.toString(),
    w: width.toString(),
    h: height.toString()
  });
  
  return `https://static-maps-api.here.com/api/maps/v3/snapshot?${params.toString()}`;
};

/**
 * Format a distance in meters to a human-readable format
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
};

/**
 * Format a duration in seconds to a human-readable format
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};