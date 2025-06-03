/**
 * API routes for the Didit.me integration
 */
const express = require('express');
const router = express.Router();
const userModel = require('../models/user');
const authUtils = require('../utils/auth');
const logger = require('../utils/logger');

/**
 * User login/registration endpoint
 * POST /api/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Create or get existing user by email
    const user = await userModel.createUser({ email, name });
    
    // Set session
    req.session.userId = user.id;
    
    // Return sanitized user data
    res.json({
      success: true,
      user: authUtils.sanitizeUser(user)
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Admin login endpoint
 * POST /api/admin/login
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Verify admin credentials
    const isValid = await userModel.verifyAdminCredentials(username, password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set admin session
    req.session.isAdmin = true;
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
router.get('/admin/users', authUtils.ensureAdmin, async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    
    // Return sanitized users data
    res.json(users.map(user => authUtils.sanitizeUser(user)));
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * User logout endpoint
 * POST /api/logout
 */
router.post('/logout', (req, res) => {
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.json({ success: true });
  });
});

module.exports = router;