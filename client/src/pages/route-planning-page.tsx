import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PollingStation } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MapPin, Navigation, MoreHorizontal, Download, Share2, Printer, Settings } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import RoutePlanner from "@/components/route-planning/route-planner";
import MainLayout from "@/components/layout/main-layout";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function RoutePlanningPage() {
  const [tab, setTab] = useState("planner");

  // Fetch polling stations
  const { data: pollingStations, isLoading, error } = useQuery<PollingStation[]>({
    queryKey: ["/api/polling-stations"],
  });

  return (
    <AuthGuard>
      <MainLayout>
        <div className="container py-6 space-y-6 max-w-6xl">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Navigation className="h-6 w-6" />
                <h1 className="text-2xl font-bold tracking-tight">Route Planning</h1>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-9 w-9 p-2 rounded-md hover:bg-muted flex items-center justify-center">
                  <MoreHorizontal className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Route Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Export Routes as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Route
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Route
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Route Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-muted-foreground">
              Plan efficient routes between polling stations for your election observation duties
            </p>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="planner">Route Planner</TabsTrigger>
              <TabsTrigger value="saved">Saved Routes</TabsTrigger>
            </TabsList>

            <TabsContent value="planner" className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load polling stations. Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              ) : isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-pulse space-y-2 w-full max-w-2xl">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-64 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ) : pollingStations && pollingStations.length > 0 ? (
                <RoutePlanner pollingStations={pollingStations} />
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No polling stations found</AlertTitle>
                  <AlertDescription>
                    You need polling stations with coordinates to plan routes. Please add polling stations first.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="saved" className="space-y-4">
              <div className="rounded-md border p-6 text-center">
                <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Saved Routes</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't saved any routes yet. Plan and save routes to access them here.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}