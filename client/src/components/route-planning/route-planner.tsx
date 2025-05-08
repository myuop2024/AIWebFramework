import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Navigation, Car, Calendar, Clock, AlertCircle, RotateCw, Check, X, ChevronDown, ChevronUp, Save, FolderOpen, Printer, Share2, Trash, Filter, MoreHorizontal, Share, Map, CheckSquare, ExternalLink, Hourglass, ArrowDown, Play, Pause, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

import InteractiveMap from "@/components/mapping/interactive-map";
import { PollingStation } from "@shared/schema";
import {
  calculateOptimizedRoute,
  getNearestStations,
  findNearestPollingStations,
  getEstimatedTimeToArrival,
  calculateOptimizedVisitOrder,
  formatDistance,
  formatDuration,
  formatTime,
  RouteItinerary,
  RoutePoint,
  RoutePlanningOptions,
  calculateHaversineDistance
} from "@/services/route-planning-service";

interface RoutePlannerProps {
  pollingStations: PollingStation[];
}

export function RoutePlanner({ pollingStations }: RoutePlannerProps) {
  // Mobile responsive detection
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Check viewport size on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStations, setSelectedStations] = useState<PollingStation[]>([]);
  const [routeItinerary, setRouteItinerary] = useState<RouteItinerary | null>(null);
  const [routeOptions, setRouteOptions] = useState<RoutePlanningOptions>({
    departureTime: new Date(),
    visitDuration: 30,
    transportMode: 'car',
    includeReturn: true,
    considerTraffic: true,
    avoidHighways: false,
    avoidTolls: false,
    weatherAware: true
  });
  const [activeTab, setActiveTab] = useState<string>("stations");
  const [nearbyStations, setNearbyStations] = useState<PollingStation[]>([]);
  const [expandedPointId, setExpandedPointId] = useState<number | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<{ name: string; itinerary: RouteItinerary }[]>([]);
  const [routeName, setRouteName] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [filterText, setFilterText] = useState<string>("");
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [navigationPaused, setNavigationPaused] = useState(false);
  const [currentNavPointIndex, setCurrentNavPointIndex] = useState(0);
  const [distanceToNextPoint, setDistanceToNextPoint] = useState<number | null>(null);
  const [estimatedTimeToArrival, setEstimatedTimeToArrival] = useState<number | null>(null);
  const [visitedPoints, setVisitedPoints] = useState<number[]>([]);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  
  const { toast } = useToast();
  
  // Get current navigation point
  const currentNavPoint = routeItinerary && routeItinerary.points[currentNavPointIndex];
  
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
        const nearby = getNearestStations(pollingStations, latitude, longitude, 5);
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
      setCurrentNavPointIndex(0);
      setVisitedPoints([]);
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
  
  // Start tracking user location for live navigation
  const trackUserLocationForNavigation = () => {
    // Clear any existing watch
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
    }
    
    // Only proceed if we have a route and navigation mode is active
    if (!routeItinerary || !isNavigationMode) return;
    
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation tracking.",
        variant: "destructive"
      });
      return;
    }
    
    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Only update navigation info if we have a current navigation point
        if (currentNavPoint) {
          // Calculate distance to next point
          const distance = calculateHaversineDistance(
            latitude,
            longitude,
            currentNavPoint.lat,
            currentNavPoint.lng
          );
          
          setDistanceToNextPoint(distance);
          
          // Recalculate ETA
          try {
            const eta = await getEstimatedTimeToArrival(
              latitude,
              longitude,
              currentNavPoint.lat,
              currentNavPoint.lng,
              routeOptions.transportMode
            );
            
            setEstimatedTimeToArrival(eta);
            
            // Auto-advance to next point if very close (within 50 meters)
            if (distance < 50 && !visitedPoints.includes(currentNavPointIndex)) {
              markPointAsVisited(currentNavPointIndex);
            }
          } catch (error) {
            console.error("Error calculating ETA:", error);
          }
        }
      },
      (error) => {
        console.error("Location tracking error:", error);
        toast({
          title: "Location error",
          description: `Could not track your location: ${error.message}`,
          variant: "destructive"
        });
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 10000,  // 10 seconds
        timeout: 60000      // 1 minute
      }
    );
    
    setLocationWatchId(watchId);
    
    toast({
      title: "Location tracking started",
      description: "Your location is now being tracked for navigation."
    });
  };
  
  // Mark a point as visited and move to the next one
  const markPointAsVisited = (index: number) => {
    if (!routeItinerary) return;
    
    // Add to visited points if not already there
    if (!visitedPoints.includes(index)) {
      setVisitedPoints(prev => [...prev, index]);
      
      // Auto-advance to next point if not the last one
      if (index < routeItinerary.points.length - 1) {
        setCurrentNavPointIndex(index + 1);
      }
      
      toast({
        title: "Point marked as visited",
        description: `${routeItinerary.points[index].name} marked as visited.`
      });
    }
  };
  
  // Effect to start/stop location tracking when navigation mode changes
  useEffect(() => {
    if (isNavigationMode) {
      trackUserLocationForNavigation();
    } else if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
    
    return () => {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
    };
  }, [isNavigationMode]);
  
  // Effect to update navigation info when current point changes
  useEffect(() => {
    if (isNavigationMode && userLocation && currentNavPoint) {
      // Calculate initial distance
      const distance = calculateHaversineDistance(
        userLocation.lat,
        userLocation.lng,
        currentNavPoint.lat,
        currentNavPoint.lng
      );
      
      setDistanceToNextPoint(distance);
      
      // Calculate initial ETA
      getEstimatedTimeToArrival(
        userLocation.lat,
        userLocation.lng,
        currentNavPoint.lat,
        currentNavPoint.lng,
        routeOptions.transportMode
      ).then(eta => {
        setEstimatedTimeToArrival(eta);
      }).catch(error => {
        console.error("Error calculating initial ETA:", error);
      });
    }
  }, [currentNavPointIndex, isNavigationMode, userLocation]);
  
  // Reset the route planner
  const resetRoutePlanner = () => {
    setSelectedStations([]);
    setRouteItinerary(null);
    setRouteOptions({
      departureTime: new Date(),
      visitDuration: 30,
      transportMode: 'car',
      includeReturn: true,
      considerTraffic: true,
      avoidHighways: false,
      avoidTolls: false,
      weatherAware: true
    });
    setActiveTab("stations");
    setFilterText("");
  };
  
  // Convert the route data to map markers with visual indicators for navigation state
  const getRouteMarkers = () => {
    if (!routeItinerary) return [];
    
    return routeItinerary.points.map((point, index) => {
      // Create the base text for the marker
      let markerText = `${point.visitOrder}: ${point.name}`;
      
      // Enhance the text based on navigation state
      if (isNavigationMode) {
        if (index === currentNavPointIndex) {
          markerText = `📍 CURRENT: ${markerText}`;
        } else if (visitedPoints.includes(index)) {
          markerText = `✓ VISITED: ${markerText}`;
        } else if (index > currentNavPointIndex) {
          markerText = `⏱️ PENDING: ${markerText}`;
        }
      }
      
      return {
        lat: point.lat,
        lng: point.lng,
        text: markerText,
        // We could add more properties for custom styling in the future
      };
    });
  };
  
  // Create CSS for print mode
  useEffect(() => {
    if (isPrinting) {
      const style = document.createElement('style');
      style.id = 'print-style';
      style.innerHTML = `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-section .no-print {
            display: none !important;
          }
          @page {
            size: portrait;
            margin: 1cm;
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        const styleElem = document.getElementById('print-style');
        if (styleElem) styleElem.remove();
      };
    }
  }, [isPrinting]);
  
  return (
    <Card className="w-full max-w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center">
            <Navigation className="mr-2 h-5 w-5" />
            Route Planner
          </CardTitle>
          <CardDescription>
            Plan your observation route between polling stations
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Route Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setIsPrinting(true);
                setTimeout(() => {
                  window.print();
                  setIsPrinting(false);
                }, 500);
              }}>
                <Printer className="mr-2 h-4 w-4" />
                Print Route
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                // Copy to clipboard
                if (routeItinerary) {
                  const routeData = encodeURIComponent(JSON.stringify({
                    stations: selectedStations.map(s => s.id),
                    options: routeOptions
                  }));
                  
                  // Create URL with query params
                  const shareUrl = `${window.location.origin}/route-planning?data=${routeData}`;
                  
                  // Copy to clipboard
                  navigator.clipboard.writeText(shareUrl).then(
                    () => {
                      toast({
                        title: "Link copied",
                        description: "Share link copied to clipboard"
                      });
                    },
                    (err) => {
                      console.error('Could not copy text: ', err);
                      toast({
                        title: "Failed to copy",
                        description: "Could not copy link to clipboard",
                        variant: "destructive"
                      });
                    }
                  );
                } else {
                  toast({
                    title: "No route available",
                    description: "Please generate a route first",
                    variant: "destructive"
                  });
                }
              }}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Route
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Route Preferences</h3>
                <div className="space-y-2">
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
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="considerTraffic"
                      checked={routeOptions.considerTraffic}
                      onCheckedChange={(checked) => 
                        setRouteOptions(prev => ({ ...prev, considerTraffic: checked }))
                      }
                    />
                    <Label htmlFor="considerTraffic">Consider real-time traffic</Label>
                  </div>
                </div>
                
                <h3 className="text-sm font-medium">Road Preferences</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="avoidHighways"
                      checked={routeOptions.avoidHighways}
                      onCheckedChange={(checked) => 
                        setRouteOptions(prev => ({ ...prev, avoidHighways: checked }))
                      }
                    />
                    <Label htmlFor="avoidHighways">Avoid highways</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="avoidTolls"
                      checked={routeOptions.avoidTolls}
                      onCheckedChange={(checked) => 
                        setRouteOptions(prev => ({ ...prev, avoidTolls: checked }))
                      }
                    />
                    <Label htmlFor="avoidTolls">Avoid toll roads</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="weatherAware"
                      checked={routeOptions.weatherAware}
                      onCheckedChange={(checked) => 
                        setRouteOptions(prev => ({ ...prev, weatherAware: checked }))
                      }
                    />
                    <Label htmlFor="weatherAware">Weather-aware routing</Label>
                  </div>
                </div>
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
                  
                  <div className="flex flex-wrap gap-2">
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

                {/* Save/Export Actions - Responsive for mobile */}
                <div className={`${isMobile ? 'grid grid-cols-2' : 'flex flex-wrap'} gap-2`}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save Route
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <h4 className="font-medium">Save Route</h4>
                        <div className="space-y-2">
                          <Label htmlFor="routeName">Route Name</Label>
                          <Input
                            id="routeName"
                            placeholder="Enter a name for this route"
                            value={routeName}
                            onChange={(e) => setRouteName(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={() => {
                            if (!routeName.trim()) {
                              toast({
                                title: "Name required",
                                description: "Please enter a name for your route",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            setSavedRoutes(prev => [
                              ...prev, 
                              { name: routeName, itinerary: routeItinerary! }
                            ]);
                            
                            setRouteName("");
                            
                            toast({
                              title: "Route saved",
                              description: "Your route has been saved successfully"
                            });
                          }}
                          className="w-full"
                        >
                          Save
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Load Route
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <h4 className="font-medium">Saved Routes</h4>
                        {savedRoutes.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No saved routes found
                          </div>
                        ) : (
                          <div className="max-h-[200px] overflow-y-auto">
                            {savedRoutes.map((saved, index) => (
                              <div 
                                key={`saved-${index}`}
                                className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                                onClick={() => {
                                  setRouteItinerary(saved.itinerary);
                                  
                                  // Find the stations that are part of this route
                                  const stationIds = saved.itinerary.points
                                    .filter(p => typeof p.id === 'number' || (typeof p.id === 'string' && !['start', 'end'].includes(p.id)))
                                    .map(p => typeof p.id === 'number' ? p.id : parseInt(String(p.id)));
                                  
                                  const stations = pollingStations.filter(s => 
                                    stationIds.includes(s.id)
                                  );
                                  
                                  setSelectedStations(stations);
                                  
                                  toast({
                                    title: "Route loaded",
                                    description: `Loaded route: ${saved.name}`
                                  });
                                }}
                              >
                                <div>
                                  <div className="font-medium">{saved.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {saved.itinerary.points.length} stations • 
                                    {formatDistance(saved.itinerary.totalDistance)}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSavedRoutes(prev => 
                                      prev.filter((_, i) => i !== index)
                                    );
                                  }}
                                >
                                  <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsPrinting(true);
                      setTimeout(() => {
                        window.print();
                        setIsPrinting(false);
                      }, 500);
                    }}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print/Export
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Create shareable URL with route data
                      const routeData = encodeURIComponent(JSON.stringify({
                        stations: selectedStations.map(s => s.id),
                        options: routeOptions
                      }));
                      
                      // Create URL with query params
                      const shareUrl = `${window.location.origin}/route-planning?data=${routeData}`;
                      
                      // Copy to clipboard
                      navigator.clipboard.writeText(shareUrl).then(
                        () => {
                          toast({
                            title: "Link copied",
                            description: "Share link copied to clipboard"
                          });
                        },
                        (err) => {
                          console.error('Could not copy text: ', err);
                          toast({
                            title: "Failed to copy",
                            description: "Could not copy link to clipboard",
                            variant: "destructive"
                          });
                        }
                      );
                    }}
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share Route
                  </Button>
                </div>
                
                <div className="h-[400px] rounded-md overflow-hidden">
                  <InteractiveMap 
                    markers={getRouteMarkers()}
                    center={userLocation || undefined}
                    height="100%"
                    width="100%"
                    showUserLocation={true}
                    routePolyline={routeItinerary?.routePolyline}
                    navigationMode={isNavigationMode}
                    onMarkerClick={(index) => {
                      // Handle marker click to navigate to that destination
                      if (routeItinerary && index < routeItinerary.points.length) {
                        setCurrentNavPointIndex(index);
                        toast({
                          title: "Destination changed",
                          description: `Now navigating to ${routeItinerary.points[index].name}`
                        });
                      }
                    }}
                  />
                </div>
                
                {/* Navigation Mode Toggle */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="navigation-mode"
                      checked={isNavigationMode}
                      onCheckedChange={(checked) => {
                        setIsNavigationMode(checked);
                        if (checked) {
                          toast({
                            title: "Navigation mode activated",
                            description: "Your location will be tracked to guide you through the route.",
                          });
                          // Reset to first point when navigation starts
                          setCurrentNavPointIndex(0);
                          setNavigationPaused(false);
                        } else {
                          toast({
                            title: "Navigation mode deactivated",
                            description: "Location tracking has been stopped.",
                          });
                          setNavigationPaused(false);
                        }
                      }}
                    />
                    <Label htmlFor="navigation-mode" className="text-sm font-medium cursor-pointer">
                      Live Navigation Mode
                    </Label>
                  </div>
                  
                  {isNavigationMode && (
                    <div className="text-xs bg-muted p-2 rounded-md">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <div>
                          <span className="font-medium">Status:</span> 
                          <span className={cn(
                            "ml-1",
                            navigationPaused ? "text-warning" : "text-success"
                          )}>
                            {navigationPaused ? "Paused" : "Active"}
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-medium">Distance:</span> 
                          <span className="ml-1">
                            {distanceToNextPoint ? formatDistance(distanceToNextPoint) : "Calculating..."}
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-medium">ETA:</span> 
                          <span className="ml-1">
                            {estimatedTimeToArrival !== null 
                              ? `${Math.ceil(estimatedTimeToArrival / 60)} min` 
                              : "Calculating..."}
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-medium">Progress:</span> 
                          <span className="ml-1">
                            {visitedPoints.length}/{routeItinerary.points.length} stations
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Navigation Controls */}
                {isNavigationMode && routeItinerary && (
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        <span className="font-semibold">Current destination:</span> {currentNavPoint?.name}
                      </span>
                      {estimatedTimeToArrival !== null && (
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">
                          ETA: {Math.ceil(estimatedTimeToArrival / 60)} minutes
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {/* Pause/Resume */}
                      <Button 
                        variant={navigationPaused ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          setNavigationPaused(!navigationPaused);
                          if (navigationPaused) {
                            // Resume tracking
                            trackUserLocationForNavigation();
                            toast({
                              title: "Navigation resumed",
                              description: "Location tracking and navigation has resumed."
                            });
                          } else if (locationWatchId !== null) {
                            // Pause tracking
                            navigator.geolocation.clearWatch(locationWatchId);
                            setLocationWatchId(null);
                            toast({
                              title: "Navigation paused",
                              description: "Location tracking and navigation is paused."
                            });
                          }
                        }}
                      >
                        {navigationPaused ? (
                          <>
                            <Play className="mr-1 h-4 w-4" />
                            Resume Navigation
                          </>
                        ) : (
                          <>
                            <Pause className="mr-1 h-4 w-4" />
                            Pause Navigation
                          </>
                        )}
                      </Button>
                      
                      {/* Navigation point controls */}
                      <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
                        {/* Previous Destination */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          disabled={currentNavPointIndex <= 0}
                          onClick={() => {
                            if (currentNavPointIndex > 0) {
                              const newIndex = currentNavPointIndex - 1;
                              setCurrentNavPointIndex(newIndex);
                              const pointName = routeItinerary.points[newIndex].name;
                              toast({
                                title: "Previous destination",
                                description: `Now navigating to ${pointName}`
                              });
                            }
                          }}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        
                        <div className="px-2 text-sm font-medium">
                          {currentNavPointIndex + 1} of {routeItinerary.points.length}
                          {visitedPoints.length > 0 && ` (${visitedPoints.length} visited)`}
                        </div>
                        
                        {/* Next Destination */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          disabled={currentNavPointIndex >= routeItinerary.points.length - 1}
                          onClick={() => {
                            if (currentNavPointIndex < routeItinerary.points.length - 1) {
                              const newIndex = currentNavPointIndex + 1;
                              setCurrentNavPointIndex(newIndex);
                              const pointName = routeItinerary.points[newIndex].name;
                              toast({
                                title: "Next destination",
                                description: `Now navigating to ${pointName}`
                              });
                            }
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Mark as visited button */}
                      <Button
                        variant={visitedPoints.includes(currentNavPointIndex) ? "secondary" : "outline"}
                        className={visitedPoints.includes(currentNavPointIndex) ? "bg-green-100 hover:bg-green-200 text-green-800 border-green-300" : ""}
                        size="sm"
                        onClick={() => {
                          if (visitedPoints.includes(currentNavPointIndex)) {
                            // Remove from visited
                            setVisitedPoints(prev => prev.filter(i => i !== currentNavPointIndex));
                            toast({
                              title: "Mark as not visited",
                              description: `Removed ${routeItinerary.points[currentNavPointIndex].name} from visited locations.`
                            });
                          } else {
                            // Mark as visited
                            markPointAsVisited(currentNavPointIndex);
                          }
                        }}
                      >
                        {visitedPoints.includes(currentNavPointIndex) ? (
                          <>
                            <Check className="mr-1 h-4 w-4" />
                            Marked as Visited
                          </>
                        ) : (
                          <>
                            <CheckSquare className="mr-1 h-4 w-4" />
                            Mark as Visited
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Print-friendly section (hidden until print) */}
                <div className="print-section hidden">
                  <div className="p-6 space-y-6">
                    <div className="text-center border-b pb-4">
                      <h1 className="text-2xl font-bold">Election Observer Route Plan</h1>
                      <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">Route Summary</h2>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <span className="font-medium">Total stations:</span> {routeItinerary.points.length}
                        </div>
                        <div>
                          <span className="font-medium">Total distance:</span> {formatDistance(routeItinerary.totalDistance)}
                        </div>
                        <div>
                          <span className="font-medium">Total duration:</span> {formatDuration(routeItinerary.totalDuration)}
                        </div>
                        <div>
                          <span className="font-medium">Transport mode:</span> {routeOptions.transportMode}
                        </div>
                        <div>
                          <span className="font-medium">Departure time:</span> {formatTime(routeItinerary.departureTime)}
                        </div>
                        <div>
                          <span className="font-medium">Return time:</span> {formatTime(routeItinerary.returnTime)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">Detailed Itinerary</h2>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">#</th>
                            <th className="text-left py-2">Station</th>
                            <th className="text-left py-2">Address</th>
                            <th className="text-left py-2">Arrival</th>
                            <th className="text-left py-2">Departure</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routeItinerary.points.map((point, index) => (
                            <tr key={`print-${index}`} className="border-b">
                              <td className="py-2">{point.visitOrder}</td>
                              <td className="py-2 font-medium">{point.name}</td>
                              <td className="py-2">{point.address}</td>
                              <td className="py-2">{point.estimatedArrival ? formatTime(point.estimatedArrival) : '-'}</td>
                              <td className="py-2">{point.estimatedDeparture ? formatTime(point.estimatedDeparture) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
                      <p>Notes: Visit duration at each polling station is {routeOptions.visitDuration} minutes. Observer should follow the official election observation guidelines.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-sm font-medium">Itinerary</h3>
                    <div className="relative">
                      <Input
                        placeholder="Filter stops..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className={`${isMobile ? 'w-36' : 'w-48'} h-8 pl-8`}
                      />
                      <Filter className="h-4 w-4 absolute left-2 top-2 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="rounded-md border max-h-[200px] overflow-y-auto">
                    {routeItinerary.points
                      .filter(point => 
                        point.name.toLowerCase().includes(filterText.toLowerCase()) ||
                        (point.address && point.address.toLowerCase().includes(filterText.toLowerCase()))
                      )
                      .map((point, index) => (
                      <div 
                        key={`route-${point.id}-${index}`} 
                        className={cn(
                          "border-b last:border-0",
                          isNavigationMode && index === currentNavPointIndex && "bg-primary/10",
                          isNavigationMode && visitedPoints.includes(index) && "bg-success/10"
                        )}
                      >
                        <div 
                          className="flex items-center justify-between p-2 cursor-pointer hover:bg-accent"
                          onClick={() => {
                            // If in navigation mode, clicking sets this as current destination
                            if (isNavigationMode) {
                              setCurrentNavPointIndex(index);
                              toast({
                                title: "Destination changed",
                                description: `Now navigating to ${point.name}`
                              });
                            } else {
                              // Otherwise just expand/collapse details
                              setExpandedPointId(expandedPointId === point.id ? null : point.id);
                            }
                          }}
                        >
                          <div className="flex items-center">
                            <Badge 
                              className="mr-2" 
                              variant={
                                isNavigationMode && index === currentNavPointIndex 
                                  ? "default" 
                                  : isNavigationMode && visitedPoints.includes(index)
                                    ? "success" 
                                    : "outline"
                              }
                            >
                              {point.visitOrder}
                              {isNavigationMode && index === currentNavPointIndex && " 📍"}
                              {isNavigationMode && visitedPoints.includes(index) && " ✓"}
                            </Badge>
                            <div>
                              <div className="font-medium">
                                {point.name}
                                {isNavigationMode && (
                                  <>
                                    {index === currentNavPointIndex && (
                                      <span className="ml-2 text-xs text-primary font-normal">
                                        (Current destination)
                                      </span>
                                    )}
                                    {visitedPoints.includes(index) && (
                                      <span className="ml-2 text-xs text-success font-normal">
                                        (Visited)
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              {point.estimatedArrival && (
                                <div className="text-xs text-muted-foreground">
                                  Arrival: {formatTime(point.estimatedArrival)}
                                  {index === currentNavPointIndex && estimatedTimeToArrival !== null && (
                                    <span className="ml-2 font-medium text-primary">
                                      ETA: {Math.ceil(estimatedTimeToArrival / 60)} min
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {isNavigationMode && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 mr-1"
                                title={visitedPoints.includes(index) ? "Mark as not visited" : "Mark as visited"}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the parent click
                                  if (visitedPoints.includes(index)) {
                                    // Remove from visited points
                                    setVisitedPoints(prev => prev.filter(i => i !== index));
                                  } else {
                                    // Add to visited points
                                    markPointAsVisited(index);
                                  }
                                }}
                              >
                                {visitedPoints.includes(index) ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            )}
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