import { Router } from 'express';
import { storage } from '../storage';
import { insertRegistrationFormSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { requireAuth } from '../middleware/auth';

const router = Router();
const requireAdmin = requireAuth(['admin']);

// Get all registration forms (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const forms = await storage.getAllRegistrationForms();
    res.status(200).json(forms);
  } catch (error) {
    console.error('Error fetching registration forms:', error);
    res.status(500).json({ message: 'Failed to fetch registration forms' });
  }
});

// Get active registration form (public)
router.get('/active', async (req, res) => {
  try {
    const activeForm = await storage.getActiveRegistrationForm();
    if (!activeForm) {
      return res.status(404).json({ message: 'No active registration form found' });
    }
    res.status(200).json(activeForm);
  } catch (error) {
    console.error('Error fetching active registration form:', error);
    res.status(500).json({ message: 'Failed to fetch active registration form' });
  }
});

// Get specific registration form (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    
    const form = await storage.getRegistrationForm(id);
    if (!form) {
      return res.status(404).json({ message: 'Registration form not found' });
    }
    
    res.status(200).json(form);
  } catch (error) {
    console.error('Error fetching registration form:', error);
    res.status(500).json({ message: 'Failed to fetch registration form' });
  }
});

// Create registration form (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const result = insertRegistrationFormSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid registration form data', 
        errors: fromZodError(result.error).message 
      });
    }
    
    const form = await storage.createRegistrationForm(result.data);
    res.status(201).json(form);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create registration form';
    console.error('Error creating registration form:', error);
    res.status(500).json({ message: errorMessage });
  }
});

// Update registration form (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    
    const existingForm = await storage.getRegistrationForm(id);
    if (!existingForm) {
      return res.status(404).json({ message: 'Registration form not found' });
    }
    
    const updatedForm = await storage.updateRegistrationForm(id, req.body);
    res.status(200).json(updatedForm);
  } catch (error) {
    console.error('Error updating registration form:', error);
    res.status(500).json({ message: 'Failed to update registration form' });
  }
});

// Activate registration form (admin only)
router.post('/:id/activate', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    
    const existingForm = await storage.getRegistrationForm(id);
    if (!existingForm) {
      return res.status(404).json({ message: 'Registration form not found' });
    }
    
    const activatedForm = await storage.activateRegistrationForm(id);
    res.status(200).json(activatedForm);
  } catch (error) {
    console.error('Error activating registration form:', error);
    res.status(500).json({ message: 'Failed to activate registration form' });
  }
});

export default router;