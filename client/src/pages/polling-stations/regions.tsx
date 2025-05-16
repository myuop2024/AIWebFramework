import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, Info } from "lucide-react";
import RegionMap from "@/components/mapping/region-map";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function PollingStationRegionsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("map");

  // Fetch polling station data
  const { data: stations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/polling-stations'],
  });

  // Handle station click
  const handleStationClick = (stationId: number) => {
    const station = stations.find((s: any) => s.id === stationId);
    if (station) {
      toast({
        title: station.name || "Polling Station",
        description: station.address ? 
          `${station.address}, ${station.city || ''}, ${station.state || ''}` :
          "Click for more details",
      });
    }
  };

  // Handle region click
  const handleRegionClick = (regionId: number) => {
    // In a real implementation, this would filter stations by region
    toast({
      title: "Region Selected",
      description: `You selected region ID: ${regionId}`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading region data...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">Polling Station Regions</h1>
          <p className="text-muted-foreground">
            Interactive map showing polling stations organized by parish across Jamaica
          </p>
        </div>

        <Tabs defaultValue="map" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-[300px]">
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <RegionMap 
              userId={user?.id} 
              height="650px"
              onStationClick={handleStationClick}
              onRegionClick={handleRegionClick}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Regions List</CardTitle>
                <CardDescription>
                  View all parishes and their associated polling stations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 
                    In a real implementation, this would display a list of parishes
                    with their associated polling stations 
                  */}
                  {['Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester',
                    'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James', 'Trelawny',
                    'St. Ann', 'St. Mary', 'Portland', 'St. Thomas'].map((parish) => (
                    <Card key={parish} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{parish}</CardTitle>
                        <CardDescription className="text-sm">
                          {Math.floor(Math.random() * 20) + 1} polling stations
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>View stations in this parish</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}