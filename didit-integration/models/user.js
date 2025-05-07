/**
 * User model for storing and retrieving user information
 */
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// User data file path
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Admin credentials file path
const ADMIN_FILE = path.join(__dirname, '../data/admin.json');

// Default admin credentials
const DEFAULT_ADMIN = {
  username: 'admin',
  // This is a placeholder that should be changed in production
  passwordHash: '$2b$10$IrgJ8Gg9l2QsgXhCojf9IufqPkQEEn8o/7sHRN5PDC0uXuYBbBZuO', // Default: admin123
  isAdmin: true
};

/**
 * Ensure the users file exists with default values
 */
const ensureUserFiles = async () => {
  try {
    await fs.ensureDir(path.dirname(USERS_FILE));
    
    // Create the users file if it doesn't exist
    if (!await fs.pathExists(USERS_FILE)) {
      await fs.writeJson(USERS_FILE, [], { spaces: 2 });
      console.log('Created empty users file');
    }
    
    // Create the admin file if it doesn't exist
    if (!await fs.pathExists(ADMIN_FILE)) {
      await fs.writeJson(ADMIN_FILE, DEFAULT_ADMIN, { spaces: 2 });
      console.log('Created default admin credentials');
    }
  } catch (error) {
    console.error('Error ensuring user files exist:', error);
    throw error;
  }
};

// Make sure the user files exist
ensureUserFiles().catch(err => {
  console.error('Failed to initialize user data:', err);
});

/**
 * Get all users
 * @returns {Promise<Array>} Array of users
 */
const getAllUsers = async () => {
  try {
    await ensureUserFiles();
    return await fs.readJson(USERS_FILE);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

/**
 * Get a user by ID
 * @param {string} id - The user ID
 * @returns {Promise<Object|null>} The user object or null if not found
 */
const getById = async (id) => {
  try {
    const users = await getAllUsers();
    return users.find(user => user.id === id) || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

/**
 * Get a user by email
 * @param {string} email - The user email
 * @returns {Promise<Object|null>} The user object or null if not found
 */
const getByEmail = async (email) => {
  try {
    const users = await getAllUsers();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

/**
 * Create a new user
 * @param {Object} userData - The user data
 * @returns {Promise<Object>} The created user
 */
const createUser = async (userData) => {
  try {
    const users = await getAllUsers();
    
    // Check if user already exists
    const existingUser = await getByEmail(userData.email);
    if (existingUser) {
      // Return existing user if found
      return existingUser;
    }
    
    // Create new user
    const newUser = {
      id: uuidv4(),
      email: userData.email,
      name: userData.name || '',
      created: new Date().toISOString(),
      verified: false,
      verificationDetails: null
    };
    
    // Add to users array
    users.push(newUser);
    
    // Save updated users
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
};

/**
 * Update a user's verification data
 * @param {string} userId - The user ID
 * @param {Object} verificationData - The verification data from Didit.me
 * @returns {Promise<Object>} The updated user
 */
const updateVerification = async (userId, verificationData) => {
  try {
    const users = await getAllUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Update user verification
    users[userIndex].verified = true;
    users[userIndex].verificationDetails = verificationData;
    users[userIndex].updated = new Date().toISOString();
    
    // Save updated users
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    
    return users[userIndex];
  } catch (error) {
    console.error('Error updating user verification:', error);
    throw new Error('Failed to update user verification');
  }
};

/**
 * Verify admin credentials
 * @param {string} username - The admin username
 * @param {string} password - The admin password
 * @returns {Promise<boolean>} Whether the credentials are valid
 */
const verifyAdminCredentials = async (username, password) => {
  try {
    await ensureUserFiles();
    const adminData = await fs.readJson(ADMIN_FILE);
    
    if (adminData.username !== username) {
      return false;
    }
    
    return await bcrypt.compare(password, adminData.passwordHash);
  } catch (error) {
    console.error('Error verifying admin credentials:', error);
    return false;
  }
};

/**
 * Update admin credentials
 * @param {Object} adminData - The new admin data
 * @returns {Promise<boolean>} Whether the update was successful
 */
const updateAdminCredentials = async (adminData) => {
  try {
    await ensureUserFiles();
    const currentAdmin = await fs.readJson(ADMIN_FILE);
    
    // Update username if provided
    if (adminData.username) {
      currentAdmin.username = adminData.username;
    }
    
    // Update password if provided
    if (adminData.password) {
      const saltRounds = 10;
      currentAdmin.passwordHash = await bcrypt.hash(adminData.password, saltRounds);
    }
    
    // Save updated admin data
    await fs.writeJson(ADMIN_FILE, currentAdmin, { spaces: 2 });
    
    return true;
  } catch (error) {
    console.error('Error updating admin credentials:', error);
    return false;
  }
};

module.exports = {
  getAllUsers,
  getById,
  getByEmail,
  createUser,
  updateVerification,
  verifyAdminCredentials,
  updateAdminCredentials
};