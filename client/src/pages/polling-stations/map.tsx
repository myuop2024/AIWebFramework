import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import InteractiveMap from "@/components/mapping/interactive-map";
import PageHeader from "@/components/layout/page-header";

export default function PollingStationMap() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStations, setFilteredStations] = useState<any[]>([]);
  
  const { data: stations, isLoading } = useQuery({
    queryKey: ["/api/polling-stations"],
  });
  
  useEffect(() => {
    if (stations && Array.isArray(stations)) {
      if (!searchTerm) {
        setFilteredStations(stations);
      } else {
        const filtered = stations.filter((station) => 
          station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          station.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          station.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          station.stationCode.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredStations(filtered);
      }
    }
  }, [stations, searchTerm]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-gray-500">Loading polling stations...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <PageHeader
        title="Polling Station Map"
        description="View all polling stations on an interactive map"
        actions={
          <div className="flex">
            <div className="relative w-full max-w-sm mr-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search stations..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSearchTerm("")}
            >
              Clear
            </Button>
          </div>
        }
      />
      
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <div className="h-[70vh] rounded-md overflow-hidden">
          <InteractiveMap 
            stations={filteredStations} 
            selectedStationId={null}
            onStationSelect={() => {}}
            isSelectable={false}
          />
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Showing {filteredStations.length} polling stations on the map</p>
      </div>
    </div>
  );
}