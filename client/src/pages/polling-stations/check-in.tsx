
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, Clock, CheckCircle, AlertCircle, Navigation } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PollingStation {
  id: number;
  name: string;
  stationCode: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

interface Assignment {
  id: number;
  stationId: number;
  stationName: string;
  status: string;
}

export default function CheckInPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch user assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/users/assignments'],
    enabled: !!user?.id
  });

  // Fetch polling stations
  const { data: stations = [], isLoading: stationsLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations'],
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
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (stationId: number) => {
      const response = await apiRequest('POST', `/api/polling-stations/${stationId}/check-in`, {
        location: userLocation
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to check in');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Check-in Successful",
        description: `You have successfully checked in at ${data.station}`,
      });
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get assigned stations
  const assignedStationIds = assignments.map(a => a.stationId);
  const assignedStations = stations.filter(s => assignedStationIds.includes(s.id));

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCheckIn = (stationId: number) => {
    checkInMutation.mutate(stationId);
  };

  if (assignmentsLoading || stationsLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading assignments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <PageHeader
        title="Check-in to Polling Station"
        description="Check in to your assigned polling station to begin your observation duties"
        backButton={{
          href: "/dashboard",
          label: "Back to Dashboard",
        }}
      />

      <div className="mt-6 space-y-6">
        {!userLocation && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Location access is required for check-in verification. Please enable location services.
            </AlertDescription>
          </Alert>
        )}

        {assignedStations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Assigned Stations</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any polling station assignments yet. Contact your supervisor for assignments.
                </p>
                <Button onClick={() => navigate('/polling-stations')}>
                  View All Stations
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <h2 className="text-lg font-semibold">Your Assigned Stations</h2>
            {assignedStations.map((station) => {
              const distance = userLocation 
                ? calculateDistance(userLocation.lat, userLocation.lng, station.latitude, station.longitude)
                : null;
              const isNearby = distance && distance < 0.5; // Within 500m

              return (
                <Card key={station.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {station.name}
                          <Badge variant="outline">{station.stationCode}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {station.address}, {station.city}, {station.state}
                        </CardDescription>
                      </div>
                      {distance && (
                        <Badge variant={isNearby ? "default" : "secondary"}>
                          {distance.toFixed(1)} km away
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
                            window.open(url, '_blank');
                          }}
                        >
                          <Navigation className="h-4 w-4 mr-1" />
                          Directions
                        </Button>
                        <Button
                          onClick={() => handleCheckIn(station.id)}
                          disabled={checkInMutation.isPending || (!userLocation && !isNearby)}
                          className="flex items-center gap-2"
                        >
                          {checkInMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Check In
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
