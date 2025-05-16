import { useEffect, useRef, useState, forwardRef, ForwardedRef } from "react";
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

interface MapPolygon {
  id: number;
  points: Array<{ lat: number; lng: number }>;
  color?: string;
  fillOpacity?: number;
  lineWidth?: number;
  onClick?: (id: number) => void;
}

interface InteractiveMapProps {
  markers?: MapMarker[];
  routes?: MapRoute[];
  polygons?: MapPolygon[];
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

export const InteractiveMap = forwardRef(({
  markers = [],
  routes = [],
  polygons = [],
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
}: InteractiveMapProps, ref: ForwardedRef<any>) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const { H, isLoaded, loadError } = useHereMaps();
  const [map, setMap] = useState<any>(null);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapRoutes, setMapRoutes] = useState<any[]>([]);
  const [mapPolygons, setMapPolygons] = useState<any[]>([]);

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
    
    // Expose map instance to parent component via ref
    if (ref) {
      if (typeof ref === 'function') {
        ref(newMap);
      } else {
        ref.current = newMap;
      }
    }

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

    // Make the map responsive with a named handler function 
    // so we can properly remove it in the cleanup
    const handleResize = () => {
      try {
        newMap.getViewPort().resize();
      } catch (e) {
        console.log('Error in resize handler:', e);
      }
    };
    
    window.addEventListener('resize', handleResize);

    setMap(newMap);

    // Cleanup on unmount
    return () => {
      try {
        window.removeEventListener('resize', handleResize);
        
        if (newMap) {
          try {
            newMap.dispose();
          } catch (e) {
            console.log('Error disposing map:', e);
          }
        }
      } catch (e) {
        console.log('Error in map cleanup:', e);
      }
    };
  }, [H, isLoaded, centerLat, centerLng, zoom, showControls, ref]);

  // Add or update markers when they change
  useEffect(() => {
    if (!map || !H) return;

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
    
    // Safely remove old markers
    if (mapMarkers.length > 0) {
      try {
        // Safely remove each marker one by one
        mapMarkers.forEach(marker => {
          try {
            if (map.getObjects().includes(marker)) {
              map.removeObject(marker);
            }
          } catch (e) {
            console.log('Could not remove old marker:', e);
          }
        });
      } catch (e) {
        console.log('Error cleaning up old markers:', e);
      }
    }
    
    // Add group to map
    map.addObject(markerGroup);
    setMapMarkers(newMapMarkers);
    
    // Adjust map view to fit all markers if there are any
    if (markers.length > 0 && markerGroup.getObjects().length > 0) {
      try {
        map.getViewModel().setLookAtData({
          bounds: markerGroup.getBoundingBox()
        });
      } catch (e) {
        console.log('Error setting map bounds:', e);
      }
    }
    
    return () => {
      try {
        if (map && markerGroup && map.getObjects().includes(markerGroup)) {
          map.removeObject(markerGroup);
        }
      } catch (e) {
        console.log('Error in marker cleanup:', e);
      }
    };
  }, [map, H, markers, onMarkerClick]);

  // Add or update routes when they change
  useEffect(() => {
    if (!map || !H) return;

    // Safely remove previous routes
    if (mapRoutes.length > 0) {
      try {
        mapRoutes.forEach(route => {
          try {
            if (map.getObjects().includes(route)) {
              map.removeObject(route);
            }
          } catch (e) {
            console.log('Could not remove old route:', e);
          }
        });
      } catch (e) {
        console.log('Error cleaning up old routes:', e);
      }
    }
    
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
      try {
        if (map) {
          newMapRoutes.forEach(route => {
            try {
              if (map.getObjects().includes(route)) {
                map.removeObject(route);
              }
            } catch (e) {
              console.log('Error removing route in cleanup:', e);
            }
          });
        }
      } catch (e) {
        console.log('Error in routes cleanup:', e);
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
  
  // Add or update polygons when they change
  useEffect(() => {
    if (!map || !H) return;
    
    // Safely remove previous polygons
    if (mapPolygons.length > 0) {
      try {
        mapPolygons.forEach(polygon => {
          try {
            if (map.getObjects().includes(polygon)) {
              map.removeObject(polygon);
            }
          } catch (e) {
            console.log('Could not remove old polygon:', e);
          }
        });
      } catch (e) {
        console.log('Error cleaning up old polygons:', e);
      }
    }
    
    const newMapPolygons: any[] = [];
    
    // Add new polygons (regions)
    polygons.forEach(polygon => {
      if (polygon.points.length < 3) {
        console.warn('Polygon needs at least 3 points:', polygon);
        return; // Skip invalid polygons
      }
      
      try {
        // Create line string for the polygon boundary
        const lineString = new H.geo.LineString();
        
        // Add points to line string
        polygon.points.forEach(point => {
          lineString.pushPoint({ lat: point.lat, lng: point.lng });
        });
        
        // Create polygon with styling (using type assertion since H.map.Polygon might not be in the type definition)
        const herePolygon = new (H as any).map.Polygon(lineString, {
          style: {
            lineWidth: polygon.lineWidth || 2,
            strokeColor: polygon.color || '#0063FF',
            fillColor: polygon.color || '#0063FF',
            lineJoin: 'round',
            lineCap: 'round',
            opacity: polygon.fillOpacity || 0.3
          },
          data: polygon.id
        });
        
        // Add click event if provided
        if (polygon.onClick) {
          herePolygon.addEventListener('tap', () => {
            polygon.onClick?.(polygon.id);
          });
        }
        
        // Add to map and track
        map.addObject(herePolygon);
        newMapPolygons.push(herePolygon);
      } catch (error) {
        console.error('Error creating polygon:', error);
      }
    });
    
    setMapPolygons(newMapPolygons);
    
    return () => {
      try {
        if (map) {
          newMapPolygons.forEach(polygon => {
            try {
              if (map.getObjects().includes(polygon)) {
                map.removeObject(polygon);
              }
            } catch (e) {
              console.log('Error removing polygon in cleanup:', e);
            }
          });
        }
      } catch (e) {
        console.log('Error in polygons cleanup:', e);
      }
    };
  }, [map, H, polygons]);

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
});

// For backward compatibility
export default InteractiveMap;