/**
 * Verification routes for integrating with Didit.me
 */
const express = require('express');
const router = express.Router();
const authUtils = require('../utils/auth');
const diditService = require('../services/diditService');
const userModel = require('../models/user');

/**
 * Start verification process
 * GET /start-verification
 */
router.get('/start-verification', authUtils.ensureAuthenticated, async (req, res) => {
  try {
    // Generate state parameter for security
    const state = authUtils.generateState();
    
    // Store state in session for verification
    req.session.oauthState = state;
    req.session.oauthStateTimestamp = Date.now();
    
    // Get the authorization URL
    const authUrl = await diditService.getAuthorizationUrl(state);
    
    // Redirect user to Didit.me
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error starting verification process:', error);
    res.status(500).render('error', { 
      error: 'Failed to start verification process', 
      details: error.message 
    });
  }
});

/**
 * Handle the callback from Didit.me
 * GET /verification-callback
 */
router.get('/verification-callback', authUtils.ensureAuthenticated, async (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  // Handle errors from Didit.me
  if (error) {
    console.error('Didit.me returned an error:', error, error_description);
    return res.status(400).render('verification-result', { 
      success: false,
      error: 'Verification failed',
      details: error_description || error
    });
  }
  
  // Validate the state parameter to prevent CSRF
  if (!state || state !== req.session.oauthState) {
    console.error('Invalid OAuth state parameter');
    return res.status(400).render('verification-result', { 
      success: false,
      error: 'Invalid verification request',
      details: 'Security verification failed'
    });
  }
  
  // Validate state timestamp (expire after 15 minutes)
  const stateAge = Date.now() - (req.session.oauthStateTimestamp || 0);
  if (stateAge > 15 * 60 * 1000) {
    console.error('OAuth state parameter expired');
    return res.status(400).render('verification-result', { 
      success: false,
      error: 'Verification request expired',
      details: 'The verification session has expired. Please try again.'
    });
  }
  
  // Clean up session state
  delete req.session.oauthState;
  delete req.session.oauthStateTimestamp;
  
  try {
    // Exchange code for access token
    const tokenResponse = await diditService.exchangeCodeForToken(code);
    
    // Get user verification data from Didit.me
    const userData = await diditService.getUserVerificationData(tokenResponse.access_token);
    
    // Update user with verification data
    const updatedUser = await userModel.updateVerification(req.session.userId, userData);
    
    // Render success page
    res.render('verification-result', { 
      success: true,
      user: authUtils.sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error('Error completing verification process:', error);
    res.status(500).render('verification-result', { 
      success: false,
      error: 'Verification failed',
      details: error.message
    });
  }
});

/**
 * Check verification status
 * GET /verification-status
 */
router.get('/verification-status', authUtils.ensureAuthenticated, async (req, res) => {
  try {
    const user = await userModel.getById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      verified: user.verified || false,
      verificationDetails: user.verificationDetails || null
    });
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({ error: 'Failed to get verification status' });
  }
});

module.exports = router;