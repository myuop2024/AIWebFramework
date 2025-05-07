/**
 * Authentication utilities
 */
const crypto = require('crypto');

/**
 * Middleware to ensure user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Handle API vs. page requests differently
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Redirect to login page
  res.redirect('/login');
};

/**
 * Middleware to ensure user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const ensureAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  
  // Handle API vs. page requests differently
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Redirect to admin login page
  res.redirect('/admin/settings');
};

/**
 * Generate a cryptographically secure random string for state parameter
 * @returns {string} Random string
 */
const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Remove sensitive information from user object before sending to client
 * @param {Object} user - The user object
 * @returns {Object} The sanitized user object
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  
  // Create a copy of the user object
  const sanitized = { ...user };
  
  // Remove sensitive fields if present
  delete sanitized.password;
  delete sanitized.passwordHash;
  
  // If verificationDetails exists, sanitize it too
  if (sanitized.verificationDetails && sanitized.verificationDetails.raw_data) {
    // Only include specific fields from raw_data
    const { id, name, email, verification_level } = sanitized.verificationDetails.raw_data;
    sanitized.verificationDetails.raw_data = { id, name, email, verification_level };
  }
  
  return sanitized;
};

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  generateState,
  sanitizeUser
};