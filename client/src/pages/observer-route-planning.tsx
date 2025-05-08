import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGeolocation } from '@/lib/geolocation-service';
import { 
  calculateOptimizedVisitOrder, 
  formatDistance, 
  formatDuration,
  calculateHaversineDistance
} from '@/services/route-planning-service';
import { PollingStation } from '@shared/schema';
import { InteractiveMap } from '@/components/mapping/interactive-map';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Navigation, MapPin, RotateCw, List, Map as MapIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ObserverRoutePlanningPage() {
  const [activeTab, setActiveTab] = useState('map');
  const [selectedStations, setSelectedStations] = useState<PollingStation[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const mapRef = useRef<any>(null);
  const { toast } = useToast();

  // Use the geolocation hook with continuous watching enabled
  const { 
    location: userLocation, 
    status: locationStatus, 
    requestLocation,
    startWatching,
    stopWatching,
    isWatching
  } = useGeolocation({ watch: true, enableHighAccuracy: true });

  // Query to fetch polling stations
  const { data: pollingStations, isLoading, error } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations'],
  });

  // Calculate optimized route when stations are selected
  const calculateRoute = async () => {
    if (!userLocation || selectedStations.length === 0) return;
    
    setIsCalculating(true);
    try {
      // Transform polling stations into the format expected by the function
      const stationsForRoute = selectedStations.map(station => ({
        id: station.id,
        lat: station.latitude || 0,
        lng: station.longitude || 0,
        name: station.name
      }));
      
      // Get optimized order
      const optimized = calculateOptimizedVisitOrder(
        { lat: userLocation.lat, lng: userLocation.lng },
        stationsForRoute,
        true // return to start
      );
      
      setOptimizedRoute(optimized);
      
      // Focus map on first location in the route
      if (mapRef.current && optimized.length > 0 && mapRef.current.setCenter) {
        mapRef.current.setCenter({ lat: optimized[0].lat, lng: optimized[0].lng });
        mapRef.current.setZoom(12);
      }
      
      toast({
        title: "Route calculated",
        description: `Optimized route with ${optimized.length} stops created successfully.`
      });
    } catch (err) {
      console.error("Error calculating route:", err);
      toast({
        title: "Route calculation failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Toggle a polling station selection
  const toggleStationSelection = (station: PollingStation) => {
    if (selectedStations.some(s => s.id === station.id)) {
      setSelectedStations(selectedStations.filter(s => s.id !== station.id));
    } else {
      setSelectedStations([...selectedStations, station]);
    }
  };

  // Handle map click on stations
  const handleMapMarkerClick = (markerId: string | number) => {
    const stationId = typeof markerId === 'string' ? parseInt(markerId, 10) : markerId;
    const station = pollingStations?.find(s => s.id === stationId);
    
    if (station) {
      toggleStationSelection(station);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Observer Route Planning</h1>
        <p className="text-muted-foreground">
          Plan efficient routes to visit polling stations on election day using real-time location data.
        </p>
      </div>

      {/* Location status indicator */}
      {locationStatus === 'denied' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Location access denied</AlertTitle>
          <AlertDescription>
            This feature requires location access. Please enable location services in your browser settings.
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={requestLocation}
            >
              Request Access Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {locationStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Location error</AlertTitle>
          <AlertDescription>
            There was a problem accessing your location. Please try again.
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={requestLocation}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Location tracking controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Location Tracking</CardTitle>
            <CardDescription>Control real-time location updates</CardDescription>
          </div>
          <Badge
            variant={isWatching ? "default" : "outline"}
            className={isWatching ? "bg-green-500 hover:bg-green-600" : ""}
          >
            {isWatching ? "Active" : "Inactive"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row items-center gap-4">
            <Button
              onClick={startWatching}
              disabled={isWatching || locationStatus === 'denied'}
              className="flex-1"
            >
              <Navigation className="mr-2 h-4 w-4" />
              Start Tracking
            </Button>
            <Button
              onClick={stopWatching}
              disabled={!isWatching}
              variant="secondary"
              className="flex-1"
            >
              <Loader2 className="mr-2 h-4 w-4" />
              Stop Tracking
            </Button>
          </div>
          
          {userLocation && (
            <div className="mt-4 text-sm">
              <p><strong>Current Position:</strong> {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</p>
              {userLocation.accuracy && <p><strong>Accuracy:</strong> ±{userLocation.accuracy.toFixed(1)}m</p>}
              {userLocation.speed && <p><strong>Speed:</strong> {(userLocation.speed * 3.6).toFixed(1)} km/h</p>}
              {userLocation.heading && <p><strong>Heading:</strong> {userLocation.heading.toFixed(0)}°</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="map">
            <MapIcon className="mr-2 h-4 w-4" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            Station List
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="map" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading stations</AlertTitle>
              <AlertDescription>
                Failed to load polling stations. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="h-[600px] relative">
                <InteractiveMap
                  markers={[
                    // User's current location marker
                    ...(userLocation ? [{
                      lat: userLocation.lat,
                      lng: userLocation.lng,
                      text: "You are here",
                      type: 'current' as const
                    }] : []),
                    
                    // Polling station markers
                    ...(pollingStations?.map(station => ({
                      lat: station.latitude || 0,
                      lng: station.longitude || 0,
                      text: station.name,
                      id: station.id,
                      type: selectedStations.some(s => s.id === station.id) 
                        ? 'selected' as const
                        : 'default' as const
                    })) || [])
                  ]}
                  routes={optimizedRoute.length > 1 ? [
                    {
                      points: optimizedRoute.map(point => ({
                        lat: point.lat,
                        lng: point.lng
                      })),
                      color: "#0284c7",
                      width: 4
                    }
                  ] : []}
                  onMarkerClick={handleMapMarkerClick}
                  centerLat={userLocation ? userLocation.lat : 18.0179}
                  centerLng={userLocation ? userLocation.lng : -76.8099}
                  zoom={11}
                  ref={(mapInstance: any) => { mapRef.current = mapInstance; }}
                />
              </div>
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setSelectedStations([])}
                  disabled={selectedStations.length === 0}
                >
                  Clear Selection ({selectedStations.length})
                </Button>
                
                <Button
                  onClick={calculateRoute}
                  disabled={!userLocation || selectedStations.length === 0 || isCalculating}
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <RotateCw className="mr-2 h-4 w-4" />
                      Calculate Optimal Route
                    </>
                  )}
                </Button>
              </div>
              
              {/* Optimized route summary */}
              {optimizedRoute.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Optimized Route</CardTitle>
                    <CardDescription>
                      Visit {optimizedRoute.length} stations in this order for the most efficient route
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {optimizedRoute.map((point, index) => {
                        // Calculate distance from previous point
                        const prevPoint = index > 0 ? optimizedRoute[index - 1] : { lat: userLocation?.lat || 0, lng: userLocation?.lng || 0 };
                        const distance = calculateHaversineDistance(
                          prevPoint.lat, 
                          prevPoint.lng, 
                          point.lat, 
                          point.lng
                        );
                        
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{point.name}</p>
                              {index > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  {formatDistance(distance)} from previous stop
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading stations</AlertTitle>
              <AlertDescription>
                Failed to load polling stations. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Polling Stations</CardTitle>
                <CardDescription>
                  Select stations to include in your route plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {userLocation && pollingStations?.map(station => {
                    // Calculate distance from current location
                    const distance = calculateHaversineDistance(
                      userLocation.lat,
                      userLocation.lng,
                      station.latitude || 0,
                      station.longitude || 0
                    );
                    
                    const isSelected = selectedStations.some(s => s.id === station.id);
                    
                    return (
                      <div 
                        key={station.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                        }`}
                        onClick={() => toggleStationSelection(station)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{station.name}</p>
                            <p className="text-sm text-muted-foreground">{station.address}, {station.city}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistance(distance)} away
                            </p>
                          </div>
                          <Badge variant={isSelected ? "default" : "outline"}>
                            {isSelected ? "Selected" : "Select"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}