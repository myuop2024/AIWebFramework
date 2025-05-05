import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, MapPin, Navigation } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface MapLocation {
  lat: number;
  lng: number;
  label?: string;
  id?: number;
  description?: string;
  riskLevel?: 'high' | 'medium' | 'low' | 'none';
}

interface InteractiveMapProps {
  locations: MapLocation[];
  height?: string;
  width?: string;
  initialZoom?: number;
  onLocationSelect?: (location: MapLocation) => void;
  centerLocation?: MapLocation;
  showUserLocation?: boolean;
  className?: string;
}

export function InteractiveMap({
  locations = [],
  height = "400px",
  width = "100%",
  initialZoom = 10,
  onLocationSelect,
  centerLocation,
  showUserLocation = false,
  className,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingUserLocation, setLoadingUserLocation] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // This will simulate a map with an SVG for now
  // In a real implementation, this would be replaced with a proper mapping library
  // such as Google Maps, Mapbox, or Leaflet
  
  useEffect(() => {
    // Simulating map loading
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingUserLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoadingUserLocation(false);
        
        toast({
          title: "Location found",
          description: "Your current location has been detected.",
        });
      },
      (error) => {
        setLoadingUserLocation(false);
        
        toast({
          title: "Error getting location",
          description: error.message,
          variant: "destructive",
        });
      }
    );
  };
  
  // Calculate the map center based on the locations or provided center
  const getMapCenter = () => {
    if (centerLocation) {
      return centerLocation;
    }
    
    if (userLocation) {
      return userLocation;
    }
    
    if (locations.length > 0) {
      // Calculate average of location coordinates
      const sumLat = locations.reduce((sum, loc) => sum + loc.lat, 0);
      const sumLng = locations.reduce((sum, loc) => sum + loc.lng, 0);
      
      return {
        lat: sumLat / locations.length,
        lng: sumLng / locations.length,
      };
    }
    
    // Default to Kingston, Jamaica if no locations provided
    return { lat: 18.017, lng: -76.809 };
  };
  
  const handleLocationClick = (location: MapLocation) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };
  
  const getRiskColor = (riskLevel?: 'high' | 'medium' | 'low' | 'none') => {
    switch (riskLevel) {
      case 'high':
        return '#ef4444'; // red-500
      case 'medium':
        return '#f59e0b'; // amber-500
      case 'low':
        return '#10b981'; // emerald-500
      case 'none':
      default:
        return '#6366f1'; // indigo-500
    }
  };
  
  const center = getMapCenter();
  
  return (
    <Card className={className}>
      <CardContent className="p-0 overflow-hidden relative">
        {mapError && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {mapError}
            </AlertDescription>
          </Alert>
        )}
        
        <div 
          ref={mapContainerRef}
          style={{ height, width, position: 'relative' }}
          className="bg-gray-100 relative"
        >
          {!mapLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading map...</span>
            </div>
          ) : (
            // SVG mock map with location markers
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              {/* Mock map grid lines */}
              <g className="map-grid" stroke="#e5e7eb" strokeWidth="0.2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <line 
                    key={`h-${i}`} 
                    x1="0" 
                    y1={i * 10} 
                    x2="100" 
                    y2={i * 10} 
                  />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line 
                    key={`v-${i}`} 
                    x1={i * 10} 
                    y1="0" 
                    x2={i * 10} 
                    y2="100" 
                  />
                ))}
              </g>
              
              {/* Map location markers */}
              {locations.map((location, index) => {
                // Convert geo coordinates to SVG coordinates (basic mock conversion)
                // In a real map implementation, this would use proper geo projection
                const x = ((location.lng - center.lng) * 5) + 50;
                const y = 50 - ((location.lat - center.lat) * 5);
                
                return (
                  <g 
                    key={index} 
                    transform={`translate(${x}, ${y})`}
                    onClick={() => handleLocationClick(location)} 
                    className="cursor-pointer hover:scale-110 transition-transform"
                  >
                    <circle 
                      r="2.5" 
                      fill={getRiskColor(location.riskLevel)}
                      stroke="white"
                      strokeWidth="0.8"
                    />
                    <text 
                      x="3" 
                      y="1" 
                      fontSize="3" 
                      fill="#374151"
                      className="pointer-events-none"
                    >
                      {location.label || `Location ${index + 1}`}
                    </text>
                  </g>
                );
              })}
              
              {/* User location marker */}
              {userLocation && (
                <g 
                  transform={`translate(${((userLocation.lng - center.lng) * 5) + 50}, ${50 - ((userLocation.lat - center.lat) * 5)})`}
                  className="animate-pulse"
                >
                  <circle 
                    r="3" 
                    fill="#3b82f6"
                    fillOpacity="0.3"
                    stroke="#3b82f6"
                    strokeWidth="0.8"
                  />
                  <circle 
                    r="1.5" 
                    fill="#3b82f6"
                  />
                </g>
              )}
            </svg>
          )}
          
          {/* Map controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            {showUserLocation && (
              <Button
                size="sm"
                variant="secondary"
                onClick={getUserLocation}
                disabled={loadingUserLocation}
              >
                {loadingUserLocation ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-1" />
                )}
                {loadingUserLocation ? 'Locating...' : 'My Location'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}