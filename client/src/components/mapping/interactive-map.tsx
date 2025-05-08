import { useEffect, useRef, useState } from "react";
import { useHereMaps } from "@/lib/here-maps";
import { Loader2 } from "lucide-react";

interface MapMarker {
  lat: number;
  lng: number;
  text?: string;
  id?: string | number;
  type?: 'default' | 'current' | 'selected' | 'issue' | 'warning';
}

interface MapRoute {
  points: Array<{ lat: number; lng: number }>;
  color?: string;
  width?: number;
}

interface InteractiveMapProps {
  markers?: MapMarker[];
  routes?: MapRoute[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  height?: string;
  width?: string;
  className?: string;
  onMarkerClick?: (markerId: string | number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showControls?: boolean;
  onBoundsChanged?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
}

export default function InteractiveMap({
  markers = [],
  routes = [],
  centerLat = 18.0179, // Kingston, Jamaica default
  centerLng = -76.8099,
  zoom = 12,
  height = "500px",
  width = "100%",
  className = "",
  onMarkerClick,
  onMapClick,
  showControls = true,
  onBoundsChanged,
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { H, isLoaded, loadError } = useHereMaps();
  const [map, setMap] = useState<any>(null);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapRoutes, setMapRoutes] = useState<any[]>([]);

  // Initialize map when HERE API is loaded
  useEffect(() => {
    if (!isLoaded || !H || !mapRef.current) return;

    // Create platform with API key
    const platform = new H.service.Platform({
      apikey: import.meta.env.VITE_HERE_API_KEY as string,
    });

    // Get map types
    const defaultLayers = platform.createDefaultLayers();

    // Create map instance
    const newMap = new H.Map(
      mapRef.current,
      defaultLayers.vector.normal.map,
      {
        center: { lat: centerLat, lng: centerLng },
        zoom: zoom,
        pixelRatio: window.devicePixelRatio || 1,
      }
    );

    // Add map interaction and controls
    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(newMap));
    
    if (showControls) {
      const ui = H.ui.UI.createDefault(newMap, defaultLayers);
    }

    // Event listeners
    if (onMapClick) {
      newMap.addEventListener('tap', (evt: any) => {
        // Only trigger if not clicking on a marker
        if (evt.target instanceof H.map.Marker) return;
        
        const position = newMap.screenToGeo(
          evt.currentPointer.viewportX,
          evt.currentPointer.viewportY
        );
        
        onMapClick(position.lat, position.lng);
      });
    }

    // Add viewport change event for bounds updates
    if (onBoundsChanged) {
      newMap.addEventListener('mapviewchangeend', () => {
        const bounds = newMap.getViewModel().getLookAtData().bounds;
        onBoundsChanged({
          north: bounds.top,
          south: bounds.bottom,
          east: bounds.right,
          west: bounds.left,
        });
      });
    }

    // Make the map responsive
    window.addEventListener('resize', () => {
      newMap.getViewPort().resize();
    });

    setMap(newMap);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', () => {
        newMap.getViewPort().resize();
      });
      newMap.dispose();
    };
  }, [H, isLoaded, centerLat, centerLng, zoom, showControls]);

  // Add or update markers when they change
  useEffect(() => {
    if (!map || !H) return;

    // Clear previous markers
    mapMarkers.forEach(marker => map.removeObject(marker));
    
    // Create marker group
    const markerGroup = new H.map.Group();
    const newMapMarkers: any[] = [];

    // Add new markers
    markers.forEach(marker => {
      // Create HTML element for marker
      const markerElement = document.createElement('div');
      let markerClass = 'w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold border-2 border-white';
      
      // Apply styling based on marker type
      switch (marker.type) {
        case 'current':
          markerClass = 'w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg';
          break;
        case 'selected':
          markerClass = 'w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg';
          break;
        case 'issue':
          markerClass = 'w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg';
          break;
        case 'warning':
          markerClass = 'w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg';
          break;
        default:
          markerClass = 'w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-md';
      }
      
      markerElement.className = markerClass;
      markerElement.innerHTML = marker.text || '';
      
      // Create marker with DOM element
      const hereMarker = new H.map.DomMarker(
        { lat: marker.lat, lng: marker.lng },
        {
          element: markerElement,
        }
      );
      
      // Store ID for click events
      if (marker.id !== undefined) {
        hereMarker.setData(marker.id);
      }
      
      // Add to marker group
      markerGroup.addObject(hereMarker);
      newMapMarkers.push(hereMarker);
    });
    
    // Add click event to marker group
    if (onMarkerClick) {
      markerGroup.addEventListener('tap', (event: any) => {
        const markerId = event.target.getData();
        if (markerId !== undefined) {
          onMarkerClick(markerId);
        }
      });
    }
    
    // Add group to map
    map.addObject(markerGroup);
    setMapMarkers(newMapMarkers);
    
    // Adjust map view to fit all markers if there are any
    if (markers.length > 0) {
      map.getViewModel().setLookAtData({
        bounds: markerGroup.getBoundingBox()
      });
    }
    
    return () => {
      if (map) {
        map.removeObject(markerGroup);
      }
    };
  }, [map, H, markers, onMarkerClick]);

  // Add or update routes when they change
  useEffect(() => {
    if (!map || !H) return;

    // Clear previous routes
    mapRoutes.forEach(route => map.removeObject(route));
    const newMapRoutes: any[] = [];

    // Add new routes
    routes.forEach(route => {
      // Create line string for the route path
      const lineString = new H.geo.LineString();
      
      // Add points to line string
      route.points.forEach(point => {
        lineString.pushPoint({ lat: point.lat, lng: point.lng });
      });
      
      // Create polyline with styling
      const polyline = new H.map.Polyline(lineString, {
        style: {
          lineWidth: route.width || 4,
          strokeColor: route.color || '#0063FF',
          lineTailCap: 'arrow-tail',
          lineHeadCap: 'arrow-head',
        },
      });
      
      // Add to map
      map.addObject(polyline);
      newMapRoutes.push(polyline);
    });
    
    setMapRoutes(newMapRoutes);
    
    return () => {
      if (map) {
        newMapRoutes.forEach(route => map.removeObject(route));
      }
    };
  }, [map, H, routes]);

  // Update center when centerLat or centerLng changes
  useEffect(() => {
    if (map) {
      map.setCenter({ lat: centerLat, lng: centerLng });
    }
  }, [map, centerLat, centerLng]);

  // Update zoom when it changes
  useEffect(() => {
    if (map) {
      map.setZoom(zoom);
    }
  }, [map, zoom]);

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <div className="text-center p-4">
          <p className="text-red-500 mb-2">Error loading map</p>
          <p className="text-sm text-gray-600">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    />
  );
}