import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SimpleMap from "@/components/mapping/simple-map";

export default function DirectMapAccess() {
  const [isLoading, setIsLoading] = useState(true);
  const [parishes, setParishes] = useState<any[]>([]);
  const [pollingStations, setPollingStations] = useState<any[]>([]);
  const [selectedParish, setSelectedParish] = useState<string | null>(null);

  // Simulated parish data for Jamaica
  const jamaicaParishes = [
    { id: 1, name: "Kingston", stationCount: 35 },
    { id: 2, name: "St. Andrew", stationCount: 42 },
    { id: 3, name: "St. Catherine", stationCount: 38 },
    { id: 4, name: "Clarendon", stationCount: 27 },
    { id: 5, name: "Manchester", stationCount: 23 },
    { id: 6, name: "St. Elizabeth", stationCount: 19 },
    { id: 7, name: "Westmoreland", stationCount: 18 },
    { id: 8, name: "Hanover", stationCount: 14 },
    { id: 9, name: "St. James", stationCount: 29 },
    { id: 10, name: "Trelawny", stationCount: 16 },
    { id: 11, name: "St. Ann", stationCount: 22 },
    { id: 12, name: "St. Mary", stationCount: 17 },
    { id: 13, name: "Portland", stationCount: 15 },
    { id: 14, name: "St. Thomas", stationCount: 16 }
  ];

  // Sample polling station data
  const samplePollingStations = jamaicaParishes.flatMap(parish => {
    return Array(Math.floor(parish.stationCount * 0.5)).fill(0).map((_, index) => ({
      id: `${parish.id}-${index}`,
      name: `${parish.name} Polling Station ${index + 1}`,
      address: `${index + 1} Main Street, ${parish.name}`,
      parish: parish.name,
      stationCode: `${parish.name.substring(0, 3).toUpperCase()}${index + 1}`,
      status: Math.random() > 0.2 ? "active" : "issue-reported",
      latitude: 17.9971 + (Math.random() * 1.2 - 0.6), // Center around Jamaica
      longitude: -76.7939 + (Math.random() * 1.2 - 0.6),
    }));
  });

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setParishes(jamaicaParishes);
      setPollingStations(samplePollingStations);
      setIsLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Jamaica Electoral Map - Parish Regions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This interactive map displays all polling stations across Jamaica, organized by parish regions.
            Select a parish to highlight its boundaries and view stations in that area.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </>
            ) : (
              <>
                <Button 
                  variant={selectedParish === null ? "default" : "outline"}
                  onClick={() => setSelectedParish(null)}
                >
                  All Parishes
                </Button>
                
                {parishes.map(parish => (
                  <Button
                    key={parish.id}
                    variant={selectedParish === parish.name ? "default" : "outline"}
                    onClick={() => setSelectedParish(parish.name)}
                    className="relative"
                  >
                    {parish.name}
                    <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                      {parish.stationCount}
                    </span>
                  </Button>
                ))}
              </>
            )}
          </div>
          
          <div className="h-[600px] border rounded-lg overflow-hidden">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <SimpleMap 
                selectedParish={selectedParish}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}