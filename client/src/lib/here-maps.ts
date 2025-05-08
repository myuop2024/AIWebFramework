import { useEffect, useState } from "react";

// Define the window as having the H property
declare global {
  interface Window {
    H?: any;
  }
}

// Hook to load and use HERE Maps JS SDK
export function useHereMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip if HERE Maps is already loaded
    if (window.H) {
      setIsLoaded(true);
      return;
    }

    // Skip if API key is not available
    const apiKey = import.meta.env.VITE_HERE_API_KEY;
    if (!apiKey) {
      setLoadError(new Error("HERE Maps API key is missing (VITE_HERE_API_KEY)"));
      return;
    }

    // Create script elements for HERE Maps SDK
    const loadCore = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://js.api.here.com/v3/3.1/mapsjs-core.js";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error("Failed to load HERE Maps Core: " + error));
        document.head.appendChild(script);
      });
    };

    const loadService = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://js.api.here.com/v3/3.1/mapsjs-service.js";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error("Failed to load HERE Maps Service: " + error));
        document.head.appendChild(script);
      });
    };

    const loadMapEvents = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://js.api.here.com/v3/3.1/mapsjs-mapevents.js";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error("Failed to load HERE Maps Events: " + error));
        document.head.appendChild(script);
      });
    };

    const loadUI = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://js.api.here.com/v3/3.1/mapsjs-ui.js";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error("Failed to load HERE Maps UI: " + error));
        document.head.appendChild(script);
      });
    };

    const loadUICSS = () => {
      return new Promise<void>((resolve) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = "https://js.api.here.com/v3/3.1/mapsjs-ui.css";
        document.head.appendChild(link);
        resolve();
      });
    };

    // Load all HERE Maps scripts and CSS in sequence
    Promise.resolve()
      .then(loadCore)
      .then(loadService)
      .then(loadMapEvents)
      .then(loadUI)
      .then(loadUICSS)
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading HERE Maps SDK:", error);
        setLoadError(error);
      });

    // Cleanup function
    return () => {
      // No cleanup needed as scripts stay loaded
    };
  }, []);

  return {
    H: window.H,
    isLoaded,
    loadError,
  };
}

// Haversine formula to calculate distance between two geo coordinates
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  return distance;
}

// Get current geo position (promisified)
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  });
}

// Format coordinates into a consistent display format
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  
  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);
  
  const latDeg = Math.floor(latAbs);
  const latMin = Math.floor((latAbs - latDeg) * 60);
  const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(2);
  
  const lngDeg = Math.floor(lngAbs);
  const lngMin = Math.floor((lngAbs - lngDeg) * 60);
  const lngSec = ((lngAbs - lngDeg - lngMin / 60) * 3600).toFixed(2);
  
  return `${latDeg}°${latMin}'${latSec}"${latDir}, ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
}

// Format decimal coordinates into simplified format for display
export function formatDecimalCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}