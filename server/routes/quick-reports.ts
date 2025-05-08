import { Router } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated } from '../middleware/auth';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Set up multer for handling file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'reports', 'quick');
      
      // Ensure the directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename to prevent overwrites
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `quick-incident-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only images for quick reports
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF images are allowed.'));
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  }
});

const router = Router();

// Submit a quick incident report with optional attached image
router.post('/', ensureAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const {
      stationId,
      incidentType,
      description,
      severity,
      locationLat,
      locationLng
    } = req.body;
    
    // Validate required fields
    if (!stationId || !incidentType || !description) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        requiredFields: ['stationId', 'incidentType', 'description'] 
      });
    }
    
    // Parse station ID
    const parsedStationId = parseInt(stationId);
    if (isNaN(parsedStationId)) {
      return res.status(400).json({ message: 'Invalid station ID' });
    }
    
    // Validate that the station exists
    const station = await storage.getPollingStation(parsedStationId);
    if (!station) {
      return res.status(404).json({ message: 'Polling station not found' });
    }
    
    // Generate content object for the report
    const reportContent = {
      incidentType,
      description,
      severity: severity || 'medium',
      locationLat: locationLat ? parseFloat(locationLat) : null,
      locationLng: locationLng ? parseFloat(locationLng) : null,
      submittedVia: 'quick-report',
      timestamp: new Date().toISOString()
    };
    
    // Create the report
    const report = await storage.createReport({
      userId: req.user!.id,
      stationId: parsedStationId,
      reportType: 'incidentReport',
      content: reportContent,
      contentHash: storage.generateContentHash(reportContent),
      status: 'submitted',
      submittedAt: new Date(),
      locationLat: reportContent.locationLat,
      locationLng: reportContent.locationLng
    });
    
    // If an image was uploaded, create an attachment for it
    if (req.file) {
      const attachment = await storage.createReportAttachment({
        reportId: report.id,
        fileType: req.file.mimetype,
        fileName: req.file.originalname || `incident-image-${Date.now()}.jpg`,
        filePath: req.file.path,
        fileSize: req.file.size,
      });
      
      // Return the report with the attachment
      return res.status(201).json({
        ...report,
        attachments: [attachment]
      });
    }
    
    // Return the report without attachments
    res.status(201).json(report);
  } catch (error) {
    console.error('Error submitting quick incident report:', error);
    res.status(500).json({ message: 'Failed to submit report', error: error.message });
  }
});

// Get a list of predefined incident types
router.get('/incident-types', ensureAuthenticated, async (req, res) => {
  try {
    // In a real implementation, these would be fetched from the database
    const incidentTypes = [
      { id: 'voter_intimidation', name: 'Voter Intimidation', severity: 'high' },
      { id: 'equipment_failure', name: 'Equipment Failure', severity: 'medium' },
      { id: 'irregularity', name: 'Procedural Irregularity', severity: 'medium' },
      { id: 'accessibility_issue', name: 'Accessibility Issue', severity: 'medium' },
      { id: 'electioneering', name: 'Electioneering', severity: 'medium' },
      { id: 'ballot_shortage', name: 'Ballot Shortage', severity: 'high' },
      { id: 'long_lines', name: 'Excessive Wait Times', severity: 'low' },
      { id: 'security_concern', name: 'Security Concern', severity: 'high' },
      { id: 'misinformation', name: 'Misinformation', severity: 'medium' },
      { id: 'observer_interference', name: 'Observer Interference', severity: 'high' },
      { id: 'other', name: 'Other Issue', severity: 'medium' }
    ];
    
    res.status(200).json(incidentTypes);
  } catch (error) {
    console.error('Error fetching incident types:', error);
    res.status(500).json({ message: 'Failed to fetch incident types', error: error.message });
  }
});

export default router;