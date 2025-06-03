/**
 * Configuration model for storing and retrieving app settings
 */
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto-js');
const logger = require('../utils/logger');

// Configuration file path
const CONFIG_FILE = path.join(__dirname, '../data/config.json');

// Default configuration values
const DEFAULT_CONFIG = {
  didit: {
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:3001/verification-callback',
    authUrl: 'https://auth.didit.me/oauth/authorize',
    tokenUrl: 'https://auth.didit.me/oauth/token',
    meUrl: 'https://api.didit.me/v1/me'
  }
  // security.encryptionKey is removed from here and sourced from environment
};

/**
 * Ensure the config file exists with default values
 */
const ensureConfigFile = async () => {
  try {
    await fs.ensureDir(path.dirname(CONFIG_FILE));
    
    // Create the file if it doesn't exist
    if (!await fs.pathExists(CONFIG_FILE)) {
      // Only write default didit settings, not the security key
      const initialConfig = { didit: DEFAULT_CONFIG.didit };
      await fs.writeJson(CONFIG_FILE, initialConfig, { spaces: 2 });
      logger.info('Created default configuration file with Didit settings.');
    }
  } catch (error) {
    logger.error('Error ensuring config file exists:', error);
    throw error;
  }
};

// Make sure the config file exists
ensureConfigFile().catch(err => {
  logger.error('Failed to initialize configuration:', err);
});

/**
 * Encrypt sensitive data before storing
 * @param {string} value - The value to encrypt
 * @returns {string} The encrypted value
 */
const getEncryptionKey = () => {
  const key = process.env.DIDIT_CONFIG_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: DIDIT_CONFIG_ENCRYPTION_KEY environment variable is not set in production. It must be a 32-byte (256-bit) string.');
    } else {
      logger.warn('WARNING: DIDIT_CONFIG_ENCRYPTION_KEY is not set. Using a default, insecure key for development. DO NOT USE THIS IN PRODUCTION.');
      return 'default_insecure_dev_key_32bytes!';
    }
  }
  if (process.env.NODE_ENV === 'production' && key.length !== 32) {
    throw new Error('CRITICAL: DIDIT_CONFIG_ENCRYPTION_KEY must be exactly 32 bytes (256 bits) in production. Current length: ' + key.length);
  }
  if (process.env.NODE_ENV !== 'production' && key.length !== 32) {
    logger.warn('WARNING: DIDIT_CONFIG_ENCRYPTION_KEY should be exactly 32 bytes (256 bits) for maximum security. Current length: ' + key.length);
  }
  return key;
};

const encryptValue = async (value) => {
  try {
    const encryptionKey = getEncryptionKey();
    if (!value) return '';
    
    return crypto.AES.encrypt(
      value.toString(), 
      encryptionKey
    ).toString();
  } catch (error) {
    logger.error('Encryption error:', error);
    return '';
  }
};

/**
 * Decrypt sensitive data after retrieving
 * @param {string} encryptedValue - The encrypted value
 * @returns {string} The decrypted value
 */
const decryptValue = async (encryptedValue) => {
  try {
    const encryptionKey = getEncryptionKey();
    if (!encryptedValue) return '';
    
    const bytes = crypto.AES.decrypt(
      encryptedValue.toString(), 
      encryptionKey
    );
    return bytes.toString(crypto.enc.Utf8);
  } catch (error) {
    logger.error('Decryption error:', error);
    return '';
  }
};

/**
 * Get all configuration settings
 * @returns {Promise<Object>} The configuration object
 */
const getConfig = async () => {
  try {
    await ensureConfigFile();
    return await fs.readJson(CONFIG_FILE);
  } catch (error) {
    logger.error('Error reading config file:', error);
    return DEFAULT_CONFIG;
  }
};

/**
 * Get Didit.me configuration settings
 * @returns {Promise<Object>} The Didit.me configuration
 */
const getDiditConfig = async () => {
  try {
    const config = await getConfig();
    
    // Decrypt sensitive values
    if (config.didit.clientSecret) {
      try {
        config.didit.clientSecret = await decryptValue(config.didit.clientSecret);
      } catch (e) {
        // If decryption fails, it might not be encrypted yet
        logger.warn('Could not decrypt client secret, it might not be encrypted');
      }
    }
    
    return config.didit;
  } catch (error) {
    logger.error('Error reading Didit.me config:', error);
    return DEFAULT_CONFIG.didit;
  }
};

/**
 * Update Didit.me configuration settings
 * @param {Object} diditConfig - The new Didit.me configuration
 * @returns {Promise<Object>} The updated configuration
 */
const updateDiditConfig = async (diditConfig) => {
  try {
    const config = await getConfig();
    
    // Encrypt sensitive values
    if (diditConfig.clientSecret) {
      diditConfig.clientSecret = await encryptValue(diditConfig.clientSecret);
    }
    
    // Update configuration
    config.didit = {
      ...config.didit,
      ...diditConfig
    };
    
    // Save updated configuration
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
    
    // Return decrypted version for API response
    if (config.didit.clientSecret) {
      try {
        config.didit.clientSecret = await decryptValue(config.didit.clientSecret);
      } catch (e) {
        logger.warn('Could not decrypt client secret for response');
      }
    }
    
    return config.didit;
  } catch (error) {
    logger.error('Error updating Didit.me config:', error);
    throw new Error('Failed to update configuration');
  }
};

/**
 * Reset Didit.me configuration to defaults
 * @returns {Promise<Object>} The default configuration
 */
const resetDiditConfig = async () => {
  try {
    const config = await getConfig();
    
    // Reset to defaults
    config.didit = { ...DEFAULT_CONFIG.didit };
    
    // Save updated configuration
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
    
    return config.didit;
  } catch (error) {
    logger.error('Error resetting Didit.me config:', error);
    throw new Error('Failed to reset configuration');
  }
};

module.exports = {
  getConfig,
  getDiditConfig,
  updateDiditConfig,
  resetDiditConfig
};