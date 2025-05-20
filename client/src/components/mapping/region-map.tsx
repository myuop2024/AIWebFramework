import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Info } from "lucide-react";
import InteractiveMap from "./interactive-map";
import { useToast } from "@/hooks/use-toast";
import { JAMAICA_PARISHES } from "@/data/jamaica-parishes";
import { type PollingStation } from '@shared/schema';

interface Region {
  id: number;
  name: string;
  boundaries: Array<{lat: number; lng: number}>;
  color?: string;
  stationCount?: number;
}

interface RegionMapProps {
  userId?: number;
  height?: string;
  showMyRegionOnly?: boolean;
  onRegionClick?: (regionId: number) => void;
  onStationClick?: (stationId: number) => void;
}

export default function RegionMap({
  userId,
  height = "600px",
  showMyRegionOnly = false,
  onRegionClick,
  onStationClick
}: RegionMapProps) {
  const { toast } = useToast();
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [regionPolygons, setRegionPolygons] = useState<any[]>([]);
  
  // Fetch all parishes (regions)
  const { data: regions = [], isLoading: isRegionsLoading } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
  });
  
  // Fetch all polling stations
  const { data: stations = [], isLoading: isStationsLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations'],
  });
  
  // Fetch user's assigned station if userId is provided
  const { data: userAssignments = [], isLoading: isAssignmentsLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/user/assignments'],
  });

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location access denied",
            description: "We can't show your current location on the map.",
            variant: "destructive"
          });
        }
      );
    }
  }, []);
  
  // Find user's assigned region based on stations
  const userAssignedStations = userAssignments?.map((assignment: {stationId: number}) => 
    stations.find(station => station.id === assignment.stationId)
  ).filter(Boolean) as PollingStation[];
  
  // Group stations by parish (region/state)
  const stationsByRegion = stations.reduce((acc, station) => {
    const region = station.state;
    if (!acc[region]) {
      acc[region] = [];
    }
    acc[region].push(station);
    return acc;
  }, {} as Record<string, PollingStation[]>);

  // Create map markers from stations
  const mapMarkers = stations.map(station => ({
    id: station.id,
    lat: station.latitude,
    lng: station.longitude,
    text: String(station.id),
    type: station.status === 'issue' 
      ? 'issue' as const
      : userAssignedStations?.some(s => s.id === station.id)
        ? 'selected' as const
        : 'default' as const
  }));
  
  // Handle region click
  const handleRegionClick = (regionId: number) => {
    setSelectedRegion(regionId === selectedRegion ? null : regionId);
    if (onRegionClick) {
      onRegionClick(regionId);
    }
  };
  
  // Create a polygon for each parish/region to highlight it on the map
  useEffect(() => {
    // This would normally come from the API, but we'll create some sample data
    // for demonstration based on Jamaican parishes
    const jamaicaParishBoundaries = {
      'Kingston': [
        {lat: 17.9845, lng: -76.8114},
        {lat: 17.9945, lng: -76.7914},
        {lat: 17.9845, lng: -76.7714},
        {lat: 17.9645, lng: -76.7914},
        {lat: 17.9845, lng: -76.8114}
      ],
      'St. Andrew': [
        {lat: 18.0235, lng: -76.7834},
        {lat: 18.0435, lng: -76.7634},
        {lat: 18.0235, lng: -76.7434},
        {lat: 18.0035, lng: -76.7634},
        {lat: 18.0235, lng: -76.7834}
      ],
      // Add more parish boundaries as needed
    };
    
    // Convert to the format the map component expects
    const polygons = regions.map(region => ({
      id: region.id,
      points: region.boundaries || jamaicaParishBoundaries[region.name as keyof typeof jamaicaParishBoundaries] || [],
      color: region.color || (selectedRegion === region.id ? '#FFD700' : '#4CAF50'),
      fillOpacity: selectedRegion === region.id ? 0.4 : 0.2,
      onClick: () => handleRegionClick(region.id)
    }));
    
    setRegionPolygons(polygons);
  }, [regions, selectedRegion]);

  // If no regions are loaded yet, use our Jamaica parishes data
  useEffect(() => {
    if (regions.length === 0 && !isRegionsLoading) {
      // Use our predefined Jamaica parishes data with station counts
      const parishesWithStationCounts = JAMAICA_PARISHES.map(parish => {
        // Count stations in each parish
        const stationCount = stationsByRegion[parish.name]?.length || 0;
        return {
          id: parish.id,
          name: parish.name,
          stationCount: stationCount,
          boundaries: parish.boundaries,
          color: parish.color
        };
      });
      
      // In a real implementation, this data would come from the API
      // For now, we'll use it directly in our component state
      setRegionPolygons(parishesWithStationCounts.map(parish => ({
        id: parish.id,
        points: parish.boundaries || [],
        color: selectedRegion === parish.id ? '#FFD700' : parish.color || '#4CAF50',
        fillOpacity: selectedRegion === parish.id ? 0.4 : 0.2,
        onClick: () => handleRegionClick(parish.id)
      })));
    }
  }, [regions, isRegionsLoading, stationsByRegion, selectedRegion]);

  // Loading state
  if (isRegionsLoading || isStationsLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading map data...</span>
      </div>
    );
  }
  
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Polling Station Regions</CardTitle>
        <CardDescription>
          Interactive map of polling stations by parish in Jamaica
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="p-4 bg-muted/20">
          <div className="flex flex-wrap gap-2 mb-2">
            {JAMAICA_PARISHES.map(parish => {
              const stationCount = stationsByRegion[parish.name]?.length || 0;
              return (
                <Badge 
                  key={parish.id} 
                  variant={selectedRegion === parish.id ? "default" : "outline"}
                  className="cursor-pointer"
                  style={{ 
                    borderColor: parish.color,
                    backgroundColor: selectedRegion === parish.id ? parish.color : 'transparent',
                    color: selectedRegion === parish.id ? '#FFFFFF' : parish.color
                  }}
                  onClick={() => handleRegionClick(parish.id)}
                >
                  {parish.name} ({stationCount})
                </Badge>
              );
            })}
          </div>
          
          {userAssignedStations?.length > 0 && (
            <div className="mb-4 p-2 bg-blue-50 rounded-md">
              <p className="text-sm flex items-center">
                <Info className="h-4 w-4 mr-1 text-blue-500" />
                <span>You are assigned to {userAssignedStations.length} station(s) in the highlighted regions</span>
              </p>
            </div>
          )}
          
          {selectedRegion && (
            <div className="p-2 border rounded-md mb-2 bg-white">
              <h3 className="text-sm font-semibold">
                {JAMAICA_PARISHES.find(p => p.id === selectedRegion)?.name || 'Selected Region'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {stationsByRegion[JAMAICA_PARISHES.find(p => p.id === selectedRegion)?.name || '']?.length || 0} polling stations
              </p>
            </div>
          )}
        </div>
        
        <div style={{ height }}>
          <InteractiveMap
            height={height}
            width="100%"
            markers={mapMarkers}
            centerLat={selectedRegion ? 
              JAMAICA_PARISHES.find(p => p.id === selectedRegion)?.center.lat || 18.0179 : 
              18.0179} // Kingston, Jamaica
            centerLng={selectedRegion ? 
              JAMAICA_PARISHES.find(p => p.id === selectedRegion)?.center.lng || -76.8099 : 
              -76.8099}
            zoom={selectedRegion ? 10 : 8}
            onMarkerClick={(markerId) => {
              if (onStationClick) {
                onStationClick(Number(markerId));
              } else {
                const station = stations.find((s: PollingStation) => s.id === Number(markerId));
                if (station) {
                  toast({
                    title: station.name || 'Polling Station',
                    description: station.address ? 
                      `${station.address}, ${station.city || ''}, ${station.state || ''}` : 
                      'View station details',
                    variant: 'default'
                  });
                }
              }
            }}
            polygons={regionPolygons}
          />
        </div>
      </CardContent>
    </Card>
  );
}