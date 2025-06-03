/**
 * Service for interacting with the Didit.me API
 */
const axios = require('axios');
const configModel = require('../models/config');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * DiditService handles all interactions with the Didit.me API
 */
class DiditService {
  /**
   * Get the current Didit.me configuration settings
   * @returns {Promise<Object>} The configuration object
   */
  async getConfig() {
    try {
      return await configModel.getDiditConfig();
    } catch (error) {
      logger.error('Error retrieving Didit config:', error);
      throw new Error('Failed to retrieve Didit.me configuration');
    }
  }

  /**
   * Check if the Didit.me configuration is complete and valid
   * @returns {Promise<boolean>} Whether the configuration is valid
   */
  async isConfigValid() {
    try {
      const config = await this.getConfig();
      return !!(config.clientId && config.clientSecret);
    } catch (error) {
      logger.error('Error checking Didit config validity:', error);
      return false;
    }
  }

  /**
   * Get the authorization URL for the OAuth2 flow
   * @param {string} state - The state parameter for CSRF protection
   * @returns {Promise<string>} The authorization URL
   */
  async getAuthorizationUrl(state) {
    try {
      const config = await this.getConfig();

      // Use default values if not provided in the config
      const authUrl = config.authUrl || 'https://auth.didit.me/oauth/authorize';
      const redirectUri = config.redirectUri || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/verification-callback`;

      if (!config.clientId) {
        throw new Error('Client ID is not configured');
      }

      // Build the authorization URL
      const url = new URL(authUrl);
      url.searchParams.append('client_id', config.clientId);
      url.searchParams.append('redirect_uri', redirectUri);
      url.searchParams.append('response_type', 'code');
      url.searchParams.append('scope', 'openid profile email');
      url.searchParams.append('state', state);

      return url.toString();
    } catch (error) {
      logger.error('Error generating authorization URL:', error);
      throw new Error('Failed to generate authorization URL: ' + error.message);
    }
  }

  /**
   * Exchange an authorization code for an access token
   * @param {string} code - The authorization code from Didit.me
   * @returns {Promise<Object>} The token response object
   */
  async exchangeCodeForToken(code, retries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const config = await this.getConfig();

        // Use default values if not provided in the config
        const tokenUrl = config.tokenUrl || 'https://auth.didit.me/oauth/token';
        const redirectUri = config.redirectUri || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/verification-callback`;

        if (!config.clientId || !config.clientSecret) {
          throw new Error('Client credentials are not fully configured');
        }

        // Exchange the code for a token with timeout
        const response = await axios.post(tokenUrl, {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: code,
          redirect_uri: redirectUri
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });

        if (!response.data?.access_token) {
          throw new Error('Invalid token response');
        }

        return response.data;
      } catch (error) {
        lastError = error;
        logger.error(`Token exchange attempt ${attempt} failed:`, error.response?.data || error.message);
        
        if (attempt < retries) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * attempt, 3000)));
          continue;
        }
      }
    }

    throw new Error(`Failed to exchange authorization code for token after ${retries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Get user verification data from Didit.me
   * @param {string} accessToken - The OAuth2 access token
   * @returns {Promise<Object>} The user verification data
   */
  async getUserVerificationData(accessToken) {
    try {
      const config = await this.getConfig();

      // Use default value if not provided in the config
      const meUrl = config.meUrl || 'https://api.didit.me/v1/me';

      // Get the user data
      const response = await axios.get(meUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      // Extract the verification data
      const userData = response.data;

      // Build a structured verification object
      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        verification_level: userData.verification_level || 'basic',
        verified_at: new Date().toISOString(),
        provider: 'didit.me',
        raw_data: userData
      };
    } catch (error) {
      logger.error('Error getting user verification data:', error.response?.data || error.message);
      throw new Error('Failed to retrieve user verification data');
    }
  }

  /**
   * Generate a cryptographically secure random string for state parameter
   * @returns {string} Random string
   */
  generateStateParam() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new DiditService();