import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PollingStation } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ModernCard } from "@/components/ui/modern-card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
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

export default function RoutePlanningPage() {
  const [tab, setTab] = useState("planner");

  // Fetch polling stations
  const { data: pollingStations, isLoading, error } = useQuery<PollingStation[]>({
    queryKey: ["/api/polling-stations"],
  });

  return (
    <PageWrapper
      title="Route Planning"
      subtitle="Plan efficient routes between polling stations for your election observation duties"
      breadcrumbs={
        <Breadcrumb
          items={[
            { label: "Route Planning", current: true }
          ]}
        />
      }
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Options
            </Button>
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
      }
    >

      <ModernCard variant="glass" padding="lg">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="planner">Route Planner</TabsTrigger>
            <TabsTrigger value="saved">Saved Routes</TabsTrigger>
          </TabsList>

          <TabsContent value="planner" className="space-y-6">
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
                <div className="animate-pulse space-y-4 w-full max-w-2xl">
                  <div className="h-10 bg-muted rounded-xl w-1/3"></div>
                  <div className="h-80 bg-muted rounded-2xl"></div>
                  <div className="h-10 bg-muted rounded-xl w-2/3"></div>
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

          <TabsContent value="saved" className="space-y-6">
            <ModernCard variant="default" padding="xl">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No Saved Routes</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  You haven't saved any routes yet. Plan and save routes to access them here.
                </p>
                <Button variant="gradient" onClick={() => setTab("planner")}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Planning Routes
                </Button>
              </div>
            </ModernCard>
          </TabsContent>
        </Tabs>
      </ModernCard>
    </PageWrapper>
  );
}