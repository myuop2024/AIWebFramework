import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, RefreshCw, Edit, MapPin, Download, Upload } from "lucide-react";

// Types
interface PollingStation {
  id: number;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  region?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export function PollingStationManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch polling stations
  const { data: stations = [], isLoading, refetch } = useQuery<PollingStation[]>({
    queryKey: ['/api/admin/polling-stations']
  });

  // Update station status
  const updateStationStatus = useMutation({
    mutationFn: async ({ stationId, isActive }: { stationId: number, isActive: boolean }) => {
      return apiRequest(
        'PATCH',
        `/api/admin/polling-stations/${stationId}`,
        { isActive }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling-stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Station updated",
        description: "The polling station status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating station status:', error);
      toast({
        title: "Failed to update station",
        description: "There was an error updating the polling station status.",
        variant: "destructive",
      });
    }
  });

  // Filter stations based on search term
  const filteredStations = stations.filter(station => 
    searchTerm === "" || 
    station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (station.code && station.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (station.city && station.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (station.region && station.region.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle station status toggle
  const handleToggleStationStatus = (stationId: number, currentStatus: boolean = true) => {
    updateStationStatus.mutate({ stationId, isActive: !currentStatus });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Polling Station Management</CardTitle>
            <CardDescription>
              View and manage polling stations for the election
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search stations by name, code, city..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Station
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
            <p className="text-gray-500">Loading polling stations...</p>
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-1">No polling stations found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? "Try a different search term or clear the search" 
                : "You haven't added any polling stations yet"}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Station
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Station Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {station.code || `STA${String(station.id).padStart(3, '0')}`}
                    </TableCell>
                    <TableCell>
                      {station.city ? `${station.city}${station.region ? `, ${station.region}` : ''}` : 'N/A'}
                    </TableCell>
                    <TableCell>{station.capacity || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={station.isActive ? "default" : "outline"}
                        className={!station.isActive ? "text-gray-500" : undefined}
                      >
                        {station.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleStationStatus(station.id, station.isActive)}
                        >
                          {station.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        
                        {station.latitude && station.longitude && (
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            Map
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          Showing {filteredStations.length} of {stations.length} polling stations
        </div>
      </CardFooter>
    </Card>
  );
}