import express from 'express';
import { storage } from '../storage';
import { jamaicaParishBoundaries } from '../../client/src/data/jamaica-parishes';

const router = express.Router();

// Get all Jamaica parishes with boundaries
router.get('/parishes', async (req, res) => {
  try {
    // Return the parish boundary data
    res.json({
      success: true,
      parishes: jamaicaParishBoundaries
    });
  } catch (error) {
    console.error('Error fetching parish data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch parish data' });
  }
});

// Get polling stations for a specific parish
router.get('/parishes/:parishName/stations', async (req, res) => {
  try {
    const { parishName } = req.params;
    
    // Get all polling stations from storage
    const stations = await storage.getAllPollingStations();
    
    // Filter stations by parish (state field in the database)
    const filteredStations = stations.filter(station => 
      station.state.toLowerCase() === parishName.toLowerCase()
    );
    
    res.json({
      success: true,
      parish: parishName,
      stationCount: filteredStations.length,
      stations: filteredStations
    });
  } catch (error) {
    console.error(`Error fetching stations for parish ${req.params.parishName}:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch parish stations data' });
  }
});

// Get all polling stations with coordinates for the map
router.get('/stations', async (req, res) => {
  try {
    // Get all polling stations
    const stations = await storage.getAllPollingStations();
    
    // Map to a format suitable for the frontend map
    const mappedStations = stations.map(station => ({
      id: station.id,
      name: station.name,
      address: station.address,
      parish: station.state, // Parish is stored in the 'state' field
      stationCode: station.stationCode,
      latitude: station.latitude || null,
      longitude: station.longitude || null,
      status: 'active' // Default status
    }));
    
    res.json({
      success: true,
      stationCount: mappedStations.length,
      stations: mappedStations
    });
  } catch (error) {
    console.error('Error fetching all stations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stations data' });
  }
});

export default router;