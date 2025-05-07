import { useState } from "react";
import { RotateCw } from "lucide-react";
import PollingStationsList from "@/components/polling-stations/polling-stations-list";
import { useAuth } from "@/hooks/use-auth";

export default function PollingStationsPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!user) return null;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Polling Stations</h1>
        <button
          className="text-sm flex items-center text-muted-foreground hover:text-foreground transition"
          onClick={() => {
            setIsRefreshing(true);
            window.location.reload();
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