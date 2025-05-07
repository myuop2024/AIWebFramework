import { useState } from "react";
import { RotateCw } from "lucide-react";
import PollingStationsList from "@/components/polling-stations/polling-stations-list";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function PollingStationsPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Since we're using ProtectedRoute, we don't need to check for user again
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Polling Stations</h1>
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
      </div>
      
      <div className="space-y-6">
        <PollingStationsList />
      </div>
    </div>
  );
}