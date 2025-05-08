import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Navigation, Car, Calendar, Clock, AlertCircle, RotateCw, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import InteractiveMap from "@/components/mapping/interactive-map";
import { PollingStation } from "@shared/schema";
import {
  calculateOptimizedRoute,
  findNearestPollingStations,
  formatDistance,
  formatDuration,
  formatTime,
  RouteItinerary,
  RoutePoint,
  RoutePlanningOptions
} from "@/services/route-planning-service";

interface RoutePlannerProps {
  pollingStations: PollingStation[];
}

export function RoutePlanner({ pollingStations }: RoutePlannerProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStations, setSelectedStations] = useState<PollingStation[]>([]);
  const [routeItinerary, setRouteItinerary] = useState<RouteItinerary | null>(null);
  const [routeOptions, setRouteOptions] = useState<RoutePlanningOptions>({
    departureTime: new Date(),
    visitDuration: 30,
    transportMode: 'car',
    includeReturn: true
  });
  const [activeTab, setActiveTab] = useState<string>("stations");
  const [nearbyStations, setNearbyStations] = useState<PollingStation[]>([]);
  const [expandedPointId, setExpandedPointId] = useState<number | null>(null);
  
  const { toast } = useToast();
  
  // Get user's current location when component mounts
  useEffect(() => {
    getUserLocation();
  }, []);
  
  // Get the user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive"
      });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Find nearby polling stations
        const nearby = findNearestPollingStations(pollingStations, latitude, longitude, 5);
        setNearbyStations(nearby);
      },
      (error) => {
        console.error("Error getting user location:", error);
        toast({
          title: "Location error",
          description: `Failed to get your location: ${error.message}`,
          variant: "destructive"
        });
      },
      { enableHighAccuracy: true }
    );
  };
  
  // Handle selection of polling station
  const toggleStationSelection = (station: PollingStation) => {
    setSelectedStations(prev => {
      const isSelected = prev.some(s => s.id === station.id);
      
      if (isSelected) {
        return prev.filter(s => s.id !== station.id);
      } else {
        return [...prev, station];
      }
    });
  };
  
  // Generate the optimized route
  const generateRoute = async () => {
    if (selectedStations.length === 0) {
      toast({
        title: "No stations selected",
        description: "Please select at least one polling station.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const itinerary = await calculateOptimizedRoute(selectedStations, routeOptions);
      
      if (!itinerary) {
        throw new Error("Failed to calculate route");
      }
      
      setRouteItinerary(itinerary);
      setActiveTab("map");
    } catch (error) {
      console.error("Route planning error:", error);
      toast({
        title: "Route planning error",
        description: error instanceof Error ? error.message : "Failed to plan route",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset the route planner
  const resetRoutePlanner = () => {
    setSelectedStations([]);
    setRouteItinerary(null);
    setRouteOptions({
      departureTime: new Date(),
      visitDuration: 30,
      transportMode: 'car',
      includeReturn: true
    });
    setActiveTab("stations");
  };
  
  // Convert the route data to map markers
  const getRouteMarkers = () => {
    if (!routeItinerary) return [];
    
    return routeItinerary.points.map(point => ({
      lat: point.lat,
      lng: point.lng,
      text: `${point.visitOrder}: ${point.name}`
    }));
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Navigation className="mr-2 h-5 w-5" />
          Route Planner
        </CardTitle>
        <CardDescription>
          Plan your observation route between polling stations
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stations">Select Stations</TabsTrigger>
            <TabsTrigger value="options">Route Options</TabsTrigger>
            <TabsTrigger value="map" disabled={!routeItinerary}>View Route</TabsTrigger>
          </TabsList>
          
          {/* Select Stations Tab */}
          <TabsContent value="stations" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getUserLocation}
                  disabled={isLoading}
                >
                  {userLocation ? (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Update Location
                    </>
                  ) : (
                    <>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Navigation className="mr-2 h-4 w-4" />
                      )}
                      Get My Location
                    </>
                  )}
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {selectedStations.length} stations selected
              </div>
            </div>
            
            {userLocation && nearbyStations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Nearby Polling Stations</h3>
                <div className="rounded-md border">
                  {nearbyStations.map(station => (
                    <div 
                      key={`nearby-${station.id}`}
                      className="flex items-center justify-between p-2 hover:bg-accent"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{station.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{station.address}</div>
                      </div>
                      <Checkbox 
                        checked={selectedStations.some(s => s.id === station.id)}
                        onCheckedChange={() => toggleStationSelection(station)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">All Polling Stations</h3>
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                {pollingStations.map(station => (
                  <div 
                    key={`all-${station.id}`}
                    className="flex items-center justify-between p-2 hover:bg-accent"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{station.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{station.address}</div>
                    </div>
                    <Checkbox 
                      checked={selectedStations.some(s => s.id === station.id)}
                      onCheckedChange={() => toggleStationSelection(station)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          {/* Route Options Tab */}
          <TabsContent value="options" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transportMode">Transport Mode</Label>
                  <Select 
                    value={routeOptions.transportMode} 
                    onValueChange={(value) => 
                      setRouteOptions(prev => ({ ...prev, transportMode: value as any }))
                    }
                  >
                    <SelectTrigger id="transportMode">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="pedestrian">Walking</SelectItem>
                      <SelectItem value="bicycle">Bicycle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="visitDuration">Visit Duration (minutes)</Label>
                  <Input 
                    id="visitDuration"
                    type="number"
                    min="5"
                    max="120"
                    value={routeOptions.visitDuration}
                    onChange={(e) => 
                      setRouteOptions(prev => ({ ...prev, visitDuration: parseInt(e.target.value) || 30 }))
                    }
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="includeReturn"
                  checked={routeOptions.includeReturn}
                  onCheckedChange={(checked) => 
                    setRouteOptions(prev => ({ ...prev, includeReturn: checked }))
                  }
                />
                <Label htmlFor="includeReturn">Include return to starting point</Label>
              </div>
            </div>
          </TabsContent>
          
          {/* View Route Tab */}
          <TabsContent value="map" className="space-y-4">
            {routeItinerary && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Route Summary</h3>
                    <div className="text-sm text-muted-foreground">
                      {routeItinerary.points.length} stations • {formatDistance(routeItinerary.totalDistance)} • {formatDuration(routeItinerary.totalDuration)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Departure: {formatTime(routeItinerary.departureTime)}
                    </Badge>
                    <Badge variant="outline" className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Return: {formatTime(routeItinerary.returnTime)}
                    </Badge>
                  </div>
                </div>
                
                <div className="h-[300px] rounded-md overflow-hidden">
                  <InteractiveMap 
                    markers={getRouteMarkers()}
                    center={userLocation || undefined}
                    height="100%"
                    width="100%"
                    showUserLocation={true}
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Itinerary</h3>
                  <div className="rounded-md border max-h-[200px] overflow-y-auto">
                    {routeItinerary.points.map((point, index) => (
                      <div key={`route-${point.id}-${index}`} className="border-b last:border-0">
                        <div 
                          className="flex items-center justify-between p-2 cursor-pointer hover:bg-accent"
                          onClick={() => setExpandedPointId(expandedPointId === point.id ? null : point.id)}
                        >
                          <div className="flex items-center">
                            <Badge className="mr-2" variant="outline">
                              {point.visitOrder}
                            </Badge>
                            <div>
                              <div className="font-medium">{point.name}</div>
                              {point.estimatedArrival && (
                                <div className="text-xs text-muted-foreground">
                                  Arrival: {formatTime(point.estimatedArrival)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            {expandedPointId === point.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                        
                        {expandedPointId === point.id && (
                          <div className="px-4 py-2 bg-accent/20">
                            <div className="text-sm">{point.address}</div>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                              <div>Stay duration: {point.visitDuration} min</div>
                              {point.estimatedDeparture && (
                                <div>Departure: {formatTime(point.estimatedDeparture)}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={resetRoutePlanner}
        >
          <RotateCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        
        <Button 
          onClick={generateRoute}
          disabled={selectedStations.length === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Navigation className="mr-2 h-4 w-4" />
              Generate Route
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default RoutePlanner;