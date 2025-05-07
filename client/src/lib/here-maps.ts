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

export function useHereMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const apiKey = import.meta.env.VITE_HERE_API_KEY || '';

  useEffect(() => {
    // Check if the API is already loaded
    if (window.H) {
      setIsLoaded(true);
      return;
    }

    // Load the HERE Maps JavaScript API
    const loadAPI = async () => {
      try {
        // Load core module
        const coreScript = document.createElement('script');
        coreScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js';
        coreScript.async = true;
        
        // Load service module
        const serviceScript = document.createElement('script');
        serviceScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-service.js';
        serviceScript.async = true;
        
        // Load events module (for map interactivity)
        const eventsScript = document.createElement('script');
        eventsScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js';
        eventsScript.async = true;
        
        // Load UI module (for controls)
        const uiScript = document.createElement('script');
        uiScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-ui.js';
        uiScript.async = true;
        
        // Load UI CSS
        const uiCss = document.createElement('link');
        uiCss.rel = 'stylesheet';
        uiCss.type = 'text/css';
        uiCss.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
        
        // Append scripts to document head
        document.head.appendChild(coreScript);
        document.head.appendChild(serviceScript);
        document.head.appendChild(eventsScript);
        document.head.appendChild(uiScript);
        document.head.appendChild(uiCss);
        
        // Wait for all scripts to load
        await Promise.all([
          new Promise<void>((resolve) => { coreScript.onload = () => resolve(); }),
          new Promise<void>((resolve) => { serviceScript.onload = () => resolve(); }),
          new Promise<void>((resolve) => { eventsScript.onload = () => resolve(); }),
          new Promise<void>((resolve) => { uiScript.onload = () => resolve(); }),
        ]);
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load HERE Maps API:', error);
        setLoadError(error instanceof Error ? error : new Error('Failed to load HERE Maps API'));
      }
    };
    
    loadAPI();
    
    // Cleanup function
    return () => {
      // No cleanup needed for script tags
    };
  }, [apiKey]);
  
  return { 
    H: window.H,
    isLoaded,
    loadError
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
    this.apiKey = import.meta.env.VITE_HERE_API_KEY || '';
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
    transportMode: 'car' | 'pedestrian' | 'bicycle' = 'car'
  ): Promise<HereRoute | null> {
    try {
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        transportMode: transportMode,
        origin: `${startLat},${startLng}`,
        destination: `${endLat},${endLng}`,
        return: 'polyline,summary,typicalDuration,actions'
      });

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