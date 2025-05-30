import axios from 'axios';

/**
 * Calculate the Haversine distance between two points on the Earth
 * @param lat1 Latitude of point 1 (in degrees)
 * @param lon1 Longitude of point 1 (in degrees)
 * @param lat2 Latitude of point 2 (in degrees)
 * @param lon2 Longitude of point 2 (in degrees)
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

/**
 * Format distance in a human-readable way
 * @param distance Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    // Convert to meters if less than 1 km
    return `${Math.round(distance * 1000)}m`;
  }

  // Otherwise return in kilometers with 1 decimal place
  return `${distance.toFixed(1)}km`;
}

/**
 * Convert degrees to radians
 * @param deg Angle in degrees
 * @returns Angle in radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

// Type definitions
export interface RouteWaypoint {
  id?: string | number;
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  arrivalTime?: string;
  departureTime?: string;
  stayDuration?: number; // in minutes
}

export interface RouteSegment {
  startIndex: number;
  endIndex: number;
  distance: number; // in km
  duration: number; // in seconds
  path: Array<{
    lat: number;
    lng: number;
  }>;
  maneuvers?: Array<{
    position: {
      lat: number;
      lng: number;
    };
    instruction: string;
    travelTime: number;
    length: number;
  }>;
}

export interface RouteSummary {
  distance: number; // in km
  duration: number; // in seconds
  waypoints: number;
  optimized: boolean;
}

export interface RouteItinerary {
  summary: RouteSummary;
  waypoints: RouteWaypoint[];
  segments: RouteSegment[];
  points?: RoutePoint[];
}

export interface RoutePoint {
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  arrivalTime?: string;
  departureTime?: string;
  stayDuration?: number;
  visitStatus?: 'pending' | 'visited' | 'active';
}

export interface RoutePlanningOptions {
  optimizeRoute?: boolean;
  transportMode?: 'car' | 'pedestrian' | 'bicycle' | 'publicTransport';
  departureTime?: Date;
  trafficMode?: 'enabled' | 'disabled';
  stayDuration?: number; // default stay at each waypoint in minutes
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  avoidHighways?: boolean;
  visitDuration?: number;
  includeReturn?: boolean;
  considerTraffic?: boolean;
  weatherAware?: boolean;
}


// Utility functions
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours} hr ${minutes} min`;
  }
}

/**
 * Calculate an optimized route between multiple waypoints
 * @param waypoints Array of waypoints with lat/lng coordinates
 * @param options Route planning options
 * @returns Promise with the computed route itinerary
 */
export async function calculateOptimizedRoute(
  waypoints: RouteWaypoint[],
  options: RoutePlanningOptions = {}
): Promise<RouteItinerary> {
  // Need at least 2 waypoints for a route
  if (waypoints.length < 2) {
    throw new Error("At least 2 waypoints are required to calculate a route");
  }

  // Default options
  const defaultOptions: RoutePlanningOptions = {
    optimizeRoute: true,
    transportMode: 'car',
    trafficMode: 'enabled',
    stayDuration: 15, // 15 minutes at each waypoint
    avoidTolls: false,
    avoidFerries: false,
    avoidHighways: false
  };

  // Combine default options with provided options
  const routeOptions = { ...defaultOptions, ...options };

  try {
    // Load HERE Maps API (should already be loaded by the map components)
    if (!window.H) {
      throw new Error("HERE Maps API not loaded");
    }

    const apiKey = import.meta.env.VITE_HERE_API_KEY || process.env.VITE_HERE_API_KEY as string;
    if (!apiKey || apiKey === 'your_here_maps_api_key') {
      throw new Error("HERE Maps API key not found or not configured properly");
    }

    // Create platform instance
    const platform = new window.H.service.Platform({ apikey: apiKey });
    
    // Get routing service
    const router = platform.getRoutingService(null, 8);

    // Prepare waypoints for API call
    const routeWaypoints = waypoints.map(wp => ({
      lat: wp.lat,
      lng: wp.lng
    }));

    // Prepare routing parameters
    const routingParams = {
      routingMode: 'fast',
      transportMode: routeOptions.transportMode,
      origin: `${routeWaypoints[0].lat},${routeWaypoints[0].lng}`,
      destination: `${routeWaypoints[routeWaypoints.length - 1].lat},${routeWaypoints[routeWaypoints.length - 1].lng}`,
      return: 'polyline,summary,actions,instructions',
      departureTime: routeOptions.departureTime ? routeOptions.departureTime.toISOString() : new Date().toISOString(),
      spans: 'names,length,duration,baseDuration',
      traffic: routeOptions.trafficMode
    };

    // Add via points (waypoints between origin and destination)
    if (routeWaypoints.length > 2) {
      const viaPoints = routeWaypoints.slice(1, -1).map(wp => `${wp.lat},${wp.lng}`);
      
      if (routeOptions.optimizeRoute) {
        Object.assign(routingParams, { via: viaPoints.join('|'), routeAttributes: 'waypoints,summary,shapes,legs,notes' });
      } else {
        Object.assign(routingParams, { via: viaPoints.join(';'), routeAttributes: 'waypoints,summary,shapes,legs,notes' });
      }
    }

    // Add avoidance features if specified
    const avoidFeatures = [];
    if (routeOptions.avoidTolls) avoidFeatures.push('tollRoad');
    if (routeOptions.avoidFerries) avoidFeatures.push('ferry');
    if (routeOptions.avoidHighways) avoidFeatures.push('controlledAccessHighway');
    
    if (avoidFeatures.length > 0) {
      Object.assign(routingParams, { avoid: avoidFeatures.join(',') });
    }

    // Call HERE Maps Routing API
    return new Promise<RouteItinerary>((resolve, reject) => {
      router.calculateRoute(
        routingParams,
        (result: any) => {
          try {
            if (!result.routes || result.routes.length === 0) {
              reject(new Error("No route found"));
              return;
            }

            const route = result.routes[0];
            
            // Process waypoints
            let processedWaypoints = waypoints.map((wp, index) => {
              let arrivalTime = null;
              let departureTime = null;
              
              // For origin, only set departure time
              if (index === 0) {
                departureTime = new Date(routingParams.departureTime);
              } 
              // For destination, only set arrival time
              else if (index === waypoints.length - 1) {
                arrivalTime = new Date(routingParams.departureTime);
                if (route.sections) {
                  let totalDuration = 0;
                  for (const section of route.sections) {
                    totalDuration += section.summary.duration;
                  }
                  arrivalTime = new Date(new Date(routingParams.departureTime).getTime() + totalDuration * 1000);
                }
              } 
              // For waypoints in between, set both arrival and departure with a stay duration
              else {
                // This is a simplified approach - in production, you'd use the exact durations from the route sections
                let cumulativeDuration = 0;
                if (route.sections && index > 0) {
                  for (let i = 0; i < index; i++) {
                    cumulativeDuration += route.sections[i].summary.duration;
                  }
                  arrivalTime = new Date(new Date(routingParams.departureTime).getTime() + cumulativeDuration * 1000);
                  departureTime = new Date(arrivalTime.getTime() + (routeOptions.stayDuration || 0) * 60 * 1000);
                }
              }
              
              return {
                ...wp,
                arrivalTime: arrivalTime ? formatTime(arrivalTime) : undefined,
                departureTime: departureTime ? formatTime(departureTime) : undefined,
                stayDuration: index > 0 && index < waypoints.length - 1 ? routeOptions.stayDuration : 0
              };
            });
            
            // Process route segments
            const segments: RouteSegment[] = [];
            
            if (route.sections) {
              route.sections.forEach((section: any, index: number) => {
                // Process polyline path
                const polyline = section.polyline;
                const decodedPath = polyline ? decodeFlexiPolyline(polyline) : [];
                
                // Process maneuvers
                const maneuvers = section.actions ? section.actions.map((action: any) => ({
                  position: {
                    lat: action.position ? action.position.lat : 0,
                    lng: action.position ? action.position.lng : 0
                  },
                  instruction: action.instruction || "",
                  travelTime: action.travelTime || 0,
                  length: action.length || 0
                })) : [];
                
                segments.push({
                  startIndex: index,
                  endIndex: index + 1,
                  distance: section.summary.length / 1000, // convert to km
                  duration: section.summary.duration,
                  path: decodedPath,
                  maneuvers
                });
              });
            }
            
            // Calculate total distance and duration
            let totalDistance = 0;
            let totalDuration = 0;
            
            segments.forEach(segment => {
              totalDistance += segment.distance;
              totalDuration += segment.duration;
              
              // Add stay durations for all waypoints except last one
              if (segment.endIndex < waypoints.length - 1) {
                totalDuration += (routeOptions.stayDuration || 0) * 60; // convert to seconds
              }
            });
            
            // Create route summary
            const summary: RouteSummary = {
              distance: totalDistance,
              duration: totalDuration,
              waypoints: waypoints.length,
              optimized: !!routeOptions.optimizeRoute
            };
            
            // Create final route itinerary
            resolve({
              summary,
              waypoints: processedWaypoints,
              segments
            });
          } catch (error) {
            reject(error);
          }
        },
        (error: any) => {
          reject(new Error(`Routing error: ${error}`));
        }
      );
    });
  } catch (error) {
    console.error("Route calculation error:", error);
    throw error;
  }
}

/**
 * Decode a HERE Maps Flexible Polyline
 * Based on the algorithm from HERE: 
 * https://github.com/heremaps/flexible-polyline
 */
function decodeFlexiPolyline(encodedPolyline: string): Array<{ lat: number; lng: number }> {
  if (!encodedPolyline) return [];
  
  // Use a simplified decoder for this context
  // This is a basic implementation - for production use a full library
  try {
    // For now, if the polyline is in the correct format with lat,lng pairs separated by spaces
    if (encodedPolyline.includes(' ')) {
      const points = encodedPolyline.split(' ');
      return points.map(point => {
        const [lat, lng] = point.split(',').map(coord => parseFloat(coord));
        return { lat, lng };
      });
    }
    
    // Fallback for encoded polylines - simplified approach
    // In a real app, use a proper polyline decoder library
    const simpleParsePolyline = (encoded: string) => {
      const points = [];
      let index = 0, lat = 0, lng = 0;
      
      while (index < encoded.length) {
        let b, shift = 0, result = 0;
        
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        
        shift = 0;
        result = 0;
        
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        points.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
      }
      
      return points;
    };
    
    return simpleParsePolyline(encodedPolyline);
  } catch (e) {
    console.error("Error decoding polyline:", e);
    return [];
  }
}

/**
 * Find the nearest polling stations to a given location
 * @param currentLocation Current location coordinates
 * @param pollingStations Array of polling stations with coordinates
 * @param maxCount Maximum number of stations to return
 * @param maxDistance Maximum distance in kilometers
 * @returns Array of nearest polling stations with distances
 */
/**
 * Get the nearest polling stations to a location
 * @param stations Array of polling stations 
 * @param latitude Current latitude
 * @param longitude Current longitude
 * @param limit Maximum number of stations to return
 * @returns Array of stations sorted by distance
 */
export function getNearestStations(
  stations: any[],
  latitude: number,
  longitude: number,
  limit: number = 5
): any[] {
  if (!stations || stations.length === 0) {
    return [];
  }

  // Calculate distance for each station
  const stationsWithDistance = stations.map(station => {
    // Skip stations without coordinates
    if (!station.latitude || !station.longitude) {
      return { ...station, distance: Infinity };
    }
    
    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      station.latitude,
      station.longitude
    );
    
    return { ...station, distance };
  });
  
  // Sort by distance and limit results
  return stationsWithDistance
    .filter(station => station.distance !== Infinity)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Calculate an optimized visit order for stations (legacy version)
 */
function _legacyCalculateOptimizedVisitOrder(
  startPoint: { lat: number; lng: number },
  stations: Array<{ id: number | string; latitude: number; longitude: number; name?: string }>,
  returnToStart: boolean = true
): Array<{ id: number | string; lat: number; lng: number; name?: string; order: number }> {
  if (!stations || stations.length === 0) {
    return [];
  }
  
  // Create a distance matrix
  const allPoints = [
    { id: 'start', lat: startPoint.lat, lng: startPoint.lng, name: 'Start Location' },
    ...stations.map(s => ({ 
      id: s.id, 
      lat: s.latitude, 
      lng: s.longitude, 
      name: s.name || `Station ${s.id}`
    }))
  ];
  
  // Use a simple nearest neighbor algorithm for now
  const visitOrder: number[] = [];
  const unvisited = new Set(stations.map((_, i) => i + 1)); // +1 because 0 is start
  let currentPoint = 0; // start
  
  while (unvisited.size > 0) {
    let nearestIdx = -1;
    let minDistance = Infinity;
    
    // Find the nearest unvisited point
    for (const idx of unvisited) {
      const distance = calculateHaversineDistance(
        allPoints[currentPoint].lat,
        allPoints[currentPoint].lng,
        allPoints[idx].lat,
        allPoints[idx].lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestIdx = idx;
      }
    }
    
    // Add to visit order and mark as visited
    visitOrder.push(nearestIdx);
    unvisited.delete(nearestIdx);
    currentPoint = nearestIdx;
  }
  
  // Add return to start if requested
  if (returnToStart) {
    visitOrder.push(0);
  }
  
  // Create ordered result
  return visitOrder.map((idx, order) => ({
    id: allPoints[idx].id,
    lat: allPoints[idx].lat,
    lng: allPoints[idx].lng,
    name: allPoints[idx].name,
    order: order + 1
  }));
}

export function findNearestPollingStations(
  currentLocation: { lat: number; lng: number },
  pollingStations: Array<{ id: number | string; lat: number; lng: number; name?: string }>,
  maxCount: number = 5,
  maxDistance: number = 10
): Array<{ station: any; distance: number }> {
  // Calculate distance to each polling station
  const stationsWithDistances = pollingStations.map(station => {
    const distance = calculateHaversineDistance(
      currentLocation.lat,
      currentLocation.lng,
      station.lat,
      station.lng
    );
    
    return {
      station,
      distance
    };
  });
  
  // Sort by distance and filter out stations that are too far
  return stationsWithDistances
    .filter(item => item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxCount);
}

/**
 * Calculate the estimated time to arrival
 * @param originLat Origin latitude
 * @param originLng Origin longitude
 * @param destLat Destination latitude
 * @param destLng Destination longitude
 * @param transportMode Mode of transport
 * @returns Promise with estimated arrival time in seconds
 */
export async function getEstimatedTimeToArrival(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  transportMode: 'car' | 'pedestrian' | 'bicycle' = 'car'
): Promise<number> {
  try {
    // Load HERE Maps API (should already be loaded by the map components)
    if (!window.H) {
      throw new Error("HERE Maps API not loaded");
    }

    const apiKey = import.meta.env.VITE_HERE_API_KEY || process.env.VITE_HERE_API_KEY as string;
    if (!apiKey || apiKey === 'your_here_maps_api_key') {
      throw new Error("HERE Maps API key not found or not configured properly");
    }

    // Create platform instance
    const platform = new window.H.service.Platform({ apikey: apiKey });
    
    // Get routing service
    const router = platform.getRoutingService(null, 8);

    // Prepare routing parameters
    const routingParams = {
      routingMode: 'fast',
      transportMode,
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      return: 'summary',
      spans: 'duration'
    };

    // Call HERE Maps Routing API
    return new Promise<number>((resolve, reject) => {
      router.calculateRoute(
        routingParams,
        (result: any) => {
          try {
            if (!result.routes || result.routes.length === 0) {
              reject(new Error("No route found"));
              return;
            }

            const route = result.routes[0];
            let totalDuration = 0;
            
            if (route.sections) {
              for (const section of route.sections) {
                totalDuration += section.summary.duration;
              }
            }
            
            resolve(totalDuration);
          } catch (error) {
            reject(error);
          }
        },
        (error: any) => {
          reject(new Error(`Routing error: ${error}`));
        }
      );
    });
  } catch (error) {
    console.error("Time estimation error:", error);
    throw error;
  }
}

/**
 * Calculate the optimal order to visit multiple locations
 * @param startLocation Starting location coordinates
 * @param locations Array of locations to visit
 * @param endAtStart Whether to return to the start location
 * @returns Optimized order of locations
 */
export function calculateOptimizedVisitOrder(
  startLocation: { lat: number; lng: number },
  locations: Array<{ id: number | string; lat: number; lng: number; name?: string }>,
  endAtStart: boolean = false
): Array<{ id: number | string; lat: number; lng: number; name?: string; order: number }> {
  // This is a simplified implementation of the Traveling Salesman Problem (TSP)
  // For a more accurate solution, use a dedicated TSP solver or the HERE Waypoint Sequence API
  
  // If there are only a few locations, we can use a simple nearest neighbor approach
  if (locations.length <= 10) {
    return nearestNeighborTSP(startLocation, locations, endAtStart);
  } else {
    // For more locations, still use nearest neighbor but warn about suboptimal results
    console.warn("Large number of locations. Consider using a more sophisticated optimization algorithm.");
    return nearestNeighborTSP(startLocation, locations, endAtStart);
  }
}

/**
 * Nearest Neighbor algorithm for TSP
 * This is a greedy algorithm that always chooses the nearest unvisited location
 */
function nearestNeighborTSP(
  startLocation: { lat: number; lng: number },
  locations: Array<{ id: number | string; lat: number; lng: number; name?: string }>,
  endAtStart: boolean = false
): Array<{ id: number | string; lat: number; lng: number; name?: string; order: number }> {
  // Clone locations to avoid modifying the original array
  const remainingLocations = [...locations];
  const route: Array<typeof locations[0] & { order: number }> = [];
  
  // Start with the starting location
  let currentLocation = startLocation;
  
  // Build the route
  while (remainingLocations.length > 0) {
    // Find the nearest location
    const distancesToCurrent = remainingLocations.map(location => ({
      location,
      distance: calculateHaversineDistance(
        currentLocation.lat,
        currentLocation.lng,
        location.lat,
        location.lng
      )
    }));
    
    // Sort by distance
    distancesToCurrent.sort((a, b) => a.distance - b.distance);
    
    // Add the nearest location to the route
    const nearest = distancesToCurrent[0].location;
    route.push({
      ...nearest,
      order: route.length
    });
    
    // Update current location and remove the chosen location from remaining
    currentLocation = nearest;
    
    // Find and remove the chosen location from the remaining locations
    const index = remainingLocations.findIndex(loc => loc.id === nearest.id);
    if (index !== -1) {
      remainingLocations.splice(index, 1);
    }
  }
  
  // If we need to return to the start, add it at the end
  if (endAtStart && route.length > 0) {
    // The last location should connect back to the start
    // We don't actually add the start location again, just note that the route is a loop
    console.log("Route returns to start location");
  }
  
  return route;
}


/**
 * Get an optimized route between multiple polling stations
 * @param options Route planning options
 * @returns Promise with the route data
 */
export async function getOptimizedRoute(options: {
  startLocationId?: string;
  destinations: string[];
  transportMode: 'car' | 'pedestrian' | 'bicycle' | 'publicTransport';
  optimizeRoute: boolean;
}) {
  try {
    const response = await axios.post('/api/route-planning/optimize', options);
    return response.data;
  } catch (error) {
    console.error('Error getting optimized route:', error);
    throw new Error('Failed to get optimized route');
  }
}

/**
 * Save a route plan to the user's account
 * @param name Name of the route plan
 * @param routeData Route data to save
 * @returns Promise with the saved route data
 */
export async function saveRoutePlan(name: string, routeData: any) {
  try {
    const response = await axios.post('/api/route-planning/save', {
      name,
      routeData
    });
    return response.data;
  } catch (error) {
    console.error('Error saving route plan:', error);
    throw new Error('Failed to save route plan');
  }
}

/**
 * Get saved route plans for the current user
 * @returns Promise with the user's saved routes
 */
export async function getSavedRoutePlans() {
  try {
    const response = await axios.get('/api/route-planning/saved');
    return response.data;
  } catch (error) {
    console.error('Error getting saved route plans:', error);
    throw new Error('Failed to get saved route plans');
  }
}