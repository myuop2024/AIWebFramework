/**
 * Authentication utilities for the application
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Authentication utilities
 */
const authUtils = {
  /**
   * Check if user is authenticated as an admin
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  ensureAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized - Admin access required' });
  },
  
  /**
   * Check if user is authenticated
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  ensureAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized - Authentication required' });
  },
  
  /**
   * Generate a random state value for OAuth
   * This prevents CSRF attacks during OAuth flow
   * 
   * @returns {string} Random state value
   */
  generateState() {
    return crypto.randomBytes(16).toString('hex');
  },
  
  /**
   * Hash a password
   * 
   * @param {string} password - The password to hash
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  },
  
  /**
   * Compare a password with a hash
   * 
   * @param {string} password - The password to check
   * @param {string} hash - The hash to compare against
   * @returns {Promise<boolean>} True if password matches
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  },
  
  /**
   * Verify admin credentials
   * 
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @returns {boolean} True if credentials are valid
   */
  verifyAdminCredentials(username, password) {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
    
    return username === adminUsername && password === adminPassword;
  },
  
  /**
   * Sanitize user object (remove sensitive data)
   * 
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    if (!user) return null;
    
    // Create a copy of the user object
    const sanitizedUser = { ...user };
    
    // Remove sensitive fields
    delete sanitizedUser.password;
    
    return sanitizedUser;
  }
};

module.exports = authUtils;