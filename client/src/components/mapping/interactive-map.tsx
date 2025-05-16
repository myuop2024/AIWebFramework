import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// Jamaica parish boundary data
import { jamaicaParishBoundaries } from '@/data/jamaica-parishes';

interface PollingStation {
  id: string;
  name: string;
  address: string;
  parish: string;
  stationCode: string;
  status: string;
  latitude: number;
  longitude: number;
}

interface InteractiveMapProps {
  pollingStations: PollingStation[];
  selectedParish: string | null;
}

export default function InteractiveMap({ pollingStations, selectedParish }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapObject, setMapObject] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { toast } = useToast();

  // Initialize the map
  useEffect(() => {
    // Check if HERE Maps API key is available
    if (!import.meta.env.VITE_HERE_API_KEY) {
      toast({
        title: "Map API Key Missing",
        description: "The HERE Maps API key is missing. Please ensure it's properly configured.",
        variant: "destructive"
      });
      return;
    }

    // Initialize the map if it doesn't exist yet
    if (!mapObject && mapRef.current) {
      // Load the HERE Maps script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://js.api.here.com/v3/3.1/mapsjs-core.js`;
      script.async = true;
      script.onload = () => {
        // Load additional map modules
        const scriptsToLoad = [
          'https://js.api.here.com/v3/3.1/mapsjs-service.js',
          'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
          'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js',
        ];
        
        let loadedCount = 0;
        
        scriptsToLoad.forEach(url => {
          const moduleScript = document.createElement('script');
          moduleScript.type = 'text/javascript';
          moduleScript.src = url;
          moduleScript.async = true;
          moduleScript.onload = () => {
            loadedCount++;
            if (loadedCount === scriptsToLoad.length) {
              // All scripts loaded, initialize map
              initializeMap();
            }
          };
          document.head.appendChild(moduleScript);
        });

        // Add CSS for the UI
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
        document.head.appendChild(link);
      };

      document.head.appendChild(script);
    }

    return () => {
      // Clean up the map when component unmounts
      if (mapObject) {
        mapObject.dispose();
      }
    };
  }, []);

  // Initialize the HERE map
  const initializeMap = () => {
    try {
      // Initialize the platform with the API key
      const platform = new (window as any).H.service.Platform({
        apikey: import.meta.env.VITE_HERE_API_KEY
      });

      // Get the default map types from the platform object
      const defaultLayers = platform.createDefaultLayers();

      // Instantiate the map
      const map = new (window as any).H.Map(
        mapRef.current,
        defaultLayers.vector.normal.map,
        {
          zoom: 8,
          center: { lat: 18.1096, lng: -77.2975 }, // Center of Jamaica
          pixelRatio: window.devicePixelRatio || 1
        }
      );

      // Add map UI controls
      const ui = new (window as any).H.ui.UI.createDefault(map, defaultLayers);
      
      // Enable map events (e.g., panning, zooming)
      const mapEvents = new (window as any).H.mapevents.MapEvents(map);
      new (window as any).H.mapevents.Behavior(mapEvents);

      // Set the map object to state
      setMapObject(map);
      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Map Initialization Error",
        description: "There was an error initializing the map. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };

  // Update the map when polling stations or selected parish changes
  useEffect(() => {
    if (!mapLoaded || !mapObject) return;

    // Clear existing objects from the map
    mapObject.removeObjects(mapObject.getObjects());

    // Create a group for all map objects
    const objectGroup = new (window as any).H.map.Group();

    // Draw parish boundaries if data is available
    if (jamaicaParishBoundaries) {
      jamaicaParishBoundaries.forEach(parish => {
        const isSelected = selectedParish === parish.name;
        
        // Only draw the selected parish or all parishes if none selected
        if (selectedParish === null || isSelected) {
          try {
            // Create a polygon for the parish boundary
            const lineString = new (window as any).H.geo.LineString();
            
            // Add points to the polygon
            parish.coordinates.forEach(coord => {
              lineString.pushLatLngAlt(coord.lat, coord.lng);
            });
            
            // Close the polygon
            if (parish.coordinates.length > 0) {
              const firstCoord = parish.coordinates[0];
              lineString.pushLatLngAlt(firstCoord.lat, firstCoord.lng);
            }
            
            // Create the polygon object
            const polygon = new (window as any).H.map.Polygon(lineString, {
              style: {
                fillColor: isSelected ? 'rgba(65, 105, 225, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                strokeColor: isSelected ? '#4169E1' : '#707070',
                lineWidth: isSelected ? 3 : 1
              }
            });
            
            // Add parish name as a label
            const parishCenter = parish.center;
            const parishLabel = new (window as any).H.map.Marker(
              { lat: parishCenter.lat, lng: parishCenter.lng },
              {
                data: parish.name,
                volatility: true
              }
            );
            
            objectGroup.addObjects([polygon, parishLabel]);
            
            // Auto-zoom to the selected parish
            if (isSelected) {
              mapObject.getViewModel().setLookAtData({
                bounds: polygon.getBoundingBox()
              }, true);
            }
          } catch (error) {
            console.error(`Error creating polygon for parish ${parish.name}:`, error);
          }
        }
      });
    }

    // Add polling stations to the map
    pollingStations.forEach(station => {
      // Skip stations without coordinates
      if (!station.latitude || !station.longitude) return;

      // Determine marker color based on status
      const markerColor = station.status === 'active' ? '#22c55e' : '#ef4444';

      // Create a custom marker for each polling station
      const marker = new (window as any).H.map.Marker(
        { lat: station.latitude, lng: station.longitude },
        {
          // Custom SVG icon
          icon: new (window as any).H.map.Icon(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="${markerColor}" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="12" r="4" fill="white"/>
            </svg>
          `, { size: { w: 24, h: 24 } })
        }
      );

      // Add marker data for the info bubble
      marker.setData({
        name: station.name,
        address: station.address,
        stationCode: station.stationCode,
        parish: station.parish,
        status: station.status
      });

      // Add click event to show info
      marker.addEventListener('tap', (evt: any) => {
        const data = evt.target.getData();
        const statusText = data.status === 'active' ? 'Active' : 'Issue Reported';
        
        // Create info bubble content
        const bubbleContent = `
          <div style="padding: 10px; max-width: 200px;">
            <h3 style="margin: 0 0 5px; font-size: 14px; font-weight: bold;">${data.name}</h3>
            <p style="margin: 0 0 3px; font-size: 12px;">Code: ${data.stationCode}</p>
            <p style="margin: 0 0 3px; font-size: 12px;">${data.address}</p>
            <p style="margin: 0; font-size: 12px;">Parish: ${data.parish}</p>
            <p style="margin: 6px 0 0; font-size: 12px;">
              Status: <span style="color: ${markerColor}; font-weight: bold;">${statusText}</span>
            </p>
          </div>
        `;
        
        // Create and open the info bubble
        const bubble = new (window as any).H.ui.InfoBubble(
          evt.target.getGeometry(),
          { content: bubbleContent }
        );
        
        // Get the UI object and add the bubble
        const ui = mapObject.getUI();
        ui.addBubble(bubble);
      });

      // Add the marker to the group
      objectGroup.addObject(marker);
    });

    // Add all objects to the map
    mapObject.addObject(objectGroup);

    // If no parish is selected, set the view to include all polling stations
    if (!selectedParish) {
      // Create a bounds object that includes all polling stations
      const bounds = objectGroup.getBoundingBox();
      if (bounds) {
        mapObject.getViewModel().setLookAtData({
          bounds: bounds
        }, true);
      }
    }
  }, [mapLoaded, mapObject, pollingStations, selectedParish]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      
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
            <span className="ml-1">{pollingStations.length}</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}