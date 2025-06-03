import express from "express";
import { hasRoleMiddleware as hasRole } from "../middleware/auth";
import { storage } from "../storage";
import { z } from "zod";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse';
import { ensureAuthenticated } from "../middleware/auth";
import logger from '../utils/logger';

const router = express.Router();

// Multer setup for CSV file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Validation schemas
const createPollingStationSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  stationCode: z.string().min(2, { message: "Station code is required" }),
  capacity: z.coerce.number().int().positive().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().min(5, { message: "Address is required" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "State/Parish is required" }),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accessibilityFeatures: z.array(z.string()).optional(),
  isActive: z.boolean().default(true)
});

const updatePollingStationSchema = createPollingStationSchema.partial().extend({
  id: z.number()
});

// Get all polling stations
router.get("/", hasRole(["observer", "admin", "supervisor", "roving"]), async (req, res) => {
  try {
    const stations = await storage.getAllPollingStations();
    res.json(stations);
  } catch (error) {
    logger.error("Error fetching polling stations:", error);
    res.status(500).json({ error: "Failed to fetch polling stations" });
  }
});

// Get single polling station by ID
router.get("/:id", hasRole(["observer", "admin", "supervisor", "roving"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const station = await storage.getPollingStation(id);
    if (!station) {
      return res.status(404).json({ error: "Polling station not found" });
    }

    res.json(station);
  } catch (error) {
    logger.error("Error fetching polling station:", error);
    res.status(500).json({ error: "Failed to fetch polling station" });
  }
});

// Create a new polling station
router.post("/", hasRole(["admin", "supervisor"]), async (req, res) => {
  try {
    const validationResult = createPollingStationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.error.format() 
      });
    }

    // Map validated data to the schema fields
    const stationData = {
      name: validationResult.data.name,
      stationCode: validationResult.data.stationCode,
      address: validationResult.data.address,
      city: validationResult.data.city,
      state: validationResult.data.state,
      zipCode: validationResult.data.zipCode || "",
      capacity: validationResult.data.capacity || null,
      latitude: validationResult.data.latitude || null,
      longitude: validationResult.data.longitude || null,
      status: validationResult.data.isActive ? "active" : "inactive"
    };

    const newStation = await storage.createPollingStation(stationData);

    res.status(201).json(newStation);
  } catch (error) {
    logger.error("Error creating polling station:", error);
    res.status(500).json({ error: "Failed to create polling station" });
  }
});

// Update a polling station
router.patch("/:id", hasRole(["admin", "supervisor"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // First check if the station exists
    const existingStation = await storage.getPollingStation(id);
    if (!existingStation) {
      return res.status(404).json({ error: "Polling station not found" });
    }

    // Validate the update data
    const validationResult = updatePollingStationSchema.safeParse({
      ...req.body,
      id
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.error.format() 
      });
    }

    // Map validated data to the schema fields
    const updateData: any = {};

    if (validationResult.data.name !== undefined) updateData.name = validationResult.data.name;
    if (validationResult.data.stationCode !== undefined) updateData.stationCode = validationResult.data.stationCode;
    if (validationResult.data.address !== undefined) updateData.address = validationResult.data.address;
    if (validationResult.data.city !== undefined) updateData.city = validationResult.data.city;
    if (validationResult.data.state !== undefined) updateData.state = validationResult.data.state;
    if (validationResult.data.zipCode !== undefined) updateData.zipCode = validationResult.data.zipCode;
    if (validationResult.data.capacity !== undefined) updateData.capacity = validationResult.data.capacity;
    if (validationResult.data.latitude !== undefined) updateData.latitude = validationResult.data.latitude;
    if (validationResult.data.longitude !== undefined) updateData.longitude = validationResult.data.longitude;
    if (validationResult.data.isActive !== undefined) updateData.status = validationResult.data.isActive ? "active" : "inactive";

    // Update the station
    const updatedStation = await storage.updatePollingStation(id, updateData);

    res.json(updatedStation);
  } catch (error) {
    logger.error("Error updating polling station:", error);
    res.status(500).json({ error: "Failed to update polling station" });
  }
});

// Delete a polling station
router.delete("/:id", hasRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if the station exists
    const existingStation = await storage.getPollingStation(id);
    if (!existingStation) {
      return res.status(404).json({ error: "Polling station not found" });
    }

    // Delete the station
    const success = await storage.deletePollingStation(id);
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ error: "Failed to delete polling station" });
    }
  } catch (error) {
    logger.error("Error deleting polling station:", error);
    res.status(500).json({ error: "Failed to delete polling station" });
  }
});

// Import polling stations from CSV
router.post("/import", hasRole(["admin", "supervisor"]), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.join(process.cwd(), req.file.path);
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

    // Parse CSV
    parse(fileContent, {
      columns: true,
      trim: true,
      skip_empty_lines: true
    }, async (err, records) => {
      if (err) {
        logger.error("Error parsing CSV:", err);
        return res.status(400).json({ error: "Invalid CSV format" });
      }

      const createdStations = [];
      const errors = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        try {
          // Transform CSV record to match our schema
          const stationData = {
            name: record.name,
            stationCode: record.stationCode || record.code,
            address: record.address,
            city: record.city,
            state: record.state || record.parish,
            zipCode: record.zipCode || record.postalCode || "",
            capacity: record.capacity ? parseInt(record.capacity) : 5,
            latitude: record.latitude ? parseFloat(record.latitude) : null,
            longitude: record.longitude ? parseFloat(record.longitude) : null,
            status: record.status || record.isActive === "true" || record.isActive === "1" ? "active" : "inactive",
            coordinates: record.coordinates || null
          };

          // Validate the data
          const validationResult = createPollingStationSchema.safeParse(stationData);
          if (!validationResult.success) {
            errors.push({
              row: i + 2, // +2 because of 0-indexing and header row
              stationCode: record.stationCode || record.code,
              errors: validationResult.error.format()
            });
            continue;
          }

          // Create the station
          const newStation = await storage.createPollingStation(stationData);
          createdStations.push(newStation);
        } catch (error) {
          logger.error(`Error processing row ${i + 2}:`, error);
          errors.push({
            row: i + 2,
            stationCode: record.stationCode || record.code,
            error: "Failed to process this record"
          });
        }
      }

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      res.status(200).json({
        message: `Imported ${createdStations.length} polling stations`,
        success: createdStations.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        stations: createdStations
      });
    });
  } catch (error) {
    logger.error("Error importing polling stations:", error);
    res.status(500).json({ error: "Failed to import polling stations" });
  }
});

// Export polling stations to CSV
router.get("/export", hasRole(["admin", "supervisor"]), async (req, res) => {
  try {
    const stations = await storage.getAllPollingStations();

    // Convert to CSV format
    const header = "id,name,stationCode,address,city,state,zipCode,capacity,latitude,longitude,status,coordinates\n";
    const rows = stations.map(station => {
      return [
        station.id,
        station.name ? `"${station.name.replace(/"/g, '""')}"` : '',
        station.stationCode,
        station.address ? `"${station.address.replace(/"/g, '""')}"` : '',
        station.city ? `"${station.city.replace(/"/g, '""')}"` : '',
        station.state ? `"${station.state.replace(/"/g, '""')}"` : '',
        station.zipCode || '',
        station.capacity || '',
        station.latitude || '',
        station.longitude || '',
        station.status || 'active',
        station.coordinates || ''
      ].join(',');
    }).join('\n');

    const csv = header + rows;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=polling-stations.csv');

    res.send(csv);
  } catch (error) {
    logger.error("Error exporting polling stations:", error);
    res.status(500).json({ error: "Failed to export polling stations" });
  }
});

// Assign an observer to a polling station
router.post('/:stationId/assign', ensureAuthenticated, async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    const { userId } = req.body;
    if (isNaN(stationId) || !userId) {
      return res.status(400).json({ message: 'Invalid station or user ID' });
    }
    const assignment = await storage.assignObserverToStation(userId, stationId);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign observer' });
  }
});

// Unassign an observer from a polling station
router.delete('/:stationId/unassign/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    const userId = parseInt(req.params.userId);
    if (isNaN(stationId) || isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid station or user ID' });
    }
    await storage.unassignObserverFromStation(userId, stationId);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to unassign observer' });
  }
});

// Get all assignments for a polling station
router.get('/:stationId/assignments', ensureAuthenticated, async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    if (isNaN(stationId)) {
      return res.status(400).json({ message: 'Invalid station ID' });
    }
    const assignments = await storage.getAssignmentsByStationId(stationId);
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
});

// Get all assignments for a user
router.get('/user/:userId/assignments', ensureAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const assignments = await storage.getAssignmentsByUserId(userId);
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
});

// Check-in to a polling station
router.post('/:stationId/check-in', ensureAuthenticated, async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    const userId = req.session.userId;

    if (isNaN(stationId) || !userId) {
      return res.status(400).json({ message: 'Invalid station or user ID' });
    }

    // Verify the station exists
    const station = await storage.getPollingStation(stationId);
    if (!station) {
      return res.status(404).json({ message: 'Polling station not found' });
    }

    // Check if user has an assignment for this station
    const assignments = await storage.getAssignmentsByUserId(userId);
    const stationAssignment = assignments.find(a => a.stationId === stationId);

    if (!stationAssignment) {
      return res.status(403).json({ message: 'You are not assigned to this polling station' });
    }

    // Record the check-in (you may need to implement this in storage)
    const checkInData = {
      userId,
      stationId,
      checkInTime: new Date(),
      location: req.body.location || null
    };

    // For now, we'll just return success - implement actual storage later
    res.status(200).json({
      message: 'Successfully checked in',
      station: station.name,
      checkInTime: checkInData.checkInTime
    });
  } catch (error) {
    logger.error('Error during check-in:', error);
    res.status(500).json({ message: 'Failed to check in' });
  }
});

export default router;