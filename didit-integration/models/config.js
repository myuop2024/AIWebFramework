/**
 * Configuration model for storing and retrieving Didit.me settings
 * This model stores settings in a JSON file using lowdb
 */
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs-extra');
const CryptoJS = require('crypto-js');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
fs.ensureDirSync(dataDir);

// Set up the database
const dbFile = path.join(dataDir, 'config.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Define default settings
const DEFAULT_SETTINGS = {
  didit: {
    clientId: process.env.DIDIT_CLIENT_ID || '',
    clientSecret: process.env.DIDIT_CLIENT_SECRET || '',
    redirectUri: process.env.DIDIT_REDIRECT_URI || 'http://localhost:3000/verification-callback',
    authUrl: process.env.DIDIT_AUTH_URL || 'https://auth.didit.me/oauth/authorize',
    tokenUrl: process.env.DIDIT_TOKEN_URL || 'https://auth.didit.me/oauth/token',
    meUrl: process.env.DIDIT_ME_URL || 'https://api.didit.me/v1/me'
  }
};

// Encryption/decryption helper functions
const encryptionKey = process.env.SESSION_SECRET || 'default-encryption-key';

const encrypt = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, encryptionKey).toString();
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};

// Initialize with default data if DB doesn't exist
const initializeDb = async () => {
  await db.read();
  if (!db.data) {
    db.data = DEFAULT_SETTINGS;
    
    // Encrypt sensitive information
    if (db.data.didit.clientSecret) {
      db.data.didit.clientSecret = encrypt(db.data.didit.clientSecret);
    }
    
    await db.write();
  }
};

// Call initialize right away
initializeDb();

/**
 * Config model methods
 */
const configModel = {
  /**
   * Get all settings
   * @returns {Object} All settings
   */
  async getAllSettings() {
    await db.read();
    
    // Create a copy of the settings
    const settings = JSON.parse(JSON.stringify(db.data));
    
    // Decrypt sensitive information for internal use
    if (settings.didit.clientSecret) {
      settings.didit.clientSecret = decrypt(settings.didit.clientSecret);
    }
    
    return settings;
  },
  
  /**
   * Get Didit.me settings
   * @returns {Object} Didit.me settings
   */
  async getDiditSettings() {
    await db.read();
    
    // Create a copy of the Didit settings
    const settings = JSON.parse(JSON.stringify(db.data.didit || {}));
    
    // Decrypt sensitive information for internal use
    if (settings.clientSecret) {
      settings.clientSecret = decrypt(settings.clientSecret);
    }
    
    return settings;
  },
  
  /**
   * Update Didit.me settings
   * @param {Object} settings - New settings
   * @returns {Object} Updated settings
   */
  async updateDiditSettings(settings) {
    await db.read();
    
    // Create a copy for updating
    const updatedSettings = { ...settings };
    
    // Encrypt sensitive information for storage
    if (updatedSettings.clientSecret) {
      updatedSettings.clientSecret = encrypt(updatedSettings.clientSecret);
    }
    
    // Update settings
    db.data.didit = {
      ...(db.data.didit || {}),
      ...updatedSettings
    };
    
    await db.write();
    
    // Return decrypted settings
    return await this.getDiditSettings();
  },
  
  /**
   * Reset settings to default values
   * @returns {Object} Default settings
   */
  async resetToDefaults() {
    db.data = DEFAULT_SETTINGS;
    
    // Encrypt sensitive information
    if (db.data.didit.clientSecret) {
      db.data.didit.clientSecret = encrypt(db.data.didit.clientSecret);
    }
    
    await db.write();
    return await this.getAllSettings();
  }
};

module.exports = configModel;