import { Router } from "express";
import { storage } from "../storage";
import { insertPollingStationSchema } from "@shared/schema";
import { z } from "zod";
import { hasRole } from "../middleware/auth";

const router = Router();

// Get all polling stations
router.get("/", async (req, res) => {
  try {
    const pollingStations = await storage.getAllPollingStations();
    res.json(pollingStations);
  } catch (error) {
    console.error("Error fetching polling stations:", error);
    res.status(500).json({ error: "Failed to fetch polling stations" });
  }
});

// Get a single polling station by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pollingStation = await storage.getPollingStation(id);
    
    if (!pollingStation) {
      return res.status(404).json({ error: "Polling station not found" });
    }
    
    res.json(pollingStation);
  } catch (error) {
    console.error("Error fetching polling station:", error);
    res.status(500).json({ error: "Failed to fetch polling station" });
  }
});

// Create a new polling station (admin only)
router.post("/", hasRole(["admin"]), async (req, res) => {
  try {
    // Validate the request body
    const stationData = insertPollingStationSchema.parse(req.body);
    
    // Create the polling station
    const newStation = await storage.createPollingStation(stationData);
    
    res.status(201).json(newStation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid polling station data", 
        details: error.errors 
      });
    }
    
    console.error("Error creating polling station:", error);
    res.status(500).json({ error: "Failed to create polling station" });
  }
});

// Update a polling station (admin only)
router.patch("/:id", hasRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if polling station exists
    const existingStation = await storage.getPollingStation(id);
    
    if (!existingStation) {
      return res.status(404).json({ error: "Polling station not found" });
    }
    
    // Validate the request body (partial update allowed)
    const updateData = insertPollingStationSchema.partial().parse(req.body);
    
    // Update the polling station
    const updatedStation = await storage.updatePollingStation(id, updateData);
    
    res.json(updatedStation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid polling station data", 
        details: error.errors 
      });
    }
    
    console.error("Error updating polling station:", error);
    res.status(500).json({ error: "Failed to update polling station" });
  }
});

// Delete a polling station (admin only)
router.delete("/:id", hasRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if polling station exists
    const existingStation = await storage.getPollingStation(id);
    
    if (!existingStation) {
      return res.status(404).json({ error: "Polling station not found" });
    }
    
    // Check if there are active assignments
    const assignments = await storage.getAssignmentsByStationId(id);
    
    if (assignments.length > 0) {
      const activeAssignments = assignments.filter(a => 
        a.status === 'active' || a.status === 'scheduled'
      );
      
      if (activeAssignments.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete polling station with active assignments" 
        });
      }
    }
    
    // Delete the polling station
    const success = await storage.deletePollingStation(id);
    
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ error: "Failed to delete polling station" });
    }
  } catch (error) {
    console.error("Error deleting polling station:", error);
    res.status(500).json({ error: "Failed to delete polling station" });
  }
});

// Get nearby polling stations based on location (requires lat/lng)
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in km
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: "Latitude and longitude are required" 
      });
    }
    
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string);
    
    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
      return res.status(400).json({ 
        error: "Invalid location parameters" 
      });
    }
    
    // Get all polling stations and filter by distance
    const allStations = await storage.getAllPollingStations();
    
    // Filter stations within the radius using Haversine formula
    const nearbyStations = allStations.filter(station => {
      if (!station.latitude || !station.longitude) return false;
      
      const distance = calculateDistance(
        latitude, 
        longitude, 
        station.latitude, 
        station.longitude
      );
      
      return distance <= radiusKm;
    });
    
    // Add distance to each station
    const stationsWithDistance = nearbyStations.map(station => ({
      ...station,
      distance: calculateDistance(
        latitude, 
        longitude, 
        station.latitude!, 
        station.longitude!
      )
    }));
    
    // Sort by distance
    stationsWithDistance.sort((a, b) => a.distance - b.distance);
    
    res.json(stationsWithDistance);
  } catch (error) {
    console.error("Error finding nearby polling stations:", error);
    res.status(500).json({ error: "Failed to find nearby polling stations" });
  }
});

// Get stations with available capacity
router.get("/available", async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        error: "Date parameter is required (YYYY-MM-DD)" 
      });
    }
    
    // Parse the date and create a date range for the whole day
    const targetDate = new Date(date as string);
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ 
        error: "Invalid date format. Use YYYY-MM-DD" 
      });
    }
    
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    // Get all stations
    const allStations = await storage.getAllPollingStations();
    
    // Check capacity for each station
    const availableStations = await Promise.all(
      allStations.map(async station => {
        const activeAssignments = await storage.getActiveAssignmentsForStation(
          station.id,
          startDate,
          endDate
        );
        
        const availableCapacity = Math.max(0, (station.capacity || 5) - activeAssignments.length);
        
        return {
          ...station,
          availableCapacity,
          totalCapacity: station.capacity || 5,
          activeAssignments: activeAssignments.length
        };
      })
    );
    
    // Filter to only include stations with available capacity
    const stationsWithCapacity = availableStations.filter(
      station => station.availableCapacity > 0
    );
    
    res.json(stationsWithCapacity);
  } catch (error) {
    console.error("Error finding available polling stations:", error);
    res.status(500).json({ error: "Failed to find available polling stations" });
  }
});

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  return distance;
}

export default router;