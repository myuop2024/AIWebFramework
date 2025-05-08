import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHereMaps } from "@/lib/here-maps";

interface InteractiveMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; text?: string }>;
  height?: string | number;
  width?: string | number;
  showUserLocation?: boolean;
  showControls?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (index: number) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  center, 
  zoom = 12, 
  markers = [], 
  height = 400, 
  width = "100%", 
  showUserLocation = false, 
  showControls = true,
  onMapClick,
  onMarkerClick
}: InteractiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const { H, isLoaded, loadError } = useHereMaps();


  useEffect(() => {
    // If HERE API key is not provided, set a friendly error
    if (!import.meta.env.VITE_HERE_API_KEY) {
      setError("HERE Maps API key is missing. Please add it to your environment variables.");
      setLoading(false);
      return;
    }

    // Wait for the API to load
    if (!isLoaded) {
      return;
    }

    // Handle API loading error
    if (loadError) {
      setError("Failed to load HERE Maps API. Please try again later.");
      setLoading(false);
      return;
    }

    // Wait for DOM element to be available
    if (!mapRef.current || !H) {
      return;
    }

    let map: any = null;

    try {
      const apiKey = import.meta.env.VITE_HERE_API_KEY;
      if (!apiKey) {
        throw new Error('HERE Maps API key is required');
      }

      try {
        const platform = new H.service.Platform({
          apikey: apiKey
        });

        const defaultLayers = platform.createDefaultLayers();

        // Instantiate the map
        map = new H.Map(
          mapRef.current,
          defaultLayers.vector.normal.map,
          {
            center: center || { lat: 40.7128, lng: -74.0060 }, // Default to New York if no center provided
            zoom,
            pixelRatio: window.devicePixelRatio || 1
          }
        );

        // Store map instance in ref
        mapInstance.current = map;

        // Add map behavior (pan, zoom, etc.)
        new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

        // Add UI components (zoom, etc.)
        H.ui.UI.createDefault(map, defaultLayers);

        // Add window resize handler
        const handleResize = () => {
          if (map) {
            map.getViewPort().resize();
          }
        };
        window.addEventListener('resize', handleResize);

        // Add map click listener if onMapClick is provided
        if (onMapClick) {
          map.addEventListener('tap', (evt: any) => {
            const coords = map.screenToGeo(
              evt.currentPointer.viewportX,
              evt.currentPointer.viewportY
            );
            onMapClick(coords.lat, coords.lng);
          });
        }

        // Add markers
        if (markers && markers.length > 0) {
          markers.forEach((marker, index) => {
            if (marker.lat && marker.lng) {
              const markerObject = new H.map.Marker({ lat: marker.lat, lng: marker.lng });

              if (marker.text) {
                markerObject.setData(marker.text);
              }

              // Add marker click listener if onMarkerClick is provided
              if (onMarkerClick) {
                markerObject.addEventListener('tap', () => {
                  onMarkerClick(index);
                });
              }

              map.addObject(markerObject);
            }
          });
        }

        // Add user location marker if enabled
        if (showUserLocation) {
          getUserLocation();
        }

        setLoading(false);

        return () => {
          // Clean up event listeners
          window.removeEventListener('resize', handleResize);

          // Dispose of map instance
          if (mapInstance.current) {
            mapInstance.current.dispose();
            mapInstance.current = null;
          }
        };
      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Failed to initialize map. Please try again later.");
        setLoading(false);

        return () => {
          // Dispose of map instance on error
          if (map) {
            map.dispose();
          }
        };
      }
    } catch (err) {
      console.error("Error getting API key:", err);
      setError("Failed to get HERE Maps API key. Please check your environment variables.");
      setLoading(false);
    }
  }, [center, zoom, markers, showUserLocation, H, isLoaded, loadError, onMapClick, onMarkerClick]);

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.warn("Error getting user location:", error.message);
      }
    );
  };

    // Center on user location
  const centerOnUserLocation = () => {
    getUserLocation();
    if (userLocation && mapInstance.current) {
      mapInstance.current.setCenter(userLocation);
      mapInstance.current.setZoom(15);
    }
  };

  // Reset map to original view (This part needs adjustment based on how the original center is determined)
  const resetMapView = () => {
    if (!mapInstance.current || !center) return;
    mapInstance.current.setCenter(center);
    mapInstance.current.setZoom(zoom);
  };

  return (
    <div className={cn("relative rounded-md overflow-hidden")}>
      <div
        ref={mapRef}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: typeof width === 'number' ? `${width}px` : width,
        }}
        className="bg-accent/10"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm font-medium">Loading map...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center max-w-xs mx-auto">
            <p className="text-destructive font-medium">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Reload
            </Button>
          </div>
        </div>
      )}

      {showControls && !loading && !error && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-2">
          {showUserLocation && (
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 shadow-md bg-background"
              onClick={centerOnUserLocation}
              title="Center on my location"
            >
              <Navigation className="h-5 w-5" />
            </Button>
          )}

          {center && (
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 shadow-md bg-background"
              onClick={resetMapView}
              title="Reset view"
            >
              <MapPin className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default InteractiveMap;