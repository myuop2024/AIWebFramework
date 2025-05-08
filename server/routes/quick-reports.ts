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
    
    // Generate content object for the report, capturing all dynamic form fields
    const reportContent: Record<string, any> = {
      incidentType,
      description,
      severity: severity || 'medium',
      locationLat: locationLat ? parseFloat(locationLat) : null,
      locationLng: locationLng ? parseFloat(locationLng) : null,
      submittedVia: 'quick-report',
      timestamp: new Date().toISOString()
    };
    
    // Add any additional dynamic fields from the form template
    // This captures all custom fields that might be in the template
    Object.keys(req.body).forEach(key => {
      // Skip fields we've already processed or that are part of the report structure
      if (!['stationId', 'incidentType', 'description', 'severity', 'locationLat', 'locationLng'].includes(key)) {
        reportContent[key] = req.body[key];
      }
    });
    
    // Create hash for content integrity
    const contentHashValue = storage.generateContentHash(reportContent);
    
    // Create the report - need to use 'as any' to bypass the strict typing temporarily
    // This approach is safer than modifying the shared schema which might affect other components
    const report = await storage.createReport({
      userId: req.user!.id,
      stationId: parsedStationId,
      reportType: 'incidentReport',
      content: reportContent,
      status: 'submitted',
      submittedAt: new Date(),
      locationLat: reportContent.locationLat,
      locationLng: reportContent.locationLng,
      contentHash: contentHashValue
    } as any);
    
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
  } catch (error: unknown) {
    console.error('Error submitting quick incident report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to submit report', error: errorMessage });
  }
});

// Get a list of predefined incident types
router.get('/incident-types', ensureAuthenticated, async (req, res) => {
  try {
    // First try to get incident types from form templates
    const templates = await storage.getFormTemplatesByCategory('incident');
    
    // If we have custom templates, use those
    if (templates && templates.length > 0) {
      const template = templates.find(t => t.isActive) || templates[0];
      
      // Extract incident types from the template fields
      if (template && template.fields) {
        const fields = template.fields as any;
        if (Array.isArray(fields) && fields.some(f => f.name === 'incidentType' && Array.isArray(f.options))) {
          const incidentField = fields.find(f => f.name === 'incidentType');
          if (incidentField && incidentField.options) {
            return res.status(200).json(incidentField.options);
          }
        }
      }
    }
    
    // Fallback to predefined incident types if no custom templates are available
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
  } catch (error: unknown) {
    console.error('Error fetching incident types:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to fetch incident types', error: errorMessage });
  }
});

// Get templates for quick incident reports
router.get('/templates', ensureAuthenticated, async (req, res) => {
  try {
    // Get all templates for incident reports
    const templates = await storage.getFormTemplatesByCategory('incident');
    
    // If no templates exist, create a default one
    if (!templates || templates.length === 0) {
      // Default incident report template
      const defaultTemplate = {
        name: "Default Quick Incident Report",
        description: "Standard template for quick incident reporting",
        category: "incident",
        isActive: true,
        fields: [
          {
            name: "incidentType",
            label: "Incident Type",
            type: "select",
            required: true,
            options: [
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
            ]
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            required: true,
            placeholder: "Describe the incident with details..."
          },
          {
            name: "severity",
            label: "Severity",
            type: "select",
            required: true,
            options: [
              { id: 'low', name: 'Low' },
              { id: 'medium', name: 'Medium' },
              { id: 'high', name: 'High' }
            ]
          },
          {
            name: "location",
            label: "Location",
            type: "location",
            required: false
          },
          {
            name: "image",
            label: "Visual Evidence",
            type: "image",
            required: false
          }
        ]
      };
      
      // Create the default template
      const createdTemplate = await storage.createFormTemplate(defaultTemplate);
      return res.status(200).json([createdTemplate]);
    }
    
    res.status(200).json(templates);
  } catch (error: unknown) {
    console.error('Error fetching quick report templates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Failed to fetch templates', error: errorMessage });
  }
});

export default router;