import { useState } from "react";
import { RotateCw, MoreHorizontal, FilePlus, Download, Upload, MapPin } from "lucide-react";
import PollingStationsList from "@/components/polling-stations/polling-stations-list";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function PollingStationsPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Since we're using ProtectedRoute, we don't need to check for user again
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">Polling Stations</h1>
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
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Station Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <FilePlus className="mr-2 h-4 w-4" />
                Add New Station
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload className="mr-2 h-4 w-4" />
                Import Stations
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export Stations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="space-y-6">
        <PollingStationsList />
      </div>
    </div>
  );
}