import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Navigation, 
  MapPin, 
  Clock, 
  RotateCw, 
  ChevronUp, 
  ChevronDown, 
  Loader2, 
  Check, 
  X, 
  AlertTriangle
} from "lucide-react";
import { 
  calculateOptimizedRoute, 
  formatDistance, 
  formatDuration, 
  formatTime,
  calculateHaversineDistance,
  RouteItinerary,
  RouteWaypoint,
  RoutePoint,
  RoutePlanningOptions
} from "@/services/route-planning-service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UserLocation } from "@/lib/geolocation-service";
import { PollingStation } from "@shared/schema";

interface ObserverRoutePlannerProps {
  pollingStations: PollingStation[];
  userLocation: UserLocation | null;
  isLocationTracking: boolean;
  onToggleTracking: (active: boolean) => void;
  onRouteCalculated?: (route: RouteItinerary) => void;
  className?: string;
}

export default function ObserverRoutePlanner({
  pollingStations,
  userLocation,
  isLocationTracking,
  onToggleTracking,
  onRouteCalculated,
  className
}: ObserverRoutePlannerProps) {
  const [selectedStations, setSelectedStations] = useState<PollingStation[]>([]);
  const [routeOptions, setRouteOptions] = useState<RoutePlanningOptions>({
    transportMode: 'car',
    optimizeRoute: true,
    departureTime: new Date(),
    stayDuration: 30, // minutes at each station
    avoidTolls: false,
    avoidHighways: false,
    avoidFerries: false,
    trafficMode: 'enabled'
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [route, setRoute] = useState<RouteItinerary | null>(null);
  const [expandedPointId, setExpandedPointId] = useState<number | null>(null);
  const [nearbyStations, setNearbyStations] = useState<{
    station: PollingStation;
    distance: number;
  }[]>([]);
  const { toast } = useToast();
  
  // Update nearby stations when user location changes
  useEffect(() => {
    if (!userLocation || !pollingStations) return;
    
    const stationsWithDistance = pollingStations.map(station => {
      const distance = calculateHaversineDistance(
        userLocation.lat,
        userLocation.lng,
        station.latitude || 0,
        station.longitude || 0
      );
      
      return { station, distance };
    });
    
    // Sort by distance and take the closest 10
    const closest = stationsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);
    
    setNearbyStations(closest);
  }, [userLocation, pollingStations]);
  
  // Toggle a station selection
  const toggleStationSelection = (station: PollingStation) => {
    if (selectedStations.some(s => s.id === station.id)) {
      setSelectedStations(prev => prev.filter(s => s.id !== station.id));
    } else {
      setSelectedStations(prev => [...prev, station]);
    }
  };
  
  // Calculate optimized route
  const calculateRoute = async () => {
    if (!userLocation) {
      toast({
        title: "Location required",
        description: "Your current location is needed to calculate a route",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedStations.length === 0) {
      toast({
        title: "No stations selected",
        description: "Please select at least one polling station",
        variant: "destructive"
      });
      return;
    }
    
    setIsCalculating(true);
    
    try {
      // Prepare waypoints starting with current location
      const waypoints: RouteWaypoint[] = [
        {
          lat: userLocation.lat,
          lng: userLocation.lng,
          name: "Your Location"
        },
        ...selectedStations.map(station => ({
          id: station.id,
          lat: station.latitude || 0,
          lng: station.longitude || 0,
          name: station.name,
          address: station.address
        }))
      ];
      
      // If route should return to start, add the start location again
      if (routeOptions.includeReturn) {
        waypoints.push({
          lat: userLocation.lat,
          lng: userLocation.lng,
          name: "Return to Start"
        });
      }
      
      const calculatedRoute = await calculateOptimizedRoute(waypoints, routeOptions);
      
      setRoute(calculatedRoute);
      
      if (onRouteCalculated) {
        onRouteCalculated(calculatedRoute);
      }
      
      toast({
        title: "Route calculated",
        description: `${calculatedRoute.waypoints.length} stops, total distance: ${formatDistance(calculatedRoute.summary.distance)}`
      });
    } catch (error) {
      console.error("Route calculation error:", error);
      toast({
        title: "Route calculation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Toggle details for a specific route point
  const togglePointDetails = (index: number) => {
    setExpandedPointId(expandedPointId === index ? null : index);
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Location Status */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Location</CardTitle>
              <CardDescription>Your real-time position</CardDescription>
            </div>
            <Badge 
              variant={isLocationTracking ? "default" : "secondary"}
              className={isLocationTracking ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {isLocationTracking ? "Tracking" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {userLocation ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm font-medium">Latitude</p>
                  <p className="font-mono">{userLocation.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Longitude</p>
                  <p className="font-mono">{userLocation.lng.toFixed(6)}</p>
                </div>
              </div>
              
              {userLocation.accuracy && (
                <div>
                  <p className="text-sm font-medium">Accuracy</p>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(100, 100 - (userLocation.accuracy / 20) * 100)} className="h-2" />
                    <span className="text-sm">±{userLocation.accuracy.toFixed(1)}m</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between mt-2">
                <Button
                  variant={isLocationTracking ? "destructive" : "default"}
                  size="sm"
                  onClick={() => onToggleTracking(!isLocationTracking)}
                >
                  {isLocationTracking ? (
                    <>
                      <X className="mr-1 h-4 w-4" />
                      Stop Tracking
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-1 h-4 w-4" />
                      Start Tracking
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Navigation className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Location unavailable</p>
              <Button 
                variant="outline" 
                className="mt-2" 
                onClick={() => onToggleTracking(true)}
              >
                Enable Tracking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Route Options */}
      <Card>
        <CardHeader>
          <CardTitle>Route Options</CardTitle>
          <CardDescription>Configure your route planning preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Transportation Mode</label>
              <Select
                value={routeOptions.transportMode}
                onValueChange={(value: any) => setRouteOptions(prev => ({ ...prev, transportMode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transportation mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="pedestrian">Walking</SelectItem>
                  <SelectItem value="bicycle">Bicycle</SelectItem>
                  <SelectItem value="publicTransport">Public Transit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="optimize" 
                checked={routeOptions.optimizeRoute}
                onCheckedChange={(checked) => 
                  setRouteOptions(prev => ({ ...prev, optimizeRoute: checked === true }))
                }
              />
              <label
                htmlFor="optimize"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Optimize Route Order
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="return" 
                checked={routeOptions.includeReturn}
                onCheckedChange={(checked) => 
                  setRouteOptions(prev => ({ ...prev, includeReturn: checked === true }))
                }
              />
              <label
                htmlFor="return"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Return to Starting Point
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="avoidHighways" 
                checked={routeOptions.avoidHighways}
                onCheckedChange={(checked) => 
                  setRouteOptions(prev => ({ ...prev, avoidHighways: checked === true }))
                }
              />
              <label
                htmlFor="avoidHighways"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Avoid Highways
              </label>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium">Visit Duration (minutes per station)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={routeOptions.stayDuration || 15}
                  onChange={(e) => setRouteOptions(prev => ({ 
                    ...prev, 
                    stayDuration: parseInt(e.target.value) || 15 
                  }))}
                  min={5}
                  max={120}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={calculateRoute}
            disabled={!userLocation || selectedStations.length === 0 || isCalculating}
          >
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating Route...
              </>
            ) : (
              <>
                <RotateCw className="mr-2 h-4 w-4" />
                Calculate Route
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Nearby Stations */}
      <Card>
        <CardHeader>
          <CardTitle>Nearby Polling Stations</CardTitle>
          <CardDescription>Select stations to include in your route</CardDescription>
        </CardHeader>
        <CardContent className="max-h-80 overflow-y-auto">
          {nearbyStations.length === 0 ? (
            <div className="text-center py-4">
              <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {userLocation 
                  ? "No polling stations found nearby"
                  : "Enable location to see nearby stations"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {nearbyStations.map(({ station, distance }) => {
                const isSelected = selectedStations.some(s => s.id === station.id);
                
                return (
                  <div 
                    key={station.id}
                    className={cn(
                      "p-3 border rounded-md flex items-center justify-between cursor-pointer",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleStationSelection(station)}
                  >
                    <div>
                      <p className="font-medium">{station.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistance(distance)} • {station.address}
                      </p>
                    </div>
                    <div className="h-5 w-5 rounded-full border flex items-center justify-center">
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Route Results */}
      {route && (
        <Card>
          <CardHeader>
            <CardTitle>Route Itinerary</CardTitle>
            <CardDescription>
              {route.summary.waypoints} stops • {formatDistance(route.summary.distance)} • 
              {formatDuration(route.summary.duration)}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {route.waypoints.map((point, index) => (
                <div
                  key={index}
                  className="border rounded-md overflow-hidden"
                >
                  <div 
                    className={cn(
                      "p-3 flex items-center justify-between cursor-pointer",
                      expandedPointId === index ? "bg-muted/50" : "hover:bg-muted/20"
                    )}
                    onClick={() => togglePointDetails(index)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{point.name}</p>
                        {point.arrivalTime && (
                          <p className="text-sm text-muted-foreground">
                            {index === 0 ? "Depart" : "Arrive"}: {point.arrivalTime}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      {expandedPointId === index ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {expandedPointId === index && (
                    <div className="p-3 border-t bg-muted/20">
                      <div className="space-y-2 text-sm">
                        <p><strong>Coordinates:</strong> {point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
                        {point.address && <p><strong>Address:</strong> {point.address}</p>}
                        {point.arrivalTime && <p><strong>Arrival:</strong> {point.arrivalTime}</p>}
                        {point.departureTime && <p><strong>Departure:</strong> {point.departureTime}</p>}
                        {point.stayDuration && <p><strong>Duration:</strong> {point.stayDuration} minutes</p>}
                        
                        {index < route.segments.length && (
                          <div className="pt-2 border-t mt-2">
                            <p><strong>Next segment:</strong></p>
                            <p>{formatDistance(route.segments[index].distance)} • {formatDuration(route.segments[index].duration)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}