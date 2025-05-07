/**
 * Admin routes for the application
 */
const express = require('express');
const router = express.Router();
const configModel = require('../models/config');
const authUtils = require('../utils/auth');
const diditService = require('../services/diditService');

/**
 * Get Didit.me settings
 * GET /admin/settings/didit
 */
router.get('/settings/didit', authUtils.ensureAdmin, async (req, res) => {
  try {
    const settings = await configModel.getDiditSettings();
    
    // Create a safe version of settings for display
    // Don't expose the full client secret
    const displaySettings = { ...settings };
    if (displaySettings.clientSecret) {
      displaySettings.clientSecret = '••••••••' + (displaySettings.clientSecret.slice(-4) || '');
    }
    
    res.json({
      settings: displaySettings,
      isValid: await diditService.validateConfig()
    });
  } catch (error) {
    console.error('Error getting Didit.me settings:', error);
    res.status(500).json({ error: 'Failed to get Didit.me settings' });
  }
});

/**
 * Update Didit.me settings
 * PUT /admin/settings/didit
 */
router.put('/settings/didit', authUtils.ensureAdmin, async (req, res) => {
  try {
    const { clientId, clientSecret, redirectUri, authUrl, tokenUrl, meUrl } = req.body;
    
    // Validate required fields
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    // Prepare settings object
    const settings = {
      clientId,
      redirectUri: redirectUri || process.env.DIDIT_REDIRECT_URI || 'http://localhost:3000/verification-callback',
      authUrl: authUrl || process.env.DIDIT_AUTH_URL || 'https://auth.didit.me/oauth/authorize',
      tokenUrl: tokenUrl || process.env.DIDIT_TOKEN_URL || 'https://auth.didit.me/oauth/token',
      meUrl: meUrl || process.env.DIDIT_ME_URL || 'https://api.didit.me/v1/me'
    };
    
    // Only update client secret if provided
    // This allows updating other settings without having to re-enter the secret
    if (clientSecret && clientSecret !== '••••••••' && !clientSecret.startsWith('••••••••')) {
      settings.clientSecret = clientSecret;
    }
    
    // Update settings
    await configModel.updateDiditSettings(settings);
    
    // Get updated settings
    const updatedSettings = await configModel.getDiditSettings();
    
    // Create a safe version of settings for display
    const displaySettings = { ...updatedSettings };
    if (displaySettings.clientSecret) {
      displaySettings.clientSecret = '••••••••' + (displaySettings.clientSecret.slice(-4) || '');
    }
    
    res.json({
      settings: displaySettings,
      isValid: await diditService.validateConfig(),
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating Didit.me settings:', error);
    res.status(500).json({ error: 'Failed to update Didit.me settings' });
  }
});

/**
 * Reset Didit.me settings to defaults
 * POST /admin/settings/didit/reset
 */
router.post('/settings/didit/reset', authUtils.ensureAdmin, async (req, res) => {
  try {
    await configModel.resetToDefaults();
    
    const settings = await configModel.getDiditSettings();
    
    // Create a safe version of settings for display
    const displaySettings = { ...settings };
    if (displaySettings.clientSecret) {
      displaySettings.clientSecret = '••••••••' + (displaySettings.clientSecret.slice(-4) || '');
    }
    
    res.json({
      settings: displaySettings,
      isValid: await diditService.validateConfig(),
      message: 'Settings reset to defaults'
    });
  } catch (error) {
    console.error('Error resetting Didit.me settings:', error);
    res.status(500).json({ error: 'Failed to reset Didit.me settings' });
  }
});

module.exports = router;