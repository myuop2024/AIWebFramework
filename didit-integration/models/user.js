/**
 * User model for the Didit.me integration
 * This is a simple in-memory model using lowdb
 */
const { v4: uuidv4 } = require('uuid');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs-extra');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
fs.ensureDirSync(dataDir);

// Set up the database with default empty users array
const dbFile = path.join(dataDir, 'users.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Initialize with default data if DB doesn't exist
const initializeDb = async () => {
  await db.read();
  db.data ||= { users: [] };
  await db.write();
};

// Call initialize right away
initializeDb();

/**
 * User model methods
 */
const userModel = {
  /**
   * Get all users
   * @returns {Array} Array of user objects
   */
  async getAll() {
    await db.read();
    return db.data.users;
  },
  
  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Object|null} User object or null if not found
   */
  async getById(id) {
    await db.read();
    return db.data.users.find(user => user.id === id) || null;
  },
  
  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Object|null} User object or null if not found
   */
  async getByEmail(email) {
    await db.read();
    return db.data.users.find(user => user.email === email) || null;
  },
  
  /**
   * Create a new user
   * @param {Object} userData - User data (email, name, etc.)
   * @returns {Object} Created user object
   */
  async create(userData) {
    await db.read();
    
    const newUser = {
      id: uuidv4(),
      email: userData.email,
      name: userData.name || '',
      verified: false,
      verificationDetails: null,
      diditId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...userData
    };
    
    db.data.users.push(newUser);
    await db.write();
    
    return newUser;
  },
  
  /**
   * Update a user
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated user or null if not found
   */
  async update(id, updates) {
    await db.read();
    
    const userIndex = db.data.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    const updatedUser = {
      ...db.data.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    db.data.users[userIndex] = updatedUser;
    await db.write();
    
    return updatedUser;
  },
  
  /**
   * Update user's verification status based on Didit.me response
   * @param {string} userId - User ID
   * @param {Object} verificationData - Data from Didit.me verification
   * @returns {Object|null} Updated user or null if not found
   */
  async updateVerification(userId, verificationData) {
    await db.read();
    
    const userIndex = db.data.users.findIndex(user => user.id === userId);
    if (userIndex === -1) return null;
    
    const updatedUser = {
      ...db.data.users[userIndex],
      verified: true,
      verificationDetails: verificationData,
      diditId: verificationData.id,
      updatedAt: new Date().toISOString()
    };
    
    db.data.users[userIndex] = updatedUser;
    await db.write();
    
    return updatedUser;
  },
  
  /**
   * Delete a user
   * @param {string} id - User ID
   * @returns {boolean} True if deleted, false if not found
   */
  async delete(id) {
    await db.read();
    
    const initialLength = db.data.users.length;
    db.data.users = db.data.users.filter(user => user.id !== id);
    
    if (db.data.users.length < initialLength) {
      await db.write();
      return true;
    }
    
    return false;
  }
};

module.exports = userModel;