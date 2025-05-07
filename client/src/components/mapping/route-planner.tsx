import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation, RotateCw, Clock } from "lucide-react";
import { hereMapsService, formatDistance, formatDuration } from "@/lib/here-maps";
import InteractiveMap from "./interactive-map";
import AddressAutocomplete from "@/components/address/address-autocomplete";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RoutePlannerProps {
  className?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  onRouteCalculated?: (route: any) => void;
}

export default function RoutePlanner({
  className,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  onRouteCalculated,
}: RoutePlannerProps) {
  const [origin, setOrigin] = useState<{ lat: number; lng: number; address: string } | null>(
    originLat && originLng ? { lat: originLat, lng: originLng, address: "" } : null
  );
  const [destination, setDestination] = useState<{ lat: number; lng: number; address: string } | null>(
    destinationLat && destinationLng ? { lat: destinationLat, lng: destinationLng, address: "" } : null
  );
  const [transportMode, setTransportMode] = useState<"car" | "pedestrian" | "bicycle">("car");
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });

          // If origin is not set and we have originLat/originLng props, reverse geocode to get the address
          if (!origin?.address && originLat && originLng) {
            reverseGeocodeLocation(originLat, originLng, "origin");
          }

          // If destination is not set and we have destinationLat/destinationLng props, reverse geocode
          if (!destination?.address && destinationLat && destinationLng) {
            reverseGeocodeLocation(destinationLat, destinationLng, "destination");
          }
        },
        (error) => {
          console.warn("Error getting user location:", error.message);
        }
      );
    }
  }, []);

  // Reverse geocode a location to get its address
  const reverseGeocodeLocation = async (lat: number, lng: number, type: "origin" | "destination") => {
    try {
      const result = await hereMapsService.reverseGeocode(lat, lng);
      
      if (result) {
        if (type === "origin") {
          setOrigin({
            lat,
            lng,
            address: result.address.label,
          });
        } else {
          setDestination({
            lat,
            lng,
            address: result.address.label,
          });
        }
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  // Handle origin address selection
  const handleOriginSelect = async (address: string, details?: any) => {
    if (details) {
      setOrigin({
        lat: details.position.lat,
        lng: details.position.lng,
        address,
      });
    } else {
      // If no details provided (user just typed), attempt to geocode
      try {
        const result = await hereMapsService.geocodeAddress(address);
        if (result) {
          setOrigin({
            lat: result.position.lat,
            lng: result.position.lng,
            address,
          });
        }
      } catch (error) {
        console.error("Error geocoding origin address:", error);
      }
    }
  };

  // Handle destination address selection
  const handleDestinationSelect = async (address: string, details?: any) => {
    if (details) {
      setDestination({
        lat: details.position.lat,
        lng: details.position.lng,
        address,
      });
    } else {
      // If no details provided (user just typed), attempt to geocode
      try {
        const result = await hereMapsService.geocodeAddress(address);
        if (result) {
          setDestination({
            lat: result.position.lat,
            lng: result.position.lng,
            address,
          });
        }
      } catch (error) {
        console.error("Error geocoding destination address:", error);
      }
    }
  };

  // Calculate route
  const calculateRoute = async () => {
    if (!origin || !destination) {
      setError("Please select both origin and destination");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const routeData = await hereMapsService.calculateRoute(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng,
        transportMode
      );

      if (routeData && routeData.routes && routeData.routes.length > 0) {
        setRoute(routeData);
        if (onRouteCalculated) {
          onRouteCalculated(routeData);
        }
      } else {
        setError("No route found. Please try different locations.");
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      setError("Failed to calculate route. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Use current location as origin
  const useCurrentLocationAsOrigin = () => {
    if (userLocation) {
      reverseGeocodeLocation(userLocation.lat, userLocation.lng, "origin");
    }
  };

  // Get route summary
  const getRouteSummary = () => {
    if (!route || !route.routes || route.routes.length === 0) return null;
    
    const section = route.routes[0].sections[0];
    return {
      distance: section.summary.length,
      duration: section.summary.duration,
    };
  };

  // Get map markers
  const getMapMarkers = () => {
    const markers = [];
    
    if (origin) {
      markers.push({
        lat: origin.lat,
        lng: origin.lng,
        title: "Origin",
      });
    }
    
    if (destination) {
      markers.push({
        lat: destination.lat,
        lng: destination.lng,
        title: "Destination",
      });
    }
    
    return markers;
  };

  // Get map center and zoom
  const getMapCenter = () => {
    if (origin && destination) {
      // Center map to fit both points
      return {
        lat: (origin.lat + destination.lat) / 2,
        lng: (origin.lng + destination.lng) / 2,
        zoom: 10
      };
    } else if (origin) {
      return {
        lat: origin.lat,
        lng: origin.lng,
        zoom: 14
      };
    } else if (destination) {
      return {
        lat: destination.lat,
        lng: destination.lng,
        zoom: 14
      };
    } else if (userLocation) {
      return {
        lat: userLocation.lat,
        lng: userLocation.lng,
        zoom: 14
      };
    }
    
    // Default center
    return {
      lat: 0,
      lng: 0,
      zoom: 2
    };
  };

  const routeSummary = getRouteSummary();
  const mapCenter = getMapCenter();

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Route Planner</CardTitle>
          <CardDescription>Calculate the best route between two locations</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <AddressAutocomplete
                  label="Starting Point"
                  value={origin?.address || ""}
                  onChange={handleOriginSelect}
                  placeholder="Enter starting location"
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="icon"
                  title="Use my current location"
                  onClick={useCurrentLocationAsOrigin}
                  disabled={!userLocation}
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <AddressAutocomplete
                label="Destination"
                value={destination?.address || ""}
                onChange={handleDestinationSelect}
                placeholder="Enter destination"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">
                Transportation Mode
              </label>
              <Select
                value={transportMode}
                onValueChange={(value) => setTransportMode(value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transportation mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Driving</SelectItem>
                  <SelectItem value="pedestrian">Walking</SelectItem>
                  <SelectItem value="bicycle">Cycling</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="default" 
            onClick={calculateRoute}
            disabled={loading || !origin || !destination}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calculate Route
          </Button>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardFooter>
      </Card>
      
      {routeSummary && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-xl font-semibold">{formatDistance(routeSummary.distance)}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Estimated Time</p>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="text-xl font-semibold">{formatDuration(routeSummary.duration)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="rounded-md overflow-hidden border">
        <InteractiveMap
          center={{ lat: mapCenter.lat, lng: mapCenter.lng }}
          zoom={mapCenter.zoom}
          markers={getMapMarkers()}
          height={400}
          showUserLocation
        />
      </div>
    </div>
  );
}