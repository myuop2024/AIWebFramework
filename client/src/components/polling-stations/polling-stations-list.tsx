import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MapPin, Users, ClipboardList, Loader2, Edit, Trash, MoreHorizontal } from "lucide-react";
import InteractiveMap from "@/components/mapping/interactive-map";
import { Separator } from "@/components/ui/separator";
import { type PollingStation } from '@shared/schema';
import { queryClient, apiRequest } from "@/lib/queryClient";
import PollingStationForm, { type PollingStationFormData } from "./polling-station-form";
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
  const [showAssignmentsDialog, setShowAssignmentsDialog] = useState(false);
  const [assignmentsStation, setAssignmentsStation] = useState<PollingStation | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allObservers, setAllObservers] = useState<any[]>([]);
  const [selectedObserverId, setSelectedObserverId] = useState<number | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // Fetch polling stations
  const { data: pollingStations, isLoading } = useQuery({
    queryKey: ["/api/polling-stations"],
    queryFn: async () => {
      const res = await fetch("/api/polling-stations");
      if (!res.ok) throw new Error("Failed to fetch polling stations");
      return res.json();
    },
  });

  // Fetch all observers for assignment dropdown (admin/supervisor only)
  useEffect(() => {
    if (showAssignmentsDialog) {
      fetch('/api/admin/users')
        .then(res => res.json())
        .then(users => setAllObservers(users.filter((u: any) => u.role === 'observer')));
    }
  }, [showAssignmentsDialog]);

  // Fetch assignments for the selected station
  useEffect(() => {
    if (assignmentsStation) {
      fetch(`/api/polling-stations/${assignmentsStation.id}/assignments`)
        .then(res => res.json())
        .then(setAssignments);
    }
  }, [assignmentsStation, showAssignmentsDialog]);

  // Create a new polling station
  const createMutation = useMutation({
    mutationFn: async (newStationData: PollingStationFormData) => {
      const res = await apiRequest("POST", "/api/polling-stations", newStationData as any);
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
    mutationFn: async (updatedStationData: PollingStationFormData & { id: number }) => {
      const { id, ...dataToUpdate } = updatedStationData;
      const res = await apiRequest(
        "PATCH", 
        `/api/polling-stations/${id}`, 
        dataToUpdate as any
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
  const handleCreateSubmit = (data: PollingStationFormData) => {
    createMutation.mutate(data);
  };

  // Handle form submission for updating a polling station
  const handleUpdateSubmit = (data: PollingStationFormData) => {
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

  // Assign observer to station
  const handleAssign = async () => {
    if (!assignmentsStation || !selectedObserverId) return;
    setAssignLoading(true);
    await fetch(`/api/polling-stations/${assignmentsStation.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedObserverId })
    });
    setAssignLoading(false);
    setSelectedObserverId(null);
    // Refresh assignments
    fetch(`/api/polling-stations/${assignmentsStation.id}/assignments`)
      .then(res => res.json())
      .then(setAssignments);
  };

  // Unassign observer
  const handleUnassign = async (userId: number) => {
    if (!assignmentsStation) return;
    await fetch(`/api/polling-stations/${assignmentsStation.id}/unassign/${userId}`, { method: 'DELETE' });
    // Refresh assignments
    fetch(`/api/polling-stations/${assignmentsStation.id}/assignments`)
      .then(res => res.json())
      .then(setAssignments);
  };

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
              <div className="flex items-center">
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  className="rounded-r-none"
                  onClick={() => setView("list")}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={view === "map" ? "default" : "outline"}
                  className="rounded-l-none"
                  onClick={() => setView("map")}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Map
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {view === "list" && (
                  <div className="mt-0">
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
                                  <div className="flex justify-end">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedStation(station);
                                          setShowEditDialog(true);
                                        }}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit Station
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(station.id)}>
                                          <Trash className="mr-2 h-4 w-4" />
                                          Delete Station
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
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
                  </div>
                )}

                {view === "map" && (
                  <div className="mt-0">
                    <div className="rounded-md overflow-hidden border">
                      <InteractiveMap
                        center={{ lat: mapCenter.lat, lng: mapCenter.lng }}
                        markers={stationMarkers}
                        height={600}
                        zoom={stationMarkers.length > 0 ? 10 : 2}
                        onMarkerClick={(index) => {
                          setSelectedStation(filteredStations[index]);
                          setShowEditDialog(true);
                        }}
                      />
                    </div>
                  </div>
                )}
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
              initialData={{
                ...selectedStation,
                latitude: selectedStation.latitude ?? undefined,
                longitude: selectedStation.longitude ?? undefined,
                capacity: selectedStation.capacity ?? undefined,
              }}
              onSubmit={handleUpdateSubmit}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {showAssignmentsDialog && assignmentsStation && (
        <Dialog open={showAssignmentsDialog} onOpenChange={setShowAssignmentsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assignments for {assignmentsStation.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Assigned Observers</h3>
                <ul className="space-y-1">
                  {assignments.length ? assignments.map(a => (
                    <li key={a.userId} className="flex items-center justify-between">
                      <span>{a.user?.firstName} {a.user?.lastName} ({a.user?.username})</span>
                      <Button size="sm" variant="destructive" onClick={() => handleUnassign(a.userId)}>Unassign</Button>
                    </li>
                  )) : <span className="text-muted-foreground">No observers assigned.</span>}
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Assign New Observer</h3>
                <select value={selectedObserverId ?? ''} onChange={e => setSelectedObserverId(Number(e.target.value))} className="border rounded px-2 py-1 w-full">
                  <option value="">Select observer...</option>
                  {allObservers.map(o => (
                    <option key={o.id} value={o.id}>{o.firstName} {o.lastName} ({o.username})</option>
                  ))}
                </select>
                <Button className="mt-2" onClick={handleAssign} disabled={!selectedObserverId || assignLoading}>
                  {assignLoading ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}