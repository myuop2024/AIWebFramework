/**
 * Routes for Didit.me identity verification
 */
import { Router, Request, Response } from 'express';
import { diditConnector } from '../services/didit-connector';
import { storage } from '../storage';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth';

const router = Router();

/**
 * Start the verification process for the current user
 * GET /api/verification/start
 */
router.get('/start', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    
    // Get the verification URL
    const verificationUrl = await diditConnector.getVerificationUrl(userId);
    
    // Redirect the user to the verification URL
    res.redirect(verificationUrl);
  } catch (error: any) {
    console.error('Error starting verification:', error);
    res.status(500).json({ 
      error: 'Failed to start verification process',
      details: error.message
    });
  }
});

/**
 * Check the verification status of the current user
 * GET /api/verification/status
 */
router.get('/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    
    // Check the verification status
    const status = await diditConnector.checkVerificationStatus(userId);
    
    // If verified, update our database
    if (status.verified && status.verificationDetails) {
      // Get the user profile
      const userProfile = await storage.getUserProfile(userId);
      
      if (userProfile) {
        // Update verification status in our user database
        await storage.updateUser(userId, {
          verificationStatus: 'verified'
        });
        
        // Store verification details in the database
        // We'll add this data as a JSON string to avoid schema changes
        await storage.updateSystemSetting(
          `user_verification_${userId}`,
          JSON.stringify(status.verificationDetails),
          userId
        );
      }
    }
    
    res.json(status);
  } catch (error: any) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ 
      error: 'Failed to check verification status',
      details: error.message
    });
  }
});

/**
 * Admin endpoint to update Didit.me configuration
 * PUT /api/verification/admin/config
 */
router.put('/admin/config', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const config = req.body;
    
    // Validate required fields
    if (!config || !config.clientId || !config.clientSecret) {
      return res.status(400).json({ error: 'Client ID and Client Secret are required' });
    }
    
    // Update the configuration
    const success = await diditConnector.updateConfiguration(config);
    
    if (success) {
      // Store the configuration in system settings
      await storage.updateSystemSetting('didit_client_id', config.clientId, req.session.userId);
      await storage.updateSystemSetting('didit_client_secret', config.clientSecret, req.session.userId);
      
      if (config.redirectUri) {
        await storage.updateSystemSetting('didit_redirect_uri', config.redirectUri, req.session.userId);
      }
      
      if (config.authUrl) {
        await storage.updateSystemSetting('didit_auth_url', config.authUrl, req.session.userId);
      }
      
      if (config.tokenUrl) {
        await storage.updateSystemSetting('didit_token_url', config.tokenUrl, req.session.userId);
      }
      
      if (config.meUrl) {
        await storage.updateSystemSetting('didit_me_url', config.meUrl, req.session.userId);
      }
      
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  } catch (error: any) {
    console.error('Error updating Didit.me configuration:', error);
    res.status(500).json({ 
      error: 'Failed to update configuration',
      details: error.message
    });
  }
});

/**
 * Admin endpoint to get Didit.me configuration
 * GET /api/verification/admin/config
 */
router.get('/admin/config', ensureAdmin, async (req: Request, res: Response) => {
  try {
    // Get configuration from system settings
    const clientId = await storage.getSystemSetting('didit_client_id');
    const clientSecret = await storage.getSystemSetting('didit_client_secret');
    const redirectUri = await storage.getSystemSetting('didit_redirect_uri');
    const authUrl = await storage.getSystemSetting('didit_auth_url');
    const tokenUrl = await storage.getSystemSetting('didit_token_url');
    const meUrl = await storage.getSystemSetting('didit_me_url');
    
    res.json({
      clientId: clientId?.settingValue || '',
      // Don't return the actual secret, just indicate if it's set
      clientSecret: clientSecret ? '************' : '',
      redirectUri: redirectUri?.settingValue || '',
      authUrl: authUrl?.settingValue || '',
      tokenUrl: tokenUrl?.settingValue || '',
      meUrl: meUrl?.settingValue || '',
      isValid: !!(clientId?.settingValue && clientSecret?.settingValue)
    });
  } catch (error: any) {
    console.error('Error getting Didit.me configuration:', error);
    res.status(500).json({ 
      error: 'Failed to get configuration',
      details: error.message
    });
  }
});

export default router;