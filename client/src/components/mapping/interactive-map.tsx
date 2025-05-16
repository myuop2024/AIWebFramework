import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface InteractiveMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  width?: string | number;
  height?: string | number;
  markers?: Array<{
    id: string | number;
    position: { lat: number; lng: number };
    title?: string;
    icon?: string;
  }>;
  onMarkerClick?: (markerId: string | number) => void;
  onMapClick?: (position: { lat: number; lng: number }) => void;
  className?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center = { lat: 18.1096, lng: -77.2975 }, // Default to Jamaica
  zoom = 10,
  width = '100%',
  height = '500px',
  markers = [],
  onMarkerClick,
  onMapClick,
  className = '',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Load map when component mounts
    const initMap = async () => {
      try {
        if (!mapRef.current) return;

        // Check if H (HERE Maps) is available
        if (window.H) {
          const platform = new window.H.service.Platform({
            apikey: import.meta.env.VITE_HERE_API_KEY || 'default-key-for-development'
          });

          const defaultLayers = platform.createDefaultLayers();

          // Initialize the map
          const map = new window.H.Map(
            mapRef.current,
            defaultLayers.vector.normal.map,
            {
              center,
              zoom,
              pixelRatio: window.devicePixelRatio || 1
            }
          );

          // Add map interaction and controls
          const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
          const ui = window.H.ui.UI.createDefault(map, defaultLayers);

          // Add event listener for map clicks
          if (onMapClick) {
            map.addEventListener('tap', (evt: any) => {
              const position = map.screenToGeo(
                evt.currentPointer.viewportX,
                evt.currentPointer.viewportY
              );
              onMapClick({
                lat: position.lat,
                lng: position.lng
              });
            });
          }

          setMapInstance(map);
          setIsLoading(false);
        } else {
          console.error('HERE Maps API not loaded');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setIsLoading(false);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstance) {
        mapInstance.dispose();
      }
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (mapInstance && markers.length > 0) {
      // Clear existing markers
      markersRef.current.forEach(marker => mapInstance.removeObject(marker));
      markersRef.current = [];

      // Create marker group
      const markerGroup = new window.H.map.Group();

      // Add new markers
      markers.forEach(marker => {
        const { id, position, title, icon } = marker;

        let markerIcon;
        if (icon) {
          markerIcon = new window.H.map.Icon(icon, { size: { w: 32, h: 32 } });
        }

        const mapMarker = new window.H.map.Marker(
          position,
          markerIcon ? { icon: markerIcon } : undefined
        );

        // Set data for marker
        mapMarker.setData({ id, title });

        // Add click event
        if (onMarkerClick) {
          mapMarker.addEventListener('tap', () => {
            onMarkerClick(id);
          });
        }

        markerGroup.addObject(mapMarker);
        markersRef.current.push(mapMarker);
      });

      mapInstance.addObject(markerGroup);

      // Ensure all markers are visible
      if (markers.length > 1) {
        mapInstance.getViewModel().setLookAtData({
          bounds: markerGroup.getBoundingBox()
        });
      }
    }
  }, [mapInstance, markers, onMarkerClick]);

  // Update center and zoom when they change
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setCenter(center);
      mapInstance.setZoom(zoom);
    }
  }, [mapInstance, center, zoom]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Spinner />
        </div>
      )}
      <div 
        ref={mapRef} 
        style={{ width, height }} 
        className="w-full h-full"
      />
    </Card>
  );
};

// Export both as named and default export to support both import styles
export { InteractiveMap };
export default InteractiveMap;