import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface SimpleMapProps {
  selectedParish: string | null;
}

// Simplified parish data for direct use
const jamaicaParishData = [
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

// Simplified polling stations
const sampleStations = [
  { id: '1-1', name: 'Kingston Station 1', parish: 'Kingston', latitude: 17.9784, longitude: -76.7832, status: 'active' },
  { id: '2-1', name: 'St. Andrew Station 1', parish: 'St. Andrew', latitude: 18.0280, longitude: -76.7494, status: 'active' },
  { id: '3-1', name: 'St. Catherine Station 1', parish: 'St. Catherine', latitude: 18.0426, longitude: -77.0257, status: 'issue-reported' }
];

export default function SimpleMap({ selectedParish }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapObject, setMapObject] = useState<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Initialize the map
  useEffect(() => {
    // Check for HERE Maps API key
    const apiKey = import.meta.env.VITE_HERE_API_KEY || process.env.VITE_HERE_API_KEY;
    if (!apiKey || apiKey === 'your_here_maps_api_key') {
      toast({
        title: "Map API Key Missing",
        description: "The HERE Maps API key is missing or not configured properly. Please check your environment variables."
      });
      return;
    }

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

      // Load external scripts for HERE Maps
      const hereMapScript = document.createElement('script');
      hereMapScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js';
      hereMapScript.async = true;
      hereMapScript.onload = () => {
        // Once the core script is loaded, load the other required scripts
        const scripts = [
          'https://js.api.here.com/v3/3.1/mapsjs-service.js',
          'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
          'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js'
        ];
        
        let loadedCount = 0;
        scripts.forEach(scriptSrc => {
          const script = document.createElement('script');
          script.src = scriptSrc;
          script.async = true;
          script.onload = () => {
            loadedCount++;
            if (loadedCount === scripts.length) {
              // All scripts are loaded, now initialize the map
              if (mapRef.current) mapRef.current.innerHTML = '';
              initializeMap();
            }
          };
          document.head.appendChild(script);
        });
        
        // Add the UI CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
        document.head.appendChild(link);
      };
      
      document.head.appendChild(hereMapScript);
    }

    return () => {
      // Clean up map when component unmounts
      if (mapObject) {
        try {
          mapObject.dispose();
        } catch (e) {
          console.error('Error disposing map:', e);
        }
      }
    };
  }, []);

  // Initialize the map
  const initializeMap = () => {
    try {
      // Initialize the platform with API key
      const H = (window as any).H;
      if (!H) {
        console.error("HERE Maps API (H) not loaded.");
        setError("Map service is currently unavailable.");
        toast({ title: "Map Error", description: "HERE Maps API (H) not loaded." });
        return;
      }
      const apiKey = import.meta.env.VITE_HERE_API_KEY || process.env.VITE_HERE_API_KEY;
      const platform = new H.service.Platform({
        apikey: apiKey
      });

      // Get default map types
      const defaultLayers = platform.createDefaultLayers();

      // Create the map instance
      const map = new H.Map(
        mapRef.current,
        defaultLayers.vector.normal.map,
        {
          center: { lat: 18.1096, lng: -77.2975 }, // Jamaica center
          zoom: 8,
          pixelRatio: window.devicePixelRatio || 1
        }
      );

      // Add UI controls and behaviors
      const ui = new H.ui.UI.createDefault(map, defaultLayers);
      const mapEvents = new H.mapevents.MapEvents(map);
      new H.mapevents.Behavior(mapEvents);

      setMapObject(map);
      setMapLoaded(true);
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : "An unknown error occurred while initializing the map.";
      setError(`There was a problem initializing the map: ${errorMessage}`);
      toast({
        title: "Map Error",
        description: `There was a problem initializing the map: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  // Update map objects when data changes
  useEffect(() => {
    if (!mapLoaded || !mapObject) return;

    try {
      // Clear existing objects
      mapObject.removeObjects(mapObject.getObjects());
      
      // Create a group for all objects
      const H = (window as any).H;
      if (!H) return;

      const group = new H.map.Group();
      
      // Add parish boundaries
      jamaicaParishData.forEach(parish => {
        const isSelected = selectedParish === parish.name;
        
        // Only draw selected parish or all parishes if none selected
        if (selectedParish === null || isSelected) {
          try {
            // Create polygon for the parish boundary
            const lineString = new H.geo.LineString();
            
            // Add points to the polygon
            parish.coordinates.forEach(coord => {
              lineString.pushLatLngAlt(coord.lat, coord.lng);
            });
            
            // Close the polygon
            if (parish.coordinates.length > 0) {
              const firstCoord = parish.coordinates[0];
              lineString.pushLatLngAlt(firstCoord.lat, firstCoord.lng);
            }
            
            // Create polygon with styling
            const polygon = new H.map.Polygon(lineString, {
              style: {
                fillColor: isSelected ? 'rgba(65, 105, 225, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                strokeColor: isSelected ? '#4169E1' : '#707070',
                lineWidth: isSelected ? 3 : 1
              }
            });
            
            // Add parish label
            const parishLabel = new H.map.Marker(
              { lat: parish.center.lat, lng: parish.center.lng },
              {
                data: parish.name
              }
            );
            
            group.addObjects([polygon, parishLabel]);
            
            // Auto-zoom to selected parish
            if (isSelected) {
              mapObject.getViewModel().setLookAtData({
                bounds: polygon.getBoundingBox()
              }, true);
            }
          } catch (error) {
            console.error(`Error with parish ${parish.name}:`, error);
          }
        }
      });
      
      // Add polling stations
      const filteredStations = sampleStations.filter(
        station => selectedParish === null || station.parish === selectedParish
      );
      
      filteredStations.forEach(station => {
        const markerColor = station.status === 'active' ? '#22c55e' : '#ef4444';
        
        // Create custom marker
        const marker = new H.map.Marker(
          { lat: station.latitude, lng: station.longitude },
          {
            icon: new H.map.Icon(`
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="${markerColor}" stroke="white" stroke-width="2"/>
                <circle cx="12" cy="12" r="4" fill="white"/>
              </svg>
            `, { size: { w: 24, h: 24 } })
          }
        );
        
        // Add marker data for info bubble
        marker.setData({
          name: station.name,
          parish: station.parish,
          status: station.status
        });
        
        // Add click event
        marker.addEventListener('tap', (evt: any) => {
          const data = evt.target.getData();
          const statusText = data.status === 'active' ? 'Active' : 'Issue Reported';
          
          // Create info bubble
          const bubble = new H.ui.InfoBubble(
            evt.target.getGeometry(),
            {
              content: `
                <div style="padding: 10px; max-width: 200px;">
                  <h3 style="margin: 0 0 5px; font-size: 14px; font-weight: bold;">${data.name}</h3>
                  <p style="margin: 0; font-size: 12px;">Parish: ${data.parish}</p>
                  <p style="margin: 6px 0 0; font-size: 12px;">
                    Status: <span style="color: ${markerColor}; font-weight: bold;">${statusText}</span>
                  </p>
                </div>
              `
            }
          );
          
          // Add the bubble to UI
          mapObject.getUI().addBubble(bubble);
        });
        
        group.addObject(marker);
      });
      
      // Add all objects to the map
      mapObject.addObject(group);
      
      // Set view to include all objects if no parish is selected
      if (!selectedParish) {
        const bounds = group.getBoundingBox();
        if (bounds) {
          mapObject.getViewModel().setLookAtData({
            bounds: bounds
          }, true);
        }
      }
    } catch (error) {
      console.error('Error updating map objects:', error);
    }
  }, [mapLoaded, mapObject, selectedParish]);

  return (
    <div className="w-full h-full relative">
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
  );
}