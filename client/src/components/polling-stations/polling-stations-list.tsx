import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, MapPin, Users, ClipboardList, Loader2, Edit, Trash } from "lucide-react";
import InteractiveMap from "@/components/mapping/interactive-map";
import { Separator } from "@/components/ui/separator";
import { PollingStation } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import PollingStationForm from "./polling-station-form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PollingStationsList() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [view, setView] = useState<"map" | "list">("list");
  
  // Fetch polling stations
  const { data: pollingStations, isLoading } = useQuery({
    queryKey: ["/api/polling-stations"],
    queryFn: async () => {
      const res = await fetch("/api/polling-stations");
      if (!res.ok) throw new Error("Failed to fetch polling stations");
      return res.json();
    },
  });

  // Create a new polling station
  const createMutation = useMutation({
    mutationFn: async (newStation: any) => {
      const res = await apiRequest("POST", "/api/polling-stations", newStation);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polling-stations"] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Polling station created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create polling station: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update a polling station
  const updateMutation = useMutation({
    mutationFn: async (updatedStation: any) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/polling-stations/${updatedStation.id}`, 
        updatedStation
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polling-stations"] });
      setShowEditDialog(false);
      setSelectedStation(null);
      toast({
        title: "Success",
        description: "Polling station updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update polling station: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete a polling station
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/polling-stations/${id}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polling-stations"] });
      toast({
        title: "Success",
        description: "Polling station deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete polling station: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission for creating a new polling station
  const handleCreateSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  // Handle form submission for updating a polling station
  const handleUpdateSubmit = (data: any) => {
    if (selectedStation) {
      updateMutation.mutate({ ...data, id: selectedStation.id });
    }
  };

  // Handle deletion of a polling station
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this polling station?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filter stations based on search query
  const filteredStations = pollingStations
    ? pollingStations.filter((station: PollingStation) =>
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.stationCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Map markers for the stations
  const stationMarkers = filteredStations.map((station: PollingStation) => ({
    lat: station.latitude || 0,
    lng: station.longitude || 0,
    title: station.name,
  }));

  // Get center point for map (average of all stations or default)
  const mapCenter = filteredStations.length > 0
    ? {
        lat: filteredStations.reduce((sum: number, s: PollingStation) => sum + (s.latitude || 0), 0) / filteredStations.length,
        lng: filteredStations.reduce((sum: number, s: PollingStation) => sum + (s.longitude || 0), 0) / filteredStations.length,
      }
    : { lat: 0, lng: 0 };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Polling Stations</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Station
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 pb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name, address, or station code..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as "map" | "list")}>
                <TabsList>
                  <TabsTrigger value="list">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <MapPin className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="list" className="mt-0">
                  {filteredStations.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead className="text-center">Capacity</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStations.map((station: PollingStation) => (
                            <TableRow key={station.id}>
                              <TableCell className="font-medium">{station.name}</TableCell>
                              <TableCell>{station.address}</TableCell>
                              <TableCell>{station.stationCode}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                                  {station.capacity}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={
                                    station.status === "active"
                                      ? "default"
                                      : station.status === "pending"
                                      ? "outline"
                                      : "destructive"
                                  }
                                >
                                  {station.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedStation(station);
                                      setShowEditDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(station.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No polling stations found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery
                          ? "Try a different search term"
                          : "Create your first polling station"}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="map" className="mt-0">
                  <div className="rounded-md overflow-hidden border">
                    <InteractiveMap
                      latitude={mapCenter.lat}
                      longitude={mapCenter.lng}
                      markers={stationMarkers}
                      height={600}
                      zoom={stationMarkers.length > 0 ? 10 : 2}
                      onMarkerClick={(index) => {
                        setSelectedStation(filteredStations[index]);
                        setShowEditDialog(true);
                      }}
                      showUserLocation
                    />
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Polling Station</DialogTitle>
          </DialogHeader>
          <Separator />
          <PollingStationForm
            onSubmit={handleCreateSubmit}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Polling Station</DialogTitle>
          </DialogHeader>
          <Separator />
          {selectedStation && (
            <PollingStationForm
              initialData={selectedStation}
              onSubmit={handleUpdateSubmit}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}