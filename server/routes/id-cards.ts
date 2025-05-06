import { Router } from 'express';
import { storage } from '../storage';
import { idCardService } from '../services/id-card-service';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { idCardTemplateSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

const router = Router();

// Get all ID card templates (admin only)
router.get('/templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const templates = await storage.getAllIdCardTemplates();
    res.status(200).json(templates);
  } catch (error) {
    console.error('Error fetching ID card templates:', error);
    res.status(500).json({ message: 'Failed to fetch ID card templates' });
  }
});

// Get a specific ID card template (admin only)
router.get('/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }
    
    const template = await storage.getIdCardTemplate(id);
    if (!template) {
      return res.status(404).json({ message: 'ID card template not found' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error fetching ID card template:', error);
    res.status(500).json({ message: 'Failed to fetch ID card template' });
  }
});

// Get active ID card template
router.get('/templates/active', requireAuth, async (req, res) => {
  try {
    const template = await storage.getActiveIdCardTemplate();
    if (!template) {
      // Create a default template if none exists
      const defaultTemplate = await idCardService.createDefaultTemplate();
      return res.status(200).json(defaultTemplate);
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error fetching active ID card template:', error);
    res.status(500).json({ message: 'Failed to fetch active ID card template' });
  }
});

// Create a new ID card template (admin only)
router.post('/templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = idCardTemplateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid template data', 
        errors: fromZodError(result.error).message 
      });
    }
    
    const template = await storage.createIdCardTemplate(req.body);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating ID card template:', error);
    res.status(500).json({ message: 'Failed to create ID card template' });
  }
});

// Update an ID card template (admin only)
router.put('/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }
    
    const result = idCardTemplateSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid template data', 
        errors: fromZodError(result.error).message 
      });
    }
    
    const template = await storage.updateIdCardTemplate(id, req.body);
    if (!template) {
      return res.status(404).json({ message: 'ID card template not found' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error updating ID card template:', error);
    res.status(500).json({ message: 'Failed to update ID card template' });
  }
});

// Delete an ID card template (admin only)
router.delete('/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }
    
    const success = await storage.deleteIdCardTemplate(id);
    if (!success) {
      return res.status(404).json({ message: 'ID card template not found' });
    }
    
    res.status(200).json({ message: 'ID card template deleted successfully' });
  } catch (error) {
    console.error('Error deleting ID card template:', error);
    res.status(500).json({ message: 'Failed to delete ID card template' });
  }
});

// Generate ID card for a user
router.get('/generate/:userId', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Check if user is requesting their own ID or if they're an admin
    if (userId !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to access this ID card' });
    }
    
    const pdfBuffer = await idCardService.generateIdCard(userId);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="observer-id-${userId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating ID card:', error);
    res.status(500).json({ message: 'Failed to generate ID card' });
  }
});

// Preview ID card template (admin only)
router.post('/preview-template', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = idCardTemplateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid template data', 
        errors: fromZodError(result.error).message 
      });
    }
    
    // Store template temporarily
    const tempTemplate = await storage.createIdCardTemplate({
      ...req.body,
      name: `Preview-${Date.now()}`,
      isActive: false
    });
    
    // Generate preview using admin's own ID
    const userId = req.session.userId;
    const pdfBuffer = await idCardService.generateIdCard(userId);
    
    // Delete the temporary template
    await storage.deleteIdCardTemplate(tempTemplate.id);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error previewing ID card template:', error);
    res.status(500).json({ message: 'Failed to preview ID card template' });
  }
});

export default router;