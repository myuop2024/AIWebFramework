/**
 * Route Planning Service
 * Provides functionalities for optimizing routes between polling stations
 * using HERE Maps routing capabilities
 */
import { hereMapsService, HereRoute } from "@/lib/here-maps";
import { PollingStation } from "@shared/schema";

export interface RoutePoint {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  visitOrder?: number; // Optional order in the route sequence
  estimatedArrival?: Date; // Estimated arrival time
  estimatedDeparture?: Date; // Estimated departure time
  visitDuration?: number; // Duration of visit in minutes
}

export interface RouteSegment {
  fromId: number;
  toId: number;
  distance: number; // in meters
  duration: number; // in seconds
  polyline: string; // encoded polyline for rendering the route on map
}

export interface RouteItinerary {
  totalDistance: number; // in meters
  totalDuration: number; // in seconds
  points: RoutePoint[]; // Ordered list of points
  segments: RouteSegment[]; // Individual segments between points
  routePolyline: string; // Full route polyline
  departureTime: Date; // Planned departure time
  returnTime: Date; // Estimated return time
}

export interface RoutePlanningOptions {
  departureTime?: Date; // When the observer will start their route
  visitDuration?: number; // Default duration at each polling station in minutes
  transportMode?: 'car' | 'pedestrian' | 'bicycle';
  includeReturn?: boolean; // Whether to include return to starting point
  considerTraffic?: boolean; // Whether to consider real-time traffic conditions
  avoidHighways?: boolean; // Whether to avoid highways in routing
  avoidTolls?: boolean; // Whether to avoid toll roads in routing
  weatherAware?: boolean; // Whether to consider weather conditions
  customVisitDurations?: Record<number, number>; // Custom durations for specific stations
  customVisitOrder?: number[]; // Custom order of polling stations
  startPoint?: { lat: number; lng: number; name: string }; // Custom starting point
  endPoint?: { lat: number; lng: number; name: string }; // Custom ending point
}

/**
 * Calculate an optimized route between multiple polling stations
 */
export async function calculateOptimizedRoute(
  stations: PollingStation[],
  options: RoutePlanningOptions = {}
): Promise<RouteItinerary | null> {
  try {
    if (!stations.length) {
      throw new Error("No polling stations provided for route planning");
    }

    // Default options
    const departureTime = options.departureTime || new Date();
    const visitDuration = options.visitDuration || 30; // 30 minutes default
    const transportMode = options.transportMode || 'car';
    const includeReturn = options.includeReturn !== undefined ? options.includeReturn : true;
    const considerTraffic = options.considerTraffic !== undefined ? options.considerTraffic : true;
    const avoidHighways = options.avoidHighways || false;
    const avoidTolls = options.avoidTolls || false;
    const weatherAware = options.weatherAware !== undefined ? options.weatherAware : true;
    
    // Convert stations to route points
    const points: RoutePoint[] = stations
      .filter(station => station.latitude && station.longitude) // Ensure coordinates are available
      .map(station => ({
        id: station.id,
        name: station.name,
        address: station.address,
        lat: station.latitude!,
        lng: station.longitude!,
        visitDuration: options.customVisitDurations?.[station.id] || visitDuration
      }));
    
    if (points.length === 0) {
      throw new Error("No valid polling stations with coordinates for route planning");
    }

    // Add custom start/end points if provided
    let routePoints = [...points];
    
    // Handle custom visit order if specified
    if (options.customVisitOrder && options.customVisitOrder.length) {
      // Create a map for O(1) lookup
      const pointMap = new Map(routePoints.map(point => [point.id, point]));
      // Reorder points according to custom order
      routePoints = options.customVisitOrder
        .map(id => pointMap.get(id))
        .filter(Boolean) as RoutePoint[];
    } else {
      // For now, use the order provided
      // In a future version, implement TSP (Traveling Salesman Problem) solver
      routePoints = points;
    }

    // Calculate routes between each pair of consecutive points
    const segments: RouteSegment[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    
    // Start time is the departure time
    let currentTime = new Date(departureTime);
    
    // Assign visit order and estimate arrival/departure times
    for (let i = 0; i < routePoints.length; i++) {
      const currentPoint = routePoints[i];
      currentPoint.visitOrder = i + 1;
      
      // If not the last point, calculate route to next point
      if (i < routePoints.length - 1) {
        const nextPoint = routePoints[i + 1];
        
        // Calculate route between current and next point
        const route = await hereMapsService.calculateRoute(
          currentPoint.lat,
          currentPoint.lng,
          nextPoint.lat,
          nextPoint.lng,
          transportMode,
          {
            departureTime: currentPoint.estimatedDeparture || currentTime,
            considerTraffic,
            avoidHighways,
            avoidTolls,
            weatherAware
          }
        );
        
        if (!route || !route.routes || !route.routes.length || !route.routes[0].sections.length) {
          console.error(`Failed to calculate route between ${currentPoint.name} and ${nextPoint.name}`);
          continue;
        }
        
        const routeSection = route.routes[0].sections[0];
        const segmentDistance = routeSection.summary.length;
        const segmentDuration = routeSection.summary.duration;
        
        segments.push({
          fromId: currentPoint.id,
          toId: nextPoint.id,
          distance: segmentDistance,
          duration: segmentDuration,
          polyline: routeSection.polyline
        });
        
        totalDistance += segmentDistance;
        totalDuration += segmentDuration;
        
        // Set estimated arrival time at the next point
        currentPoint.estimatedArrival = currentTime;
        
        // Add visit duration to current time
        const visitTime = currentPoint.visitDuration || visitDuration;
        currentPoint.estimatedDeparture = new Date(currentTime.getTime() + visitTime * 60 * 1000);
        
        // Update current time to include travel to next point
        currentTime = new Date(currentPoint.estimatedDeparture.getTime() + segmentDuration * 1000);
        
        // Set estimated arrival time for the next point
        nextPoint.estimatedArrival = currentTime;
      } else {
        // Last point
        currentPoint.estimatedArrival = currentTime;
        const visitTime = currentPoint.visitDuration || visitDuration;
        currentPoint.estimatedDeparture = new Date(currentTime.getTime() + visitTime * 60 * 1000);
      }
    }
    
    // If include return is true and we have more than one point, add return route
    if (includeReturn && routePoints.length > 1) {
      const firstPoint = routePoints[0];
      const lastPoint = routePoints[routePoints.length - 1];
      
      // Calculate return route
      const returnRoute = await hereMapsService.calculateRoute(
        lastPoint.lat,
        lastPoint.lng,
        firstPoint.lat,
        firstPoint.lng,
        transportMode,
        {
          departureTime: lastPoint.estimatedDeparture || currentTime,
          considerTraffic,
          avoidHighways,
          avoidTolls,
          weatherAware
        }
      );
      
      if (returnRoute && returnRoute.routes && returnRoute.routes.length && returnRoute.routes[0].sections.length) {
        const routeSection = returnRoute.routes[0].sections[0];
        const segmentDistance = routeSection.summary.length;
        const segmentDuration = routeSection.summary.duration;
        
        segments.push({
          fromId: lastPoint.id,
          toId: firstPoint.id,
          distance: segmentDistance,
          duration: segmentDuration,
          polyline: routeSection.polyline
        });
        
        totalDistance += segmentDistance;
        totalDuration += segmentDuration;
      }
    }
    
    // Combine all polylines for a full route visualization
    const routePolyline = segments.map(segment => segment.polyline).join(';');
    
    // Calculate return time
    const returnTime = routePoints.length > 0 ? 
      routePoints[routePoints.length - 1].estimatedDeparture || new Date() : 
      new Date();
    
    return {
      totalDistance,
      totalDuration,
      points: routePoints,
      segments,
      routePolyline,
      departureTime,
      returnTime
    };
    
  } catch (error) {
    console.error("Error calculating optimized route:", error);
    return null;
  }
}

/**
 * Find the nearest polling stations to a given location
 */
export function findNearestPollingStations(
  stations: PollingStation[], 
  currentLat: number, 
  currentLng: number,
  limit: number = 5,
  maxDistanceKm?: number
): { station: PollingStation; distance: number }[] {
  if (!stations.length) return [];
  
  // Filter out stations without coordinates
  const validStations = stations.filter(
    station => station.latitude && station.longitude
  );
  
  if (!validStations.length) return [];
  
  // Calculate distances using Haversine formula
  const stationsWithDistance = validStations.map(station => {
    const distance = calculateHaversineDistance(
      currentLat, 
      currentLng, 
      station.latitude!, 
      station.longitude!
    );
    
    return {
      station,
      distance
    };
  });
  
  // Filter by max distance if provided (convert km to meters)
  const filteredStations = maxDistanceKm
    ? stationsWithDistance.filter(item => item.distance <= maxDistanceKm * 1000)
    : stationsWithDistance;
  
  // Sort by distance and return the nearest ones
  return filteredStations
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Get only the stations without the distance information
 */
export function getNearestStations(
  stations: PollingStation[], 
  currentLat: number, 
  currentLng: number,
  limit: number = 5,
  maxDistanceKm?: number
): PollingStation[] {
  return findNearestPollingStations(stations, currentLat, currentLng, limit, maxDistanceKm)
    .map(item => item.station);
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateHaversineDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2 - lat1) * Math.PI/180;
  const Δλ = (lng2 - lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
}

/**
 * Get estimated time to arrival at a polling station
 * Returns ETA in minutes
 */
export function getEstimatedTimeToArrival(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  travelMode: 'car' | 'pedestrian' | 'bicycle' = 'car'
): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      // Average speeds in meters per second
      const averageSpeeds = {
        car: 13.9, // ~50km/h
        pedestrian: 1.4, // ~5km/h
        bicycle: 4.2  // ~15km/h 
      };
      
      // First, calculate straight-line distance
      const directDistance = calculateHaversineDistance(
        currentLat, 
        currentLng,
        targetLat,
        targetLng
      );
      
      // For very short distances, just use the direct calculation
      if (directDistance < 500) {
        const estimatedTimeSeconds = directDistance / averageSpeeds[travelMode];
        resolve(Math.ceil(estimatedTimeSeconds / 60));
        return;
      }
      
      // For longer distances, try to get a route from the API
      const route = await hereMapsService.calculateRoute(
        currentLat,
        currentLng,
        targetLat,
        targetLng,
        travelMode,
        { considerTraffic: true }
      );
      
      if (route && route.routes && route.routes.length > 0 && route.routes[0].sections.length > 0) {
        // Use the actual route duration from the API
        const durationSeconds = route.routes[0].sections[0].summary.duration;
        resolve(Math.ceil(durationSeconds / 60));
      } else {
        // Fallback to direct distance with a detour factor
        const detourFactor = travelMode === 'car' ? 1.3 : 1.2;
        const estimatedDistance = directDistance * detourFactor;
        const estimatedTimeSeconds = estimatedDistance / averageSpeeds[travelMode];
        resolve(Math.ceil(estimatedTimeSeconds / 60));
      }
    } catch (error) {
      console.error('Error calculating ETA:', error);
      // Fallback to a very simple estimate
      const directDistance = calculateHaversineDistance(
        currentLat, 
        currentLng,
        targetLat,
        targetLng
      );
      const averageSpeed = travelMode === 'car' ? 13.9 : travelMode === 'bicycle' ? 4.2 : 1.4;
      const estimatedTimeSeconds = directDistance / averageSpeed;
      resolve(Math.ceil(estimatedTimeSeconds / 60));
    }
  });
}

/**
 * Calculate optimized order for visiting polling stations based on proximity
 * to starting location and each other
 */
export async function calculateOptimizedVisitOrder(
  stations: PollingStation[],
  startLat: number,
  startLng: number,
  transportMode: 'car' | 'pedestrian' | 'bicycle' = 'car'
): Promise<number[]> {
  if (!stations.length) return [];
  if (stations.length === 1) return [stations[0].id];
  
  // Filter stations without coordinates
  const validStations = stations.filter(
    station => station.latitude && station.longitude
  );
  
  if (!validStations.length) return [];
  
  try {
    // Simple greedy algorithm - start at current location and always go to the closest next station
    const remaining = [...validStations];
    const result: number[] = [];
    
    let currentLat = startLat;
    let currentLng = startLng;
    
    while (remaining.length > 0) {
      // Find nearest station to current position
      const stationsWithDistance = remaining.map(station => ({
        station,
        distance: calculateHaversineDistance(
          currentLat,
          currentLng,
          station.latitude!, 
          station.longitude!
        )
      }));
      
      const nearest = stationsWithDistance.sort((a, b) => a.distance - b.distance)[0];
      
      // Add to result and remove from remaining
      result.push(nearest.station.id);
      remaining.splice(remaining.findIndex(s => s.id === nearest.station.id), 1);
      
      // Update current position
      currentLat = nearest.station.latitude!;
      currentLng = nearest.station.longitude!;
    }
    
    return result;
  } catch (error) {
    console.error('Error calculating optimized visit order:', error);
    // Fallback to original order
    return validStations.map(station => station.id);
  }
}