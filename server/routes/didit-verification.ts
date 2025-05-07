import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { diditConnector } from '../services/didit-connector';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth';

const router = Router();

// Route to get the current verification status
router.get('/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user to check if we have email
    const user = await storage.getUser(userId);
    if (!user || !user.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Check verification status with Didit
    const status = await diditConnector.checkVerificationStatus(user.email);
    
    return res.json(status);
  } catch (error) {
    console.error('Error checking verification status:', error);
    return res.status(500).json({ error: 'Failed to check verification status' });
  }
});

// Route to start the verification process
router.get('/initiate', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user
    const user = await storage.getUser(userId);
    if (!user || !user.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Initialize the Didit connector if needed
    await diditConnector.initializeConfig();

    // Generate a verification URL
    const redirectUrl = `${req.protocol}://${req.get('host')}/api/verification/redirect?email=${encodeURIComponent(user.email)}`;
    
    return res.json({ redirectUrl });
  } catch (error) {
    console.error('Error starting verification process:', error);
    return res.status(500).json({ error: 'Failed to start verification process' });
  }
});

// Route that initiates verification and redirects to Didit
router.get('/initiate', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).render('error', { 
        message: 'Email parameter is required' 
      });
    }

    // Ensure Didit server is running
    await diditConnector.ensureServerRunning();

    // Redirect to Didit verification page (implementation depends on Didit API)
    const verificationUrl = `${req.protocol}://${req.get('host')}/didit/verify?email=${encodeURIComponent(email)}`;
    
    return res.redirect(verificationUrl);
  } catch (error) {
    console.error('Error initiating verification:', error);
    return res.status(500).render('error', { 
      message: 'Failed to initiate verification process' 
    });
  }
});

// Webhook for Didit to send verification results
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Basic validation of webhook data
    const schema = z.object({
      email: z.string().email(),
      verified: z.boolean(),
      verificationId: z.string(),
      timestamp: z.string(),
      details: z.object({}).optional(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.error('Invalid webhook data:', result.error);
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    const { email, verified, verificationId } = req.body;

    // Store verification result in user profile
    // This would depend on your database schema
    const user = await storage.getUserByEmail(email);
    if (user) {
      const userProfile = await storage.getUserProfile(user.id);
      
      if (userProfile) {
        await storage.updateUserProfile(user.id, {
          verificationStatus: verified ? 'verified' : 'failed',
          verificationId: verificationId,
          verifiedAt: verified ? new Date() : null,
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing verification webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verification result page
router.get('/result', async (req: Request, res: Response) => {
  try {
    const verificationId = req.query.id as string;
    const success = req.query.success === 'true';
    
    if (!verificationId) {
      return res.status(400).render('error', { 
        message: 'Verification ID is required' 
      });
    }
    
    // Render the verification result page
    return res.render('verification-result', {
      success,
      verificationId,
      date: new Date().toISOString(),
      appName: 'CAFFE Observer Platform',
    });
  } catch (error) {
    console.error('Error rendering verification result:', error);
    return res.status(500).render('error', { 
      message: 'Failed to display verification result' 
    });
  }
});

// Route for admin to test connection to Didit API
router.get('/admin/test-connection', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is admin
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }

    // Initialize the Didit connector with latest config
    await diditConnector.initializeConfig();
    
    // Test the connection
    const result = await diditConnector.testConnection();
    
    return res.json(result);
  } catch (error) {
    console.error('Error testing Didit connection:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Route to get admin settings for Didit
router.get('/admin/settings', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is admin
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }

    // Get current Didit settings from system settings
    const apiKeySetting = await storage.getSystemSetting('didit_api_key');
    const apiSecretSetting = await storage.getSystemSetting('didit_api_secret');
    const baseUrlSetting = await storage.getSystemSetting('didit_base_url');
    const enabledSetting = await storage.getSystemSetting('didit_enabled');
    
    // Return sanitized settings (don't include actual secret)
    return res.json({
      apiKey: apiKeySetting?.settingValue || '',
      apiSecret: apiSecretSetting ? '********' : '',
      baseUrl: baseUrlSetting?.settingValue || 'https://api.didit.me/v1',
      enabled: enabledSetting?.settingValue || false,
    });
  } catch (error) {
    console.error('Error retrieving Didit admin settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve Didit settings' });
  }
});

// Route to update admin settings for Didit
router.put('/admin/settings', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is admin
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }

    // Validate request body
    const schema = z.object({
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
      baseUrl: z.string().url().optional(),
      enabled: z.boolean().optional(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid settings data', details: result.error });
    }

    const { apiKey, apiSecret, baseUrl, enabled } = req.body;

    // Update settings
    if (apiKey !== undefined) {
      await storage.updateSystemSetting('didit_api_key', apiKey, userId);
    }
    
    if (apiSecret !== undefined && apiSecret !== '********') {
      await storage.updateSystemSetting('didit_api_secret', apiSecret, userId);
    }
    
    if (baseUrl !== undefined) {
      await storage.updateSystemSetting('didit_base_url', baseUrl, userId);
    }
    
    if (enabled !== undefined) {
      await storage.updateSystemSetting('didit_enabled', enabled, userId);
    }

    // Apply new configuration
    diditConnector.initializeConfig();

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating Didit admin settings:', error);
    return res.status(500).json({ error: 'Failed to update Didit settings' });
  }
});

export default router;