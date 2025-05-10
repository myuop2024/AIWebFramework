import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Navigation, Eye, MapPin, ExternalLink } from "lucide-react";

interface PollingStation {
  id: number;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

interface PollingStationMapProps {
  isOpen: boolean;
  onClose: () => void;
  station: PollingStation | null;
}

export function PollingStationMap({ isOpen, onClose, station }: PollingStationMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we have valid coordinates
  const hasCoordinates = station?.latitude && station?.longitude;

  // Format address for display and map links
  const formatAddress = () => {
    if (!station) return "";
    
    const parts = [];
    if (station.address) parts.push(station.address);
    if (station.city) parts.push(station.city);
    if (station.region) parts.push(station.region);
    
    return parts.join(", ");
  };

  // Generate Google Maps URL
  const getGoogleMapsUrl = () => {
    if (!station?.latitude || !station?.longitude) return null;
    return `https://www.google.com/maps?q=${station.latitude},${station.longitude}`;
  };

  // Generate directions URL
  const getDirectionsUrl = () => {
    if (!station?.latitude || !station?.longitude) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
  };

  // Format coordinates for display
  const formatCoordinates = () => {
    if (!station?.latitude || !station?.longitude) return "No coordinates available";
    return `${station.latitude.toFixed(6)}, ${station.longitude.toFixed(6)}`;
  };

  useEffect(() => {
    if (isOpen && station) {
      // Reset states
      setMapLoaded(false);
      setError(null);

      if (!hasCoordinates) {
        setError("This polling station doesn't have location coordinates");
        return;
      }

      // Simulate map loading
      const timer = setTimeout(() => {
        setMapLoaded(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, station, hasCoordinates]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Polling Station Location</DialogTitle>
          <DialogDescription>
            {station?.name} {station?.code ? `(${station.code})` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Address Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium">{formatAddress() || "No address available"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Navigation className="h-4 w-4" />
                  <span>{formatCoordinates()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map or Error */}
          <div className="h-[300px] w-full rounded-md overflow-hidden border">
            {error ? (
              <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100">
                <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                <p className="text-gray-700">{error}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add coordinates to view this station on a map
                </p>
              </div>
            ) : !hasCoordinates ? (
              <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100">
                <MapPin className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-700">No map coordinates available</p>
              </div>
            ) : !mapLoaded ? (
              <div className="h-full w-full flex items-center justify-center bg-gray-100">
                <div className="animate-pulse text-center">
                  <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Loading map...</p>
                </div>
              </div>
            ) : (
              <div className="relative h-full w-full bg-gray-200 flex items-center justify-center">
                {/* This would be your actual map component in production */}
                <iframe 
                  src={`https://maps.google.com/maps?q=${station?.latitude},${station?.longitude}&z=15&output=embed`} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  loading="lazy"
                  title="Polling Station Map"
                />
                <div className="absolute top-2 right-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white shadow-sm"
                    onClick={() => window.open(getGoogleMapsUrl() || '', '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Larger Map
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Map Actions */}
          {hasCoordinates && (
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => window.open(getGoogleMapsUrl() || '', '_blank')}
                disabled={!hasCoordinates}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Maps
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(getDirectionsUrl() || '', '_blank')}
                disabled={!hasCoordinates}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}