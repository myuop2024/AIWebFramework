import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Navigation, Check, Clock } from "lucide-react";
import InteractiveMap from "@/components/mapping/interactive-map";
import { type PollingStation } from '@shared/schema';

// We'd use a real map implementation like Google Maps or Leaflet in production
// This is a simplified version for the demo

interface Assignment {
  id: number;
  userId: number;
  stationId: number;
  startDate: string;
  endDate: string;
  status: string;
  isPrimary: boolean;
  role: string;
  // other fields...
}

interface StationMapProps {
  selectedStationId?: number;
  onSelectStation?: (stationId: number) => void;
  showCheckin?: boolean;
}

export default function StationMap({ 
  selectedStationId, 
  onSelectStation,
  showCheckin = false
}: StationMapProps) {
  const [activeTab, setActiveTab] = useState<string>("map");
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkinTime, setCheckinTime] = useState<Date | null>(null);

  // Fetch polling stations
  const { data: stations = [], isLoading: isStationsLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations'],
  });

  // Fetch user assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/users/assignments'],
  });

  // Format coordinates
  const parseCoordinates = (coordinatesString: string) => {
    try {
      return JSON.parse(coordinatesString);
    } catch (error) {
      return { lat: 0, lng: 0 };
    }
  };

  // Get selected station details
  const selectedStation = stations.find(station => station.id === selectedStationId);
  
  // Handle check-in
  const handleCheckin = () => {
    // In a real implementation, this would call the API to check in
    setIsCheckedIn(true);
    setCheckinTime(new Date());
  };

  // We no longer need this effect since we're using the InteractiveMap component

  if (isStationsLoading || isAssignmentsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (stations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Polling Stations</CardTitle>
          <CardDescription>No polling stations available</CardDescription>
        </CardHeader>
        <CardContent className="text-center p-6">
          <p className="text-gray-500">No polling stations have been assigned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Polling Stations</CardTitle>
        <CardDescription>
          {selectedStation 
            ? `Viewing: ${selectedStation.name}`
            : "View and navigate to your assigned polling stations"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="relative">
            <div className="h-[300px] relative">
              {stations.length > 0 && (
                <InteractiveMap
                  markers={stations.map((station) => ({
                    lat: station.latitude || parseCoordinates(station.coordinates || "{}").lat || 0,
                    lng: station.longitude || parseCoordinates(station.coordinates || "{}").lng || 0,
                    text: station.name
                  }))}
                  onMarkerClick={(index) => {
                    if (index >= 0 && index < stations.length) {
                      onSelectStation?.(stations[index].id);
                    }
                  }}
                  showUserLocation={true}
                  height="300px"
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="list">
            <div className="divide-y divide-gray-200">
              {stations.map((station) => {
                const isAssigned = assignments.some((a) => a.stationId === station.id);
                const isPrimary = assignments.some((a) => a.stationId === station.id && a.isPrimary);
                
                return (
                  <div 
                    key={station.id} 
                    className={`p-4 ${
                      selectedStationId === station.id ? 'bg-primary-light/10' : ''
                    } ${isAssigned ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => isAssigned && onSelectStation && onSelectStation(station.id)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`p-2 rounded-full ${isPrimary ? 'bg-primary/10' : 'bg-gray-100'}`}>
                          <MapPin className={`h-5 w-5 ${isPrimary ? 'text-primary' : 'text-gray-500'}`} />
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900">{station.name}</h4>
                          {isPrimary && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-light/20 text-primary">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{station.address}, {station.city}</p>
                        <p className="text-sm text-gray-500">{station.state}, {station.zipCode}</p>
                        
                        <div className="mt-2 flex flex-wrap gap-2">
                          {isAssigned && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                // In a real implementation, this would open Google Maps directions
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.address},${station.city},${station.state}`, '_blank');
                              }}
                            >
                              <Navigation className="h-3.5 w-3.5 mr-1" />
                              Directions
                            </Button>
                          )}
                          
                          {showCheckin && isAssigned && selectedStationId === station.id && (
                            isCheckedIn ? (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="h-8 text-xs bg-green-100 text-green-800 hover:bg-green-200"
                                disabled
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Checked In {checkinTime && (
                                  <span className="ml-1">
                                    {checkinTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="default"
                                className="h-8 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCheckin();
                                }}
                              >
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Check In
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
