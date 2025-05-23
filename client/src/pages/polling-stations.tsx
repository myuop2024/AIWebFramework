import { useState } from "react";
import { RotateCw, MoreHorizontal, FilePlus, Download, Upload, MapPin, Printer, Share2, Settings, Eye } from "lucide-react";
import PollingStationsList from "@/components/polling-stations/polling-stations-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function PollingStationsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Polling Stations</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="text-sm flex items-center text-muted-foreground hover:text-foreground transition"
              onClick={() => {
                setIsRefreshing(true);
                // Using React Query's invalidation instead of full page reload
                queryClient.invalidateQueries({ queryKey: ['/api/polling-stations'] });
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
            >
              <RotateCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="h-9 w-9 p-2 rounded-md hover:bg-muted flex items-center justify-center" asChild>
                <button className="rounded-md hover:bg-muted flex items-center justify-center">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Station Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {/* Handle Add Station */}}>
                  <FilePlus className="mr-2 h-4 w-4" />
                  Add New Station
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* Handle Import Stations */}}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Stations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* Handle Export Stations */}}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Stations
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {/* Handle Print Station List */}}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Station List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* Handle Share Stations */}}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Stations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* Handle View on Map */}}>
                  <Eye className="mr-2 h-4 w-4" />
                  View on Map
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {/* Handle Station Settings */}}>
                  <Settings className="mr-2 h-4 w-4" />
                  Station Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-muted-foreground">
          Manage polling stations for election observation and coordinate observer assignments
        </p>
      </div>
      
      <div className="space-y-6">
        <PollingStationsList />
      </div>
    </div>
  );
}