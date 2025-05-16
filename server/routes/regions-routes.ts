import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth";
import { storage } from "../storage";

const router = Router();

/**
 * Get all region/parish data
 * @route GET /api/regions
 */
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    // For demonstration, we're returning parishes as regions
    // In a full implementation, this would fetch from the database
    const regions = [
      { id: 1, name: 'Kingston', stationCount: 12 },
      { id: 2, name: 'St. Andrew', stationCount: 18 },
      { id: 3, name: 'St. Catherine', stationCount: 15 },
      { id: 4, name: 'Clarendon', stationCount: 10 },
      { id: 5, name: 'Manchester', stationCount: 8 },
      { id: 6, name: 'St. Elizabeth', stationCount: 7 },
      { id: 7, name: 'Westmoreland', stationCount: 9 },
      { id: 8, name: 'Hanover', stationCount: 5 },
      { id: 9, name: 'St. James', stationCount: 11 },
      { id: 10, name: 'Trelawny', stationCount: 6 },
      { id: 11, name: 'St. Ann', stationCount: 9 },
      { id: 12, name: 'St. Mary', stationCount: 7 },
      { id: 13, name: 'Portland', stationCount: 5 },
      { id: 14, name: 'St. Thomas', stationCount: 6 }
    ];
    
    res.json(regions);
  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).json({ error: "Failed to fetch regions" });
  }
});

/**
 * Get a specific region by ID
 * @route GET /api/regions/:id
 */
router.get("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const regionId = parseInt(req.params.id);
    if (isNaN(regionId)) {
      return res.status(400).json({ error: "Invalid region ID" });
    }
    
    // In a real implementation, this would fetch from the database
    const regions = [
      { id: 1, name: 'Kingston', stationCount: 12 },
      { id: 2, name: 'St. Andrew', stationCount: 18 },
      { id: 3, name: 'St. Catherine', stationCount: 15 },
      { id: 4, name: 'Clarendon', stationCount: 10 },
      { id: 5, name: 'Manchester', stationCount: 8 },
      { id: 6, name: 'St. Elizabeth', stationCount: 7 },
      { id: 7, name: 'Westmoreland', stationCount: 9 },
      { id: 8, name: 'Hanover', stationCount: 5 },
      { id: 9, name: 'St. James', stationCount: 11 },
      { id: 10, name: 'Trelawny', stationCount: 6 },
      { id: 11, name: 'St. Ann', stationCount: 9 },
      { id: 12, name: 'St. Mary', stationCount: 7 },
      { id: 13, name: 'Portland', stationCount: 5 },
      { id: 14, name: 'St. Thomas', stationCount: 6 }
    ];
    
    const region = regions.find(r => r.id === regionId);
    
    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }
    
    res.json(region);
  } catch (error) {
    console.error(`Error fetching region ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch region" });
  }
});

/**
 * Get polling stations in a specific region
 * @route GET /api/regions/:id/stations
 */
router.get("/:id/stations", ensureAuthenticated, async (req, res) => {
  try {
    const regionId = parseInt(req.params.id);
    if (isNaN(regionId)) {
      return res.status(400).json({ error: "Invalid region ID" });
    }
    
    // In a real implementation, this would query the database
    // Here we're returning dummy data
    const stations = [];
    const stationCount = Math.floor(Math.random() * 10) + 5; // 5-15 stations
    
    // Generate some sample polling stations in this region
    for (let i = 1; i <= stationCount; i++) {
      const parishNames = [
        'Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester',
        'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James', 'Trelawny',
        'St. Ann', 'St. Mary', 'Portland', 'St. Thomas'
      ];
      
      const parishName = parishNames[regionId - 1] || 'Unknown';
      
      stations.push({
        id: (regionId * 100) + i,
        name: `${parishName} Polling Station ${i}`,
        address: `${Math.floor(Math.random() * 100) + 1} Main Street`,
        city: parishName,
        state: parishName,
        status: Math.random() > 0.8 ? 'issue' : 'active',
        // Random coordinates within Jamaica
        latitude: 17.9 + (Math.random() * 0.7),
        longitude: -78.2 + (Math.random() * 1.4)
      });
    }
    
    res.json(stations);
  } catch (error) {
    console.error(`Error fetching stations for region ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch stations for region" });
  }
});

export default router;