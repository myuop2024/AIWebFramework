import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import StationMap from "@/components/polling/station-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, CheckCircle, FileText, AlertCircle } from "lucide-react";

export default function PollingStations() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Fetch polling stations
  const { data: stations, isLoading: isStationsLoading } = useQuery({
    queryKey: ['/api/polling-stations'],
  });

  // Fetch user assignments
  const { data: assignments, isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['/api/users/assignments'],
  });

  // Get currently selected station
  const selectedStation = selectedStationId 
    ? stations?.find(station => station.id === selectedStationId)
    : undefined;

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Parse coordinates
  const parseCoordinates = (coordinatesString: string) => {
    try {
      return JSON.parse(coordinatesString);
    } catch (error) {
      return { lat: 0, lng: 0 };
    }
  };

  // Handle station selection
  const handleSelectStation = (stationId: number) => {
    setSelectedStationId(stationId);
  };

  // Loading state
  if (loading || isStationsLoading || isAssignmentsLoading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-6">
          <Skeleton className="h-[400px] w-full rounded-md" />
          <Skeleton className="h-80 w-full rounded-md" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Map Component */}
      <div className="mb-6">
        <StationMap 
          selectedStationId={selectedStationId} 
          onSelectStation={handleSelectStation}
          showCheckin={true}
        />
      </div>

      {/* Station Details */}
      {selectedStation ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>{selectedStation.name}</CardTitle>
                <CardDescription>
                  {selectedStation.address}, {selectedStation.city}, {selectedStation.state} {selectedStation.zipCode}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.address},${selectedStation.city},${selectedStation.state}`, '_blank')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Directions
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/reports/new")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Station Details</TabsTrigger>
                <TabsTrigger value="reports">Recent Reports</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Station Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Station Code:</span>
                        <span className="font-medium">{selectedStation.stationCode}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Area:</span>
                        <span className="font-medium">{selectedStation.city}, {selectedStation.state}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Coordinates:</span>
                        <span className="font-medium">
                          {selectedStation.coordinates ? (
                            `${parseCoordinates(selectedStation.coordinates).lat.toFixed(4)}, ${parseCoordinates(selectedStation.coordinates).lng.toFixed(4)}`
                          ) : (
                            'Not available'
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Assignment Type:</span>
                        <span className="font-medium">
                          {assignments?.find(a => a.stationId === selectedStation.id)?.isPrimary 
                            ? 'Primary' 
                            : 'Secondary'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Operating Hours</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Opening Time:</span>
                        <span className="font-medium">7:00 AM</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Closing Time:</span>
                        <span className="font-medium">6:00 PM</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Election Date:</span>
                        <span className="font-medium">September 3, 2023</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Notes</h3>
                  <p className="text-gray-600">
                    Please arrive at least 30 minutes before the polling station opens. 
                    Check in with the station supervisor upon arrival and ensure you have 
                    your observer ID badge visible at all times.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="reports" className="pt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* This would be populated from a query to reports for this station */}
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-gray-500">No reports found for this station</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => navigate("/reports/new")}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Submit New Report
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="schedule" className="pt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Shift Time</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>September 3, 2023</TableCell>
                        <TableCell>7:00 AM - 11:00 AM</TableCell>
                        <TableCell>Observer</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmed</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>September 3, 2023</TableCell>
                        <TableCell>3:00 PM - 6:00 PM</TableCell>
                        <TableCell>Observer</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmed</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Station Details</CardTitle>
            <CardDescription>
              Select a polling station from the map above to view details
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Station Selected</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Click on a polling station marker on the map to view detailed information, 
              submit reports, or check in to the station.
            </p>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
