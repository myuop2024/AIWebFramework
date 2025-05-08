import { calculateDistance } from "@/lib/here-maps";

// Define interface for route points
export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  stationId?: number;
  isWaypoint?: boolean;
}

// Define interface for route response
export interface RouteResponse {
  polyline: string; // Encoded polyline for the route
  distance: number; // Distance in meters
  duration: number; // Duration in seconds
  waypoints: RoutePoint[]; // Array of waypoints (ordered)
  boundingBox: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
}

// Main service for route planning
export class RoutePlanningService {
  // Calculate a route between multiple points
  static async calculateRoute(
    points: RoutePoint[],
    options: {
      transportMode?: "car" | "pedestrian" | "bicycle";
      trafficMode?: "enabled" | "disabled";
      avoidTolls?: boolean;
      avoidHighways?: boolean;
    } = {}
  ): Promise<RouteResponse | null> {
    // We need at least 2 points to create a route
    if (!points || points.length < 2) {
      throw new Error("At least 2 points are required to calculate a route");
    }

    if (!window.H) {
      throw new Error("HERE Maps API is not loaded");
    }

    const apiKey = import.meta.env.VITE_HERE_API_KEY;
    if (!apiKey) {
      throw new Error("HERE Maps API key is missing");
    }

    try {
      // Create a platform instance
      const platform = new window.H.service.Platform({
        apikey: apiKey,
      });

      // Get routing service
      const router = platform.getRoutingService(null, 8);

      // Set transport mode
      const transportMode = options.transportMode || "car";
      
      // Prepare waypoints
      const waypoints = points.map(point => {
        return `${point.lat},${point.lng}`;
      }).join(';');

      // Create routing parameters
      const routingParams = {
        routingMode: 'fast',
        transportMode: transportMode,
        return: 'polyline,summary,actions,instructions,boundingBox',
        spans: 'speedLimit,duration',
        origin: `${points[0].lat},${points[0].lng}`,
        destination: `${points[points.length - 1].lat},${points[points.length - 1].lng}`,
        via: points.length > 2 ? waypoints.split(';').slice(1, -1).join(';') : undefined,
        departureTime: 'any',
        alternatives: 0,
        avoidFeatures: [
          ...(options.avoidTolls ? ['tollRoad'] : []),
          ...(options.avoidHighways ? ['controlledAccessHighway'] : [])
        ].join(',') || undefined,
        trafficMode: options.trafficMode || 'disabled'
      };

      // This creates a promise to execute the route calculation
      const routeResponsePromise = new Promise<RouteResponse>((resolve, reject) => {
        router.calculateRoute(
          routingParams,
          (success: any) => {
            try {
              if (!success.routes || success.routes.length === 0) {
                reject(new Error("No routes found"));
                return;
              }

              const route = success.routes[0];
              const boundingBox = route.sections[0].boundingBox;
              
              // Process route response
              const response: RouteResponse = {
                polyline: route.sections[0].polyline,
                distance: route.sections[0].summary.length,
                duration: route.sections[0].summary.duration,
                waypoints: points,
                boundingBox: {
                  minLat: boundingBox.minLat,
                  minLng: boundingBox.minLng,
                  maxLat: boundingBox.maxLat,
                  maxLng: boundingBox.maxLng
                }
              };
              
              resolve(response);
            } catch (error: any) {
              reject(new Error(`Error processing route response: ${error?.message || 'Unknown error'}`));
            }
          },
          (error: any) => {
            reject(new Error(`Routing error: ${error?.message || 'Unknown error'}`));
          }
        );
      });

      return await routeResponsePromise;
    } catch (error: any) {
      console.error("Error calculating route:", error);
      return null;
    }
  }

  // Optimize the order of waypoints (TSP)
  static async optimizeWaypoints(
    waypoints: RoutePoint[],
    startPointIndex: number = 0
  ): Promise<RoutePoint[]> {
    // We need at least 3 points for optimization to make sense
    if (waypoints.length <= 2) return waypoints;
    
    // Simple greedy algorithm for Traveling Salesman Problem
    const result: RoutePoint[] = [];
    const startPoint = waypoints[startPointIndex];
    const remainingPoints = [...waypoints];
    
    // Remove the start point and add it as the first point in the result
    remainingPoints.splice(startPointIndex, 1);
    result.push(startPoint);
    
    // Always use the closest point as the next one
    let currentPoint = startPoint;
    while (remainingPoints.length > 0) {
      // Find closest point
      let closestDistance = Infinity;
      let closestPointIndex = -1;
      
      for (let i = 0; i < remainingPoints.length; i++) {
        const distance = calculateDistance(
          currentPoint.lat,
          currentPoint.lng,
          remainingPoints[i].lat,
          remainingPoints[i].lng
        );
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPointIndex = i;
        }
      }
      
      // Add closest point to result and remove from remaining
      currentPoint = remainingPoints[closestPointIndex];
      result.push(currentPoint);
      remainingPoints.splice(closestPointIndex, 1);
    }
    
    return result;
  }

  // Format duration into human readable format
  static formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} sec`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} min`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hr ${minutes} min`;
  }

  // Format distance into human readable format
  static formatDistance(meters: number): string {
    if (meters < 1000) return `${meters.toFixed(0)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }
}