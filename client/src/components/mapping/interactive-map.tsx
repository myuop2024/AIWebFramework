import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, RotateCw, Map, Pause, Play, SkipForward } from "lucide-react";
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
  routePolyline?: string;
  navigationMode?: boolean;
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
  routePolyline,
  navigationMode = false,
  onMapClick,
  onMarkerClick
}: InteractiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [navigationPaused, setNavigationPaused] = useState(false);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState("10 mins"); // Will be dynamically calculated
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
        
        // Add route polyline if provided
        if (routePolyline && map) {
          try {
            // Parse the polyline string using HERE Maps utility
            const lineString = H.geo.LineString.fromFlexiblePolyline(routePolyline);
            
            // Create a polyline object for the route
            const routeLine = new H.map.Polyline(lineString, {
              style: {
                lineWidth: navigationMode ? 7 : 5,
                strokeColor: navigationMode ? '#0078D4' : '#36B37E',
                lineDash: navigationMode ? undefined : [2, 2]
              }
            });
            
            // Add it to the map
            map.addObject(routeLine);
            
            // Adjust the viewport to fit the route when first added
            if (lineString.getPointCount() > 1) {
              map.getViewModel().setLookAtData({
                bounds: routeLine.getBoundingBox()
              });
            }
          } catch (err) {
            console.error("Error rendering route polyline:", err);
          }
        }
        
        // If in navigation mode, set map in tracking mode and higher zoom
        if (navigationMode && showUserLocation && userLocation) {
          // Center on user location with higher zoom level
          map.setCenter(userLocation);
          map.setZoom(16); // Higher zoom for navigation
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
  }, [center, zoom, markers, showUserLocation, routePolyline, navigationMode, H, isLoaded, loadError, onMapClick, onMarkerClick]);

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
  
  // Set up continuous location tracking for navigation mode
  useEffect(() => {
    if (!navigationMode || !showUserLocation || navigationPaused) {
      return; // Don't track if not in navigation mode or paused
    }
    
    // Initialize with current location
    getUserLocation();
    
    // Set up interval for continuous tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        
        // Update map view to follow user in navigation mode
        if (mapInstance.current) {
          mapInstance.current.setCenter(newLocation);
        }
        
        // Update ETA dynamically based on new position
        // This would be based on distance to destination and average speed
        if (markers.length > 0 && selectedMarkerIndex < markers.length) {
          const destination = markers[selectedMarkerIndex];
          
          // Simple calculation for demo purposes (in a real app, this would use the routing service)
          // Calculate distance and estimate arrival time
          updateArrivalEstimate(newLocation, destination);
        }
      },
      (error) => {
        console.warn("Error tracking location:", error.message);
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 10000,  // Accept positions from last 10 seconds
        timeout: 5000       // Time to wait for a position
      }
    );
    
    // Clean up function to stop tracking when component unmounts or mode changes
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [navigationMode, showUserLocation, navigationPaused, selectedMarkerIndex, markers]);
  
  // Update the ETA based on current position and destination
  const updateArrivalEstimate = (current: { lat: number, lng: number }, destination: { lat: number, lng: number }) => {
    if (!current || !destination) return;
    
    // Simple distance calculation (Haversine formula)
    const R = 6371; // Earth radius in km
    const dLat = (destination.lat - current.lat) * Math.PI / 180;
    const dLon = (destination.lng - current.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(current.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    // Estimate time based on average walking/driving speed
    // Assume average speed of 30 km/h for demonstration
    const speed = 30; // km/h
    const timeHours = distance / speed;
    const timeMinutes = Math.round(timeHours * 60);
    
    // Update the ETA state
    setEstimatedTime(`${timeMinutes} mins`);
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
  
  // Toggle navigation pause state
  const toggleNavigationPause = () => {
    setNavigationPaused(!navigationPaused);
    // In a full implementation, this would pause/resume the real-time tracking and location updates
  };
  
  // Go to previous marker/destination in the route
  const goToPreviousDestination = () => {
    if (markers.length === 0) return;
    
    const newIndex = selectedMarkerIndex > 0 
      ? selectedMarkerIndex - 1 
      : markers.length - 1; // Loop back to the end if at the beginning
      
    setSelectedMarkerIndex(newIndex);
    
    // Center map on the selected marker
    if (mapInstance.current && markers[newIndex]) {
      mapInstance.current.setCenter({
        lat: markers[newIndex].lat,
        lng: markers[newIndex].lng
      });
      mapInstance.current.setZoom(15);
      
      // In a full implementation, this would recalculate routes from current position
      // to the newly selected destination
    }
  };
  
  // Go to next marker/destination in the route
  const goToNextDestination = () => {
    if (markers.length === 0) return;
    
    const newIndex = (selectedMarkerIndex + 1) % markers.length; // Loop back to start if at the end
    setSelectedMarkerIndex(newIndex);
    
    // Center map on the selected marker
    if (mapInstance.current && markers[newIndex]) {
      mapInstance.current.setCenter({
        lat: markers[newIndex].lat,
        lng: markers[newIndex].lng
      });
      mapInstance.current.setZoom(15);
      
      // In a full implementation, this would recalculate routes from current position
      // to the newly selected destination
    }
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

          {center && !navigationMode && (
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
      
      {/* Navigation Mode Controls */}
      {navigationMode && !loading && !error && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-center items-center">
          <div className="bg-background rounded-md shadow-lg p-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Previous destination"
              onClick={goToPreviousDestination}
            >
              <SkipForward className="h-4 w-4 rotate-180" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              className="h-12 w-12 rounded-full bg-primary"
              title="Pause/Resume navigation"
              onClick={toggleNavigationPause}
            >
              {navigationPaused ? (
                <Play className="h-6 w-6 text-primary-foreground" />
              ) : (
                <Pause className="h-6 w-6 text-primary-foreground" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Next destination"
              onClick={goToNextDestination}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
            <div className="ml-2 bg-muted p-2 rounded-md text-xs">
              <div className="font-medium">Next destination</div>
              <div className="text-muted-foreground truncate max-w-[150px]">
                {markers[selectedMarkerIndex]?.text || "Polling Station"}
              </div>
              <div className="mt-1 text-primary font-semibold">ETA: {estimatedTime}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveMap;