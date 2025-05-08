import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export type GeolocationStatus = 'idle' | 'requesting' | 'tracking' | 'error' | 'denied';
export type GeolocationWatchOptions = {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onLocationUpdate?: (position: GeolocationPosition) => void;
  onLocationError?: (error: GeolocationPositionError) => void;
  triggerNavigationUpdate?: boolean;
};

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
};

// Global storage for active watch IDs to ensure proper cleanup
const activeWatchIds = new Set<number>();

/**
 * Get the user's current position as a one-time request
 * @returns Promise that resolves to the user's location
 */
export function getCurrentPosition(options?: PositionOptions): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed, altitude, altitudeAccuracy } = position.coords;
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy,
          heading,
          speed,
          timestamp: position.timestamp,
          altitude,
          altitudeAccuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        ...options
      }
    );
  });
}

/**
 * Start watching the user's position with continuous updates
 * @param callback Function to call with each location update
 * @param options Geolocation watch options
 * @returns Geolocation watch ID for stopping the watch later
 */
export function startPositionWatch(
  callback: (location: UserLocation) => void,
  options?: GeolocationWatchOptions
): number | null {
  if (!navigator.geolocation) {
    if (options?.onLocationError) {
      options.onLocationError({
        code: 2,
        message: "Geolocation is not supported by this browser",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
    }
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy, heading, speed, altitude, altitudeAccuracy } = position.coords;
      const locationData: UserLocation = {
        lat: latitude,
        lng: longitude,
        accuracy,
        heading,
        speed,
        timestamp: position.timestamp,
        altitude,
        altitudeAccuracy
      };
      
      callback(locationData);
      
      if (options?.onLocationUpdate) {
        options.onLocationUpdate(position);
      }
    },
    (error) => {
      if (options?.onLocationError) {
        options.onLocationError(error);
      }
    },
    {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 5000
    }
  );

  // Add to active watch IDs for cleanup on page unload
  if (watchId) {
    activeWatchIds.add(watchId);
  }

  return watchId;
}

/**
 * Stop watching the user's position
 * @param watchId Geolocation watch ID returned by startPositionWatch
 */
export function stopPositionWatch(watchId: number | null): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    activeWatchIds.delete(watchId);
  }
}

/**
 * Cleanup all active geolocation watches (useful on component unmount)
 */
export function cleanupAllPositionWatches(): void {
  activeWatchIds.forEach(id => {
    navigator.geolocation.clearWatch(id);
  });
  activeWatchIds.clear();
}

/**
 * Hook for tracking user location with state management
 */
export function useGeolocation(options?: {
  watch?: boolean;
  enableHighAccuracy?: boolean;
}) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  // Request permission and get initial location
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setError({
        code: 2,
        message: "Geolocation is not supported by this browser",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
      setStatus('error');
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive"
      });
      return;
    }

    setStatus('requesting');
    
    try {
      const position = await getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true
      });
      setLocation(position);
      setStatus(options?.watch ? 'tracking' : 'idle');
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      setError(geoError);
      setStatus('error');
      
      // Show toast for permission denied
      if (geoError.code === 1) {
        setStatus('denied');
        toast({
          title: "Location permission denied",
          description: "Please enable location permissions to use this feature.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Location error",
          description: geoError.message,
          variant: "destructive"
        });
      }
    }
  };

  // Start watching position
  const startWatching = () => {
    if (watchId !== null) {
      stopPositionWatch(watchId);
    }
    
    const newWatchId = startPositionWatch(
      (position) => {
        setLocation(position);
        setStatus('tracking');
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        onLocationError: (err) => {
          setError(err);
          setStatus(err.code === 1 ? 'denied' : 'error');
          
          if (err.code === 1) {
            toast({
              title: "Location permission denied",
              description: "Please enable location permissions to use this feature.",
              variant: "destructive"
            });
          }
        }
      }
    );
    
    setWatchId(newWatchId);
  };

  // Stop watching position
  const stopWatching = () => {
    if (watchId !== null) {
      stopPositionWatch(watchId);
      setWatchId(null);
      setStatus('idle');
    }
  };

  // Start watching on mount if specified
  useEffect(() => {
    if (options?.watch) {
      startWatching();
    } else {
      requestLocation();
    }
    
    return () => {
      if (watchId !== null) {
        stopPositionWatch(watchId);
      }
    };
  }, []);

  return {
    location,
    error,
    status,
    requestLocation,
    startWatching,
    stopWatching,
    isWatching: watchId !== null && status === 'tracking'
  };
}

// Calculate the distance and bearing to a destination
export function calculateDistanceAndBearing(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): { distance: number; bearing: number } {
  const R = 6371; // Earth's radius in km
  const lat1 = deg2rad(startLat);
  const lon1 = deg2rad(startLng);
  const lat2 = deg2rad(destLat);
  const lon2 = deg2rad(destLng);
  
  // Haversine formula
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1) * Math.cos(lat2) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Calculate bearing
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  let bearing = Math.atan2(y, x);
  bearing = rad2deg(bearing);
  bearing = (bearing + 360) % 360; // Ensure bearing is between 0-360
  
  return { distance, bearing };
}

// Helper function: Convert degrees to radians
function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

// Helper function: Convert radians to degrees
function rad2deg(rad: number): number {
  return rad * (180/Math.PI);
}

// Initialize event listener to clean up all geolocation watches on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupAllPositionWatches();
  });
}