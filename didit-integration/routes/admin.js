/**
 * Admin routes for the Didit.me integration
 */
const express = require('express');
const router = express.Router();
const configModel = require('../models/config');
const authUtils = require('../utils/auth');
const diditService = require('../services/diditService');
const logger = require('../utils/logger');

/**
 * Get Didit.me configuration settings
 * GET /admin/settings/didit
 */
router.get('/settings/didit', authUtils.ensureAdmin, async (req, res) => {
  try {
    const settings = await configModel.getDiditConfig();
    const isValid = await diditService.isConfigValid();
    
    res.json({
      settings,
      isValid
    });
  } catch (error) {
    logger.error('Error getting Didit.me settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * Update Didit.me configuration settings
 * PUT /admin/settings/didit
 */
router.put('/settings/didit', authUtils.ensureAdmin, async (req, res) => {
  try {
    const diditConfig = req.body;
    
    // Validate required fields
    if (!diditConfig) {
      return res.status(400).json({ error: 'No configuration provided' });
    }
    
    // Update configuration
    const updatedSettings = await configModel.updateDiditConfig(diditConfig);
    
    // Check if the configuration is valid
    const isValid = !!(updatedSettings.clientId && updatedSettings.clientSecret);
    
    res.json({
      settings: updatedSettings,
      isValid
    });
  } catch (error) {
    logger.error('Error updating Didit.me settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * Reset Didit.me configuration to defaults
 * POST /admin/settings/didit/reset
 */
router.post('/settings/didit/reset', authUtils.ensureAdmin, async (req, res) => {
  try {
    const settings = await configModel.resetDiditConfig();
    const isValid = await diditService.isConfigValid();
    
    res.json({
      settings,
      isValid
    });
  } catch (error) {
    logger.error('Error resetting Didit.me settings:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

/**
 * Test Didit.me configuration
 * POST /admin/settings/didit/test
 */
router.post('/settings/didit/test', authUtils.ensureAdmin, async (req, res) => {
  try {
    // Check config validity
    const isValid = await diditService.isConfigValid();
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false,
        error: 'Configuration is incomplete or invalid'
      });
    }
    
    // Try to generate an authorization URL as a test
    const state = diditService.generateStateParam();
    const authUrl = await diditService.getAuthorizationUrl(state);
    
    if (!authUrl) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate authorization URL'
      });
    }
    
    // All good
    res.json({
      success: true,
      message: 'Didit.me configuration is valid',
      testUrl: authUrl
    });
  } catch (error) {
    logger.error('Error testing Didit.me configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Configuration test failed: ' + error.message
    });
  }
});

module.exports = router;