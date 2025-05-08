import { useEffect, useState } from "react";

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

// Function to load HERE Maps script
function loadHereMapsScript(): Promise<void> {
  if (hereMapsLoadPromise) {
    return hereMapsLoadPromise;
  }

  hereMapsLoadPromise = new Promise((resolve, reject) => {
    // Skip if already loaded
    if (isHereMapsLoaded) {
      resolve();
      return;
    }

    // Skip if already errored
    if (hereMapsLoadError) {
      reject(hereMapsLoadError);
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_HERE_API_KEY as string;
      
      if (!apiKey) {
        const error = new Error("HERE Maps API key is missing");
        hereMapsLoadError = error;
        reject(error);
        return;
      }

      // Check if script already exists
      const existingScript = document.getElementById("here-maps-script");
      if (existingScript) {
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement("script");
      script.id = "here-maps-script";
      script.type = "text/javascript";
      script.src = `https://js.api.here.com/v3/3.1/mapsjs-core.js`;
      script.async = true;
      script.defer = true;
      
      // Track loading state
      let scriptsLoaded = 0;
      const totalScripts = 5;
      
      const onScriptLoad = () => {
        scriptsLoaded++;
        if (scriptsLoaded === totalScripts) {
          isHereMapsLoaded = true;
          resolve();
        }
      };
      
      const onScriptError = (e: Event) => {
        const error = new Error("Failed to load HERE Maps API");
        hereMapsLoadError = error;
        reject(error);
      };

      script.addEventListener("load", () => {
        // Load additional scripts after the core is loaded
        const scripts = [
          "mapsjs-service.js",
          "mapsjs-mapevents.js",
          "mapsjs-ui.js",
          "mapsjs-clustering.js"
        ];
        
        // Create a link for CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = "https://js.api.here.com/v3/3.1/mapsjs-ui.css";
        document.head.appendChild(link);
        
        // Load each script sequentially
        scripts.forEach(scriptSrc => {
          const additionalScript = document.createElement("script");
          additionalScript.type = "text/javascript";
          additionalScript.src = `https://js.api.here.com/v3/3.1/${scriptSrc}`;
          additionalScript.async = true;
          additionalScript.defer = true;
          additionalScript.addEventListener("load", onScriptLoad);
          additionalScript.addEventListener("error", onScriptError);
          document.body.appendChild(additionalScript);
        });

        // Count the core script as loaded
        onScriptLoad();
      });
      
      script.addEventListener("error", onScriptError);
      
      // Append script to document
      document.body.appendChild(script);
    } catch (error) {
      hereMapsLoadError = error as Error;
      reject(error);
    }
  });

  return hereMapsLoadPromise;
}

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
      return;
    }

    // If already errored, set error state
    if (hereMapsLoadError) {
      setLoadError(hereMapsLoadError);
      return;
    }

    // Load the HERE Maps script
    loadHereMapsScript()
      .then(() => {
        if (isMounted) {
          setH(window.H as HereMapsApi);
          setIsLoaded(true);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error);
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

// Augment window interface to include HERE Maps
declare global {
  interface Window {
    H: HereMapsApi;
  }
}