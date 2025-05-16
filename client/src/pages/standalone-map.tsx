import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function StandaloneMap() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParish, setSelectedParish] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapObject, setMapObject] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { toast } = useToast();

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

  // Parish boundary data (simplified for visualization)
  const parishBoundaries = [
    {
      id: 1,
      name: "Kingston",
      center: { lat: 17.9784, lng: -76.7832 },
      coordinates: [
        { lat: 17.9850, lng: -76.7950 },
        { lat: 17.9820, lng: -76.7750 },
        { lat: 17.9700, lng: -76.7720 },
        { lat: 17.9670, lng: -76.7930 },
      ]
    },
    {
      id: 2,
      name: "St. Andrew",
      center: { lat: 18.0280, lng: -76.7494 },
      coordinates: [
        { lat: 18.1100, lng: -76.7800 },
        { lat: 18.1050, lng: -76.7100 },
        { lat: 17.9950, lng: -76.7000 },
        { lat: 17.9850, lng: -76.7950 },
        { lat: 17.9900, lng: -76.8200 },
        { lat: 18.0300, lng: -76.8300 },
      ]
    },
    {
      id: 3,
      name: "St. Catherine",
      center: { lat: 18.0426, lng: -77.0257 },
      coordinates: [
        { lat: 18.1800, lng: -77.0800 },
        { lat: 18.2000, lng: -76.9000 },
        { lat: 18.1050, lng: -76.7100 },
        { lat: 18.0300, lng: -76.8300 },
        { lat: 17.9300, lng: -77.0000 },
        { lat: 17.9000, lng: -77.1500 },
        { lat: 17.9500, lng: -77.2200 },
      ]
    }
  ];

  // Sample polling station data for visualization
  const sampleStations = jamaicaParishes.flatMap(parish => {
    const parishBoundary = parishBoundaries.find(p => p.name === parish.name);
    const centerPoint = parishBoundary?.center || { 
      lat: 18.1096 + (Math.random() * 0.5 - 0.25), 
      lng: -77.2975 + (Math.random() * 0.5 - 0.25) 
    };
    
    return Array(Math.min(3, Math.floor(parish.stationCount * 0.1))).fill(0).map((_, index) => ({
      id: `${parish.id}-${index}`,
      name: `${parish.name} Polling Station ${index + 1}`,
      address: `${index + 1} Main Street, ${parish.name}`,
      parish: parish.name,
      stationCode: `${parish.name.substring(0, 3).toUpperCase()}${index + 1}`,
      status: Math.random() > 0.2 ? "active" : "issue-reported",
      latitude: centerPoint.lat + (Math.random() * 0.05 - 0.025),
      longitude: centerPoint.lng + (Math.random() * 0.05 - 0.025),
    }));
  });

  // Initialize the map
  useEffect(() => {
    if (!mapObject && mapRef.current) {
      // Display loading message directly in the map container
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; height: 100%; align-items: center; justify-content: center; flex-direction: column;">
            <div style="font-size: 16px; margin-bottom: 10px;">Loading map...</div>
            <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        `;
      }

      // Simulate loading completion
      setTimeout(() => {
        setIsLoading(false);
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
          
          // Create a fallback visualization if HERE Maps API key is not available or map fails to load
          mapRef.current.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; background-color: #f0f0f0; overflow: hidden;">
              <!-- Jamaica outline -->
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; height: 60%; border: 2px solid #333; border-radius: 20px; background-color: #e0e0e0;">
                <!-- Parish indicators -->
                ${generateParishIndicators()}
                
                <!-- Map title -->
                <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-size: 18px; font-weight: bold;">
                  Jamaica Parish Map Visualization
                </div>
                
                <!-- Selected parish highlight -->
                ${selectedParish ? 
                  `<div style="position: absolute; top: 10px; right: 10px; padding: 5px 10px; background-color: #4169E1; color: white; border-radius: 4px;">
                    Selected: ${selectedParish}
                  </div>` : ''
                }
              </div>
            </div>
          `;
          
          setMapObject({
            type: 'fallback-map',
            updateRegion: (region: string | null) => {
              // This would update the fallback visualization
              console.log('Would update region to:', region);
            }
          });
          setMapLoaded(true);
        }
      }, 1500);
    }
    
    // Helper function to generate parish indicators in fallback map
    function generateParishIndicators() {
      return jamaicaParishes.map(parish => {
        const isSelected = parish.name === selectedParish;
        // Position parishes roughly based on their relative positions in Jamaica
        const positionMap: {[key: string]: {top: string, left: string}} = {
          "Kingston": { top: "60%", left: "70%" },
          "St. Andrew": { top: "55%", left: "65%" },
          "St. Catherine": { top: "50%", left: "60%" },
          "Clarendon": { top: "55%", left: "50%" },
          "Manchester": { top: "50%", left: "40%" },
          "St. Elizabeth": { top: "60%", left: "30%" },
          "Westmoreland": { top: "70%", left: "20%" },
          "Hanover": { top: "30%", left: "20%" },
          "St. James": { top: "25%", left: "30%" },
          "Trelawny": { top: "30%", left: "40%" },
          "St. Ann": { top: "35%", left: "50%" },
          "St. Mary": { top: "30%", left: "60%" },
          "Portland": { top: "25%", left: "70%" },
          "St. Thomas": { top: "40%", left: "75%" }
        };
        
        const position = positionMap[parish.name] || { top: "50%", left: "50%" };
        
        return `
          <div style="position: absolute; top: ${position.top}; left: ${position.left}; transform: translate(-50%, -50%);">
            <div style="width: 20px; height: 20px; border-radius: 50%; background-color: ${isSelected ? '#4169E1' : '#777'}; 
                      display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; 
                      cursor: pointer; border: 2px solid ${isSelected ? 'white' : 'transparent'};
                      box-shadow: ${isSelected ? '0 0 5px rgba(65, 105, 225, 0.8)' : 'none'}" 
                 onclick="window.selectParish('${parish.name}')">
              ${parish.id}
            </div>
            <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); 
                      white-space: nowrap; font-size: 10px; margin-top: 2px; font-weight: ${isSelected ? 'bold' : 'normal'};">
              ${parish.name}
            </div>
          </div>
        `;
      }).join('');
    }
    
    // Add global handler for parish selection in the fallback map
    window.selectParish = (parishName: string) => {
      setSelectedParish(parishName === selectedParish ? null : parishName);
    };
    
    return () => {
      // Clean up global handler
      delete window.selectParish;
    };
  }, [selectedParish]);

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
                
                {jamaicaParishes.map(parish => (
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
              <div className="relative w-full h-full">
                <div ref={mapRef} className="w-full h-full"></div>
                
                {/* Legend */}
                <div className="absolute bottom-4 right-4 bg-white p-2 rounded-md shadow-md z-10">
                  <div className="text-sm font-semibold mb-1">Map Legend</div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full bg-[#22c55e]"></div>
                    <span className="text-xs">Active Station</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#ef4444]"></div>
                    <span className="text-xs">Issue Reported</span>
                  </div>
                </div>
                
                {/* Status badges */}
                <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md z-10">
                  <div className="flex flex-col gap-2">
                    {selectedParish ? (
                      <Badge variant="outline" className="bg-blue-50">
                        <span className="font-bold text-blue-700">Parish:</span>
                        <span className="ml-1">{selectedParish}</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50">
                        <span className="font-bold text-green-700">Viewing:</span>
                        <span className="ml-1">All Parishes</span>
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-purple-50">
                      <span className="font-bold text-purple-700">Stations:</span>
                      <span className="ml-1">{selectedParish ? 
                        sampleStations.filter(s => s.parish === selectedParish).length : 
                        sampleStations.length}</span>
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add this to the global Window interface
declare global {
  interface Window {
    selectParish: (parishName: string) => void;
  }
}