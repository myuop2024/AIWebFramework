/**
 * API Routes for the application
 */
const express = require('express');
const router = express.Router();
const userModel = require('../models/user');
const authUtils = require('../utils/auth');

/**
 * Get current user
 * GET /api/user
 */
router.get('/user', authUtils.ensureAuthenticated, async (req, res) => {
  try {
    const user = await userModel.getById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(authUtils.sanitizeUser(user));
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

/**
 * Create a new user (simplified registration for demo)
 * POST /api/user
 */
router.post('/user', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user already exists
    const existingUser = await userModel.getByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    // Create new user
    const newUser = await userModel.create({ email, name });
    
    // Set session
    req.session.userId = newUser.id;
    
    res.status(201).json(authUtils.sanitizeUser(newUser));
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Login user (simplified login for demo)
 * POST /api/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    let user = await userModel.getByEmail(email);
    
    // For demo purposes, create user if not found
    if (!user) {
      user = await userModel.create({ email });
    }
    
    // Set session
    req.session.userId = user.id;
    
    res.json(authUtils.sanitizeUser(user));
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

/**
 * Logout user
 * POST /api/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    
    res.json({ message: 'Logged out successfully' });
  });
});

/**
 * Admin login
 * POST /api/admin/login
 */
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Verify admin credentials
  if (authUtils.verifyAdminCredentials(username, password)) {
    req.session.isAdmin = true;
    return res.json({ message: 'Admin logged in successfully' });
  }
  
  res.status(401).json({ error: 'Invalid admin credentials' });
});

/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
router.get('/admin/users', authUtils.ensureAdmin, async (req, res) => {
  try {
    const users = await userModel.getAll();
    res.json(users.map(user => authUtils.sanitizeUser(user)));
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;