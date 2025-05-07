import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, RotateCw } from "lucide-react";
import { hereMapsService } from "@/lib/here-maps";
import { cn } from "@/lib/utils";

interface InteractiveMapProps {
  latitude?: number;
  longitude?: number;
  markers?: Array<{
    lat: number;
    lng: number;
    title?: string;
    color?: string;
  }>;
  height?: string | number;
  width?: string | number;
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (index: number) => void;
  className?: string;
  showUserLocation?: boolean;
  showControls?: boolean;
}

export default function InteractiveMap({
  latitude,
  longitude,
  markers = [],
  height = 400,
  width = "100%",
  zoom = 14,
  onMapClick,
  onMarkerClick,
  className,
  showUserLocation = false,
  showControls = true,
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjectRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Initialize and cleanup the map
  useEffect(() => {
    // First, load the HERE Maps script
    const loadHereMaps = () => {
      if (window.H) {
        initializeMap();
        return;
      }

      const scriptElement = document.createElement("script");
      scriptElement.type = "text/javascript";
      scriptElement.src = `https://js.api.here.com/v3/3.1/mapsjs-core.js`;
      scriptElement.async = true;
      scriptElement.onload = () => {
        const serviceScript = document.createElement("script");
        serviceScript.type = "text/javascript";
        serviceScript.src = `https://js.api.here.com/v3/3.1/mapsjs-service.js`;
        serviceScript.async = true;
        serviceScript.onload = () => {
          const uiScript = document.createElement("script");
          uiScript.type = "text/javascript";
          uiScript.src = `https://js.api.here.com/v3/3.1/mapsjs-ui.js`;
          uiScript.async = true;
          uiScript.onload = () => {
            const eventsScript = document.createElement("script");
            eventsScript.type = "text/javascript";
            eventsScript.src = `https://js.api.here.com/v3/3.1/mapsjs-mapevents.js`;
            eventsScript.async = true;
            eventsScript.onload = initializeMap;
            document.body.appendChild(eventsScript);
          };
          document.body.appendChild(uiScript);
        };
        document.body.appendChild(serviceScript);
      };
      document.body.appendChild(scriptElement);
    };

    const initializeMap = () => {
      try {
        // Check if resources are loaded
        if (!window.H || !window.H.map || !window.H.service || !window.H.ui) {
          throw new Error("HERE Maps resources are not fully loaded");
        }
        
        // Create platform with API key
        const platform = new window.H.service.Platform({
          apikey: hereMapsService.getApiKey()
        });

        // Get default layers
        const defaultLayers = platform.createDefaultLayers();

        // Create map instance
        const map = new window.H.Map(
          mapRef.current,
          defaultLayers.vector.normal.map,
          {
            zoom: zoom,
            center: {
              lat: latitude || 0,
              lng: longitude || 0,
            },
            pixelRatio: window.devicePixelRatio || 1,
          }
        );

        // Add map controls
        if (showControls) {
          // Add UI components
          const ui = new window.H.ui.UI.createDefault(map, defaultLayers);
          
          // Enable map interaction (pan, zoom, etc.)
          const behavior = new window.H.mapevents.Behavior(
            new window.H.mapevents.MapEvents(map)
          );
        }

        // Store map reference
        mapObjectRef.current = map;

        // Add user location marker if enabled
        if (showUserLocation) {
          getUserLocation();
        }

        // Add map click handler
        if (onMapClick) {
          map.addEventListener('tap', (evt: any) => {
            const coord = map.screenToGeo(
              evt.currentPointer.viewportX,
              evt.currentPointer.viewportY
            );
            onMapClick(coord.lat, coord.lng);
          });
        }

        setLoading(false);
      } catch (err) {
        console.error("Error initializing HERE map:", err);
        setError("Failed to load map. Please try again later.");
        setLoading(false);
      }
    };

    loadHereMaps();

    // Cleanup function
    return () => {
      if (mapObjectRef.current) {
        mapObjectRef.current.dispose();
      }
    };
  }, []);

  // Update map center and zoom when props change
  useEffect(() => {
    if (!mapObjectRef.current || !latitude || !longitude) return;
    
    mapObjectRef.current.setCenter({ lat: latitude, lng: longitude });
    mapObjectRef.current.setZoom(zoom);
  }, [latitude, longitude, zoom]);

  // Update markers when they change
  useEffect(() => {
    if (!mapObjectRef.current) return;

    // Clear existing markers
    mapObjectRef.current.removeObjects(mapObjectRef.current.getObjects());

    // Add new markers
    const markerGroup = new window.H.map.Group();
    
    markers.forEach((marker, index) => {
      const markerObject = new window.H.map.Marker({
        lat: marker.lat,
        lng: marker.lng
      });
      
      // Add click event to markers
      if (onMarkerClick) {
        markerObject.addEventListener('tap', () => {
          onMarkerClick(index);
        });
      }
      
      markerGroup.addObject(markerObject);
    });

    // Add user location marker if available
    if (userLocation && showUserLocation) {
      const userMarker = new window.H.map.Marker({
        lat: userLocation.lat,
        lng: userLocation.lng
      }, {
        icon: new window.H.map.Icon(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#3B82F6" fill-opacity="0.3" />
            <circle cx="12" cy="12" r="5" fill="#3B82F6" />
            <circle cx="12" cy="12" r="3" fill="white" />
          </svg>
        `)
      });
      
      markerGroup.addObject(userMarker);
    }
    
    mapObjectRef.current.addObject(markerGroup);
  }, [markers, userLocation, showUserLocation]);

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
        
        // Center on user location if no specific coordinates provided
        if (!mapObjectRef.current) return;
        
        if (!markers.length && (!latitude || !longitude)) {
          mapObjectRef.current.setCenter({ lat: latitude, lng: longitude });
          mapObjectRef.current.setZoom(15);
        }
      },
      (error) => {
        console.warn("Error getting user location:", error.message);
      }
    );
  };

  // Center on user location
  const centerOnUserLocation = () => {
    getUserLocation();
    if (userLocation && mapObjectRef.current) {
      mapObjectRef.current.setCenter(userLocation);
      mapObjectRef.current.setZoom(15);
    }
  };

  // Reset map to original view
  const resetMapView = () => {
    if (!mapObjectRef.current || !latitude || !longitude) return;
    mapObjectRef.current.setCenter({ lat: latitude, lng: longitude });
    mapObjectRef.current.setZoom(zoom);
  };

  return (
    <div className={cn("relative rounded-md overflow-hidden", className)}>
      {/* Map container */}
      <div 
        ref={mapRef} 
        style={{ 
          height: typeof height === 'number' ? `${height}px` : height,
          width: typeof width === 'number' ? `${width}px` : width,
        }}
        className="bg-accent/10"
      />
      
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm font-medium">Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Error state */}
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
      
      {/* Map controls */}
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
          
          {latitude && longitude && (
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

// Add custom declaration for HERE Maps
declare global {
  interface Window {
    H: any;
  }
}