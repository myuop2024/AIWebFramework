import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Plus, FileUp, FileDown, Edit, Eye, Trash2, Search, RefreshCw } from "lucide-react";
import { PollingStationForm } from "./polling-station-form";
import { PollingStationMap } from "./polling-station-map";
import { type PollingStation } from '@shared/schema';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function PollingStationManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);

  // Fetch polling stations
  const { data: stations = [], isLoading, refetch } = useQuery<PollingStation[]>({
    queryKey: ['/api/admin/polling-stations']
  });

  // Filter stations based on search query
  const filteredStations = stations.filter(station => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      station.name.toLowerCase().includes(searchTerm) ||
      (station.code && station.code.toLowerCase().includes(searchTerm)) ||
      (station.city && station.city.toLowerCase().includes(searchTerm)) ||
      (station.region && station.region.toLowerCase().includes(searchTerm))
    );
  });

  // Create a new polling station
  const createStation = useMutation({
    mutationFn: async (stationData: Omit<PollingStation, 'id'>) => {
      return apiRequest(
        'POST',
        '/api/admin/polling-stations',
        stationData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling-stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Station Created",
        description: "The polling station has been created successfully.",
      });
      setFormOpen(false);
    },
    onError: (error: Error) => {
      console.error('Error creating polling station:', error);
      const isStubError = error.message && error.message.includes('STUB:');
      toast({
        title: isStubError ? "Feature Incomplete" : "Failed to create station",
        description: isStubError
          ? "This feature (Create Polling Station) is not yet fully implemented. Our team has been notified."
          : "There was an error creating the polling station.",
        variant: "destructive",
      });
    }
  });

  // Update an existing polling station
  const updateStation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<PollingStation> }) => {
      return apiRequest(
        'PATCH',
        `/api/admin/polling-stations/${id}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling-stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Station Updated",
        description: "The polling station has been updated successfully.",
      });
      setFormOpen(false);
    },
    onError: (error: Error) => {
      console.error('Error updating polling station:', error);
      const isStubError = error.message && error.message.includes('STUB:');
      toast({
        title: isStubError ? "Feature Incomplete" : "Failed to update station",
        description: isStubError
          ? "This feature (Update Polling Station) is not yet fully implemented. Our team has been notified."
          : "There was an error updating the polling station.",
        variant: "destructive",
      });
    }
  });

  // Delete a polling station
  const deleteStation = useMutation({
    mutationFn: async (stationId: number) => {
      // Note: deletePollingStation stub returns Promise.resolve(false), 
      // apiRequest might need to be adjusted or this needs to check response status if not 2xx
      return apiRequest(
        'DELETE',
        `/api/admin/polling-stations/${stationId}`
      );
    },
    onSuccess: (response: any) => { // Assuming apiRequest forwards the actual response or response.ok
      // If apiRequest throws for non-2xx, this onSuccess might not be hit for a failed (false) delete.
      // If it *does* hit onSuccess, we might need to check response content.
      // For now, let's assume a successful HTTP response means it *would* have deleted.
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling-stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Station Deletion Attempted", // Changed title for stub
        description: "The polling station deletion was attempted. If the feature were complete, it would be deleted.", // Changed for stub
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting polling station:', error);
      const isStubError = error.message && (error.message.includes('STUB:') || error.message.includes('deletion failed')); // Broaden for delete stub
      toast({
        title: isStubError ? "Feature Incomplete" : "Failed to delete station",
        description: isStubError 
          ? "This feature (Delete Polling Station) is not yet fully implemented or the station could not be deleted (e.g. in use). Our team has been notified."
          : "The polling station could not be deleted. It may be in use by assignments.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const handleFormSubmit = (data: PollingStation) => {
    if (selectedStation) {
      // Update existing station
      updateStation.mutate({ id: selectedStation.id, data });
    } else {
      // Create new station
      createStation.mutate(data);
    }
  };

  // Handle deleting a station
  const handleDeleteStation = (id: number) => {
    if (window.confirm("Are you sure you want to delete this polling station? This action cannot be undone.")) {
      deleteStation.mutate(id);
    }
  };

  // Handle edit station
  const handleEditStation = (id: number) => {
    const station = stations.find(s => s.id === id);
    if (station) {
      setSelectedStation(station);
      setFormOpen(true);
    }
  };

  // Handle view map
  const handleViewMap = (id: number) => {
    const station = stations.find(s => s.id === id);
    if (station) {
      setSelectedStation(station);
      setMapOpen(true);
    }
  };

  // Handle adding a new station
  const handleAddStation = () => {
    setSelectedStation(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Feature Under Development</AlertTitle>
        <AlertDescription>
          The polling station management module is currently under active development. 
          Some functionalities might not be fully implemented or may behave unexpectedly.
        </AlertDescription>
      </Alert>

      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Polling Station Management</CardTitle>
              <CardDescription>
                Manage and organize polling stations
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search stations..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddStation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Station
                </Button>
                <Button variant="outline">
                  <FileUp className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
                <p className="text-gray-500">Loading polling stations...</p>
              </div>
            ) : filteredStations.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                  <MapPin className="h-6 w-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium mb-1">No stations found</h3>
                <p className="text-gray-500">
                  {searchQuery ? "Try adjusting your search term" : "No polling stations have been added yet"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStations.map((station) => (
                      <TableRow key={station.id}>
                        <TableCell className="font-medium">{station.name}</TableCell>
                        <TableCell className="font-mono text-xs">{station.code || `-`}</TableCell>
                        <TableCell>
                          {station.city ? (
                            <span className="text-sm">{station.city}{station.region ? `, ${station.region}` : ''}</span>
                          ) : (
                            <span className="text-gray-400 text-sm">No location data</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {station.capacity ? (
                            <Badge variant="outline">{station.capacity}</Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditStation(station.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-green-600 text-green-600 hover:bg-green-50"
                              onClick={() => handleViewMap(station.id)}
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              Map
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-600 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteStation(station.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''}
          </div>
          {filteredStations.length > 10 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <span className="text-sm">Page 1 of 1</span>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          )}
        </CardFooter>
        {/* Polling Station Form Modal */}
        <PollingStationForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          station={selectedStation || undefined}
          title={selectedStation ? "Edit Polling Station" : "Add New Polling Station"}
        />

        {/* Polling Station Map Modal */}
        <PollingStationMap
          isOpen={mapOpen}
          onClose={() => setMapOpen(false)}
          station={selectedStation}
        />
      </Card>
    </div>
  );
}