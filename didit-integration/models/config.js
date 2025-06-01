/**
 * Configuration model for storing and retrieving app settings
 */
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto-js');

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
      console.log('Created default configuration file with Didit settings.');
    }
  } catch (error) {
    console.error('Error ensuring config file exists:', error);
    throw error;
  }
};

// Make sure the config file exists
ensureConfigFile().catch(err => {
  console.error('Failed to initialize configuration:', err);
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
      throw new Error('CRITICAL: DIDIT_CONFIG_ENCRYPTION_KEY environment variable is not set in production.');
    } else {
      // Fallback to a hardcoded key ONLY in non-production environments and log a very loud warning.
      // This is still insecure but prevents complete breakage in a local dev setup if the env var is forgotten.
      // A truly secure approach would be to require it always, or use a dev-specific fixed key known not to be secure.
      console.warn('WARNING: DIDIT_CONFIG_ENCRYPTION_KEY is not set. Using a default, insecure key for development. DO NOT USE THIS IN PRODUCTION.');
      return 'default_insecure_dev_key_32bytes!'; // Ensure this is 32 bytes for AES-256 if used directly, though CryptoJS handles various lengths.
    }
  }
  if (key.length < 32 && process.env.NODE_ENV === 'production') {
     // Basic check, though CryptoJS might derive a key. For production, enforce strong key practices.
     console.warn('WARNING: DIDIT_CONFIG_ENCRYPTION_KEY should ideally be a 32-byte (256-bit) string for maximum security.');
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
    console.error('Encryption error:', error);
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
    console.error('Decryption error:', error);
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
    console.error('Error reading config file:', error);
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
        console.warn('Could not decrypt client secret, it might not be encrypted');
      }
    }
    
    return config.didit;
  } catch (error) {
    console.error('Error reading Didit.me config:', error);
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
        console.warn('Could not decrypt client secret for response');
      }
    }
    
    return config.didit;
  } catch (error) {
    console.error('Error updating Didit.me config:', error);
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
    console.error('Error resetting Didit.me config:', error);
    throw new Error('Failed to reset configuration');
  }
};

module.exports = {
  getConfig,
  getDiditConfig,
  updateDiditConfig,
  resetDiditConfig
};