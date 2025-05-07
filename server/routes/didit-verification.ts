import express, { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth';
import { diditConnector } from '../services/didit-connector';

const router: Router = express.Router();

/**
 * Check the verification status of the current user
 */
router.get('/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the user has already verified with Didit
    // If verified, return all the verification details
    if (user.verificationStatus === 'verified') {
      // Get verification details from system settings
      const verificationDetails = await storage.getSystemSetting(`didit_verification_${userId}`);
      
      return res.json({ 
        verified: true,
        verificationDetails: verificationDetails ? JSON.parse(verificationDetails.settingValue) : null
      });
    }

    // If the user is not verified, check with Didit service
    const verificationStatus = await diditConnector.checkVerificationStatus(user.email);
    
    // If the user is now verified according to Didit, update our system
    if (verificationStatus.verified) {
      // Update user verification status
      await storage.updateUser(userId, { verificationStatus: 'verified' });
      
      // Store verification details
      await storage.updateSystemSetting(
        `didit_verification_${userId}`,
        JSON.stringify(verificationStatus.details),
        userId
      );
      
      return res.json({ 
        verified: true,
        verificationDetails: verificationStatus.details
      });
    }

    // User not verified
    return res.json({ verified: false });
  } catch (error) {
    console.error('Error checking verification status:', error);
    return res.status(500).json({ error: 'An error occurred checking verification status' });
  }
});

/**
 * Start the verification process for the current user
 */
router.get('/start', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Start the Didit integration server if not already running
    await diditConnector.ensureServerRunning();

    // Redirect to the Didit verification page
    // This will start a verification session with the user's email
    res.redirect(`http://localhost:3030/start-verification?email=${encodeURIComponent(user.email)}&redirect_url=${encodeURIComponent('/api/verification/callback')}`);
  } catch (error) {
    console.error('Error starting verification:', error);
    return res.status(500).json({ error: 'An error occurred starting verification' });
  }
});

/**
 * Callback endpoint for Didit verification process
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    // Get the verification ID from the query string
    const verificationId = req.query.verification_id as string;
    const success = req.query.success === 'true';
    
    if (!success || !verificationId) {
      return res.render('verification-result', { 
        success: false, 
        message: 'Verification failed. Please try again.' 
      });
    }
    
    // Get verification details from Didit
    const verificationDetails = await diditConnector.getVerificationDetails(verificationId);
    
    if (!verificationDetails || !verificationDetails.email) {
      return res.render('verification-result', { 
        success: false, 
        message: 'Could not retrieve verification details. Please try again.' 
      });
    }
    
    // Find the user by email
    const user = await storage.getUserByEmail(verificationDetails.email);
    if (!user) {
      return res.render('verification-result', { 
        success: false, 
        message: 'User not found with this email. Please contact support.' 
      });
    }
    
    // Update user verification status
    await storage.updateUser(user.id, { verificationStatus: 'verified' });
    
    // Store verification details
    await storage.updateSystemSetting(
      `didit_verification_${user.id}`,
      JSON.stringify({
        id: verificationId,
        name: `${user.firstName} ${user.lastName}`,
        verification_level: verificationDetails.level || 'standard',
        verified_at: new Date().toISOString()
      }),
      user.id
    );
    
    // Render success page
    return res.render('verification-result', { 
      success: true, 
      message: 'Verification successful! You can close this window and return to the app.' 
    });
  } catch (error) {
    console.error('Error in verification callback:', error);
    return res.render('verification-result', { 
      success: false, 
      message: 'An error occurred during verification. Please try again later.' 
    });
  }
});

/**
 * Admin endpoint to get Didit configuration
 */
router.get('/admin/config', ensureAdmin, async (req: Request, res: Response) => {
  try {
    // Get Didit configuration from system settings
    const apiKey = await storage.getSystemSetting('didit_api_key');
    const apiSecret = await storage.getSystemSetting('didit_api_secret');
    const baseUrl = await storage.getSystemSetting('didit_base_url');
    const enabled = await storage.getSystemSetting('didit_enabled');
    
    res.json({
      apiKey: apiKey?.settingValue || '',
      apiSecret: apiSecret?.settingValue ? '********' : '', // Don't return the actual secret
      baseUrl: baseUrl?.settingValue || 'https://api.didit.me/v1',
      enabled: enabled?.settingValue === 'true',
    });
  } catch (error) {
    console.error('Error getting Didit configuration:', error);
    return res.status(500).json({ error: 'An error occurred retrieving Didit configuration' });
  }
});

/**
 * Admin endpoint to update Didit configuration
 */
router.post('/admin/config', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { apiKey, apiSecret, baseUrl, enabled } = req.body;
    
    // Update Didit configuration in system settings
    await storage.updateSystemSetting('didit_api_key', apiKey, userId);
    if (apiSecret && apiSecret !== '********') {
      await storage.updateSystemSetting('didit_api_secret', apiSecret, userId);
    }
    await storage.updateSystemSetting('didit_base_url', baseUrl, userId);
    await storage.updateSystemSetting('didit_enabled', enabled ? 'true' : 'false', userId);
    
    // Update the connector with new settings
    diditConnector.updateConfig({
      apiKey,
      apiSecret: apiSecret && apiSecret !== '********' ? apiSecret : undefined,
      baseUrl,
      enabled
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating Didit configuration:', error);
    return res.status(500).json({ error: 'An error occurred updating Didit configuration' });
  }
});

export default router;