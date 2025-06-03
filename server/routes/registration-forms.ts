import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import logger from '../utils/logger';

const router = Router();

// Field validation schema
const FormFieldValidationSchema = z.object({
  pattern: z.string().optional(),
  customMessage: z.string().optional(),
}).optional();

// Field option schema
const FormFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

// Field schema
const FormFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'email', 'password', 'tel', 'number', 'select', 'checkbox', 'textarea', 'file', 'date', 'radio', 'time', 'image', 'signature', 'location', 'datetime-local', 'observation']),
  label: z.string(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().optional(),
  order: z.number(),
  options: z.array(FormFieldOptionSchema).optional(),
  validation: FormFieldValidationSchema,
  isAdminOnly: z.boolean().optional(),
  isUserEditable: z.boolean().optional(),
  mapToUserField: z.string().optional(),
  mapToProfileField: z.string().optional(),
});

// GET all registration forms
router.get('/', async (req, res) => {
  try {
    const forms = await storage.getAllRegistrationForms();
    res.json(forms);
  } catch (error) {
    console.error('Error fetching registration forms:', error);
    res.status(500).json({ message: 'Failed to fetch registration forms' });
  }
});

// GET active registration form
router.get('/active', async (req, res) => {
  try {
    const form = await storage.getActiveRegistrationForm();
    if (!form) {
      return res.status(404).json({ message: 'No active registration form found' });
    }
    res.json(form);
  } catch (error) {
    console.error('Error fetching active registration form:', error);
    res.status(500).json({ message: 'Failed to fetch active registration form' });
  }
});

// GET a specific registration form
router.get('/:id', async (req, res) => {
  try {
    const formId = parseInt(req.params.id);
    if (isNaN(formId)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }

    const form = await storage.getRegistrationForm(formId);
    if (!form) {
      return res.status(404).json({ message: 'Registration form not found' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching registration form:', error);
    res.status(500).json({ message: 'Failed to fetch registration form' });
  }
});

// CREATE a new registration form
router.post('/', async (req, res) => {
  try {
    // Basic form validation
    const { name, description, fields } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    // Validate fields if provided
    if (fields) {
      try {
        z.array(FormFieldSchema).parse(fields);
      } catch (validationError: any) {
        return res.status(400).json({ 
          message: 'Invalid field format', 
          errors: validationError.errors 
        });
      }
    }

    // Create the form
    const newForm = await storage.createRegistrationForm({
      name,
      description,
      isActive: false,
      fields: fields || [],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json(newForm);
  } catch (error) {
    console.error('Error creating registration form:', error);
    res.status(500).json({ message: 'Failed to create registration form' });
  }
});

// UPDATE a registration form
router.patch('/:id', async (req, res) => {
  try {
    const formId = parseInt(req.params.id);
    if (isNaN(formId)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }

    // Get the existing form
    const existingForm = await storage.getRegistrationForm(formId);
    if (!existingForm) {
      return res.status(404).json({ message: 'Registration form not found' });
    }

    // Prepare update data
    const updateData: any = {
      ...req.body,
      updatedAt: new Date()
    };

    // Validate fields if provided
    if (updateData.fields) {
      try {
        z.array(FormFieldSchema).parse(updateData.fields);
      } catch (validationError: any) {
        return res.status(400).json({ 
          message: 'Invalid field format', 
          errors: validationError.errors 
        });
      }
    }

    // Remove undefined fields to avoid overriding with null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // If changing isActive to true, ensure there's only one active form
    if (updateData.isActive === true) {
      // This is handled in the activation endpoint
      delete updateData.isActive;
    }

    // Update the form
    const updatedForm = await storage.updateRegistrationForm(formId, updateData);
    if (!updatedForm) {
      return res.status(500).json({ message: 'Failed to update registration form' });
    }

    res.json(updatedForm);
  } catch (error) {
    console.error('Error updating registration form:', error);
    res.status(500).json({ message: 'Failed to update registration form' });
  }
});

// ACTIVATE a registration form
router.post('/:id/activate', async (req, res) => {
  try {
    const formId = parseInt(req.params.id);
    if (isNaN(formId)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }

    // Get the existing form
    const existingForm = await storage.getRegistrationForm(formId);
    if (!existingForm) {
      return res.status(404).json({ message: 'Registration form not found' });
    }

    // Activate the form
    const activatedForm = await storage.activateRegistrationForm(formId);
    if (!activatedForm) {
      return res.status(500).json({ message: 'Failed to activate registration form' });
    }

    res.json(activatedForm);
  } catch (error) {
    console.error('Error activating registration form:', error);
    res.status(500).json({ message: 'Failed to activate registration form' });
  }
});

// DELETE a registration form
router.delete('/:id', async (req, res) => {
  try {
    const formId = parseInt(req.params.id);
    if (isNaN(formId)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    // Get the form
    const form = await storage.getRegistrationForm(formId);
    if (!form) {
      return res.status(404).json({ message: 'Registration form not found' });
    }
    if (form.isActive) {
      return res.status(400).json({ message: 'Cannot delete an active registration form. Please deactivate it first.' });
    }
    // Optionally: check if form has been used for registrations and prevent deletion if so
    // const used = await storage.hasRegistrationsForForm(formId);
    // if (used) {
    //   return res.status(400).json({ message: 'Cannot delete a form that has been used for registrations.' });
    // }
    const deleted = await storage.deleteRegistrationForm(formId);
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete registration form' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting registration form:', error);
    res.status(500).json({ message: 'Failed to delete registration form' });
  }
});

export default router;