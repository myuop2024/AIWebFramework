import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapPin, Plus, Filter, List, Info } from "lucide-react";

import PageHeader from "@/components/layout/page-header";
import InteractiveMap from "@/components/mapping/interactive-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Polling station type interface
interface PollingStation {
  id: number;
  name: string;
  stationCode: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export default function PollingStationsMapPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string>("all"); // 'all', 'active', 'inactive'
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  // Fetch polling stations from API
  const { data: stations, isLoading, error } = useQuery<PollingStation[]>({
    queryKey: ["/api/polling-stations"],
  });

  // Filter stations based on search term and filter
  const filteredStations = stations?.filter((station) => {
    const matchesSearch =
      station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.stationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.state.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "active" && station.isActive) ||
      (filter === "inactive" && !station.isActive);

    return matchesSearch && matchesFilter;
  });

  // Convert stations to map markers
  const markers = filteredStations?.map((station) => ({
    id: station.id,
    lat: station.latitude,
    lng: station.longitude,
    text: station.stationCode.slice(0, 3),
    type: station.isActive ? "default" : "warning" as "default" | "warning",
  }));

  // Handle marker click to show station details
  const handleMarkerClick = (markerId: string | number) => {
    const station = stations?.find((s) => s.id === markerId);
    if (station) {
      setSelectedStation(station);
    }
  };

  // Clear selected station when filters change
  useEffect(() => {
    setSelectedStation(null);
  }, [searchTerm, filter]);

  // Handle map bounds change
  const handleBoundsChanged = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    setMapBounds(bounds);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        title="Polling Stations Map"
        description="View and manage polling stations on the map"
        tabs={[
          {
            label: "Map View",
            href: "/polling-stations/map",
            active: true,
          },
          {
            label: "List View",
            href: "/polling-stations",
            active: false,
          },
          {
            label: "Create New",
            href: "/polling-stations/create",
            active: false,
          },
          {
            label: "Import",
            href: "/polling-stations/import",
            active: false,
          },
          {
            label: "Export",
            href: "/polling-stations/export",
            active: false,
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/polling-stations/create">
                <Plus className="mr-2 h-4 w-4" />
                Add Station
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filter sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Search</h3>
                <div className="relative">
                  <Input
                    placeholder="Search stations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                  <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Filter</h3>
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stations</SelectItem>
                    <SelectItem value="active">Active Stations</SelectItem>
                    <SelectItem value="inactive">Inactive Stations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchTerm("");
                    setFilter("all");
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Statistics</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted rounded p-2 text-center">
                    <div className="text-2xl font-bold">
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 mx-auto" />
                      ) : (
                        stations?.length || 0
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="bg-muted rounded p-2 text-center">
                    <div className="text-2xl font-bold">
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 mx-auto" />
                      ) : (
                        stations?.filter((s) => s.isActive).length || 0
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="bg-muted rounded p-2 text-center">
                    <div className="text-2xl font-bold">
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 mx-auto" />
                      ) : (
                        filteredStations?.length || 0
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Filtered</div>
                  </div>
                  <div className="bg-muted rounded p-2 text-center">
                    <div className="text-2xl font-bold">
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 mx-auto" />
                      ) : (
                        stations?.filter((s) => !s.isActive).length || 0
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Inactive</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* List of visible stations */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                <div className="bg-muted p-2 sticky top-0 z-10 flex justify-between items-center border-b">
                  <h3 className="text-sm font-medium">Visible Stations</h3>
                  <div className="text-xs text-muted-foreground">
                    {filteredStations?.length || 0} stations
                  </div>
                </div>
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : filteredStations?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No stations found
                  </div>
                ) : (
                  <div>
                    {filteredStations?.map((station) => (
                      <button
                        key={station.id}
                        className={`w-full text-left p-2 hover:bg-muted border-b last:border-0 ${
                          selectedStation?.id === station.id
                            ? "bg-primary/10"
                            : ""
                        }`}
                        onClick={() => setSelectedStation(station)}
                      >
                        <div className="flex items-center">
                          <div
                            className={`h-2 w-2 rounded-full mr-2 ${
                              station.isActive
                                ? "bg-green-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          <div>
                            <div className="font-medium truncate">
                              {station.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {station.stationCode}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map container */}
        <div className="md:col-span-3">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[700px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Skeleton className="h-[400px] w-full" />
                      <div className="mt-2 text-muted-foreground">
                        Loading map...
                      </div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="h-full flex items-center justify-center bg-muted">
                    <div className="text-center text-red-500">
                      Error loading map
                    </div>
                  </div>
                ) : (
                  <InteractiveMap
                    height="700px"
                    width="100%"
                    markers={markers || []}
                    centerLat={18.0179} // Kingston, Jamaica
                    centerLng={-76.8099}
                    zoom={9}
                    onMarkerClick={handleMarkerClick}
                    onBoundsChanged={handleBoundsChanged}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected station panel */}
          {selectedStation && (
            <Card className="mt-4 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{selectedStation.name}</h3>
                    <div className="text-sm text-muted-foreground mb-2">
                      Code: {selectedStation.stationCode}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <Link
                              href={`/polling-stations/${selectedStation.id}`}
                            >
                              <Info className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <Link
                              href={`/polling-stations/${selectedStation.id}/edit`}
                            >
                              <MapPin className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Location</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <h4 className="text-sm font-medium">Address</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedStation.address}, {selectedStation.city},{" "}
                      {selectedStation.state}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Status</h4>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          selectedStation.isActive
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedStation.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="text-sm font-medium">Latitude</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedStation.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Longitude</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedStation.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedStation(null)}
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    asChild
                  >
                    <Link href={`/polling-stations/${selectedStation.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}