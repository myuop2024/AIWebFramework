/**
 * Didit.me integration service
 * Handles communication with the Didit.me API
 */
const axios = require('axios');
const configModel = require('../models/config');
const { URL } = require('url');
const querystring = require('querystring');

/**
 * Didit.me service for handling OAuth flow and API calls
 */
const diditService = {
  /**
   * Generate the authorization URL to redirect users for Didit.me verification
   * 
   * @param {string} state - A random string to validate the callback 
   * @returns {string} The complete URL to redirect users to
   */
  async getAuthorizationUrl(state) {
    try {
      const settings = await configModel.getDiditSettings();
      
      // Validate required settings
      if (!settings.clientId || !settings.redirectUri || !settings.authUrl) {
        throw new Error('Missing required Didit.me configuration. Check settings in admin panel.');
      }
      
      // Construct the auth URL with required parameters
      const url = new URL(settings.authUrl);
      
      // Add query parameters
      url.searchParams.append('client_id', settings.clientId);
      url.searchParams.append('redirect_uri', settings.redirectUri);
      url.searchParams.append('response_type', 'code');
      url.searchParams.append('state', state);
      
      return url.toString();
    } catch (error) {
      console.error('Error generating authorization URL:', error);
      throw error;
    }
  },
  
  /**
   * Exchange an authorization code for an access token
   * 
   * @param {string} code - The authorization code from the OAuth callback
   * @returns {Object} Token response with access_token, token_type, etc.
   */
  async exchangeCodeForToken(code) {
    try {
      const settings = await configModel.getDiditSettings();
      
      // Validate required settings
      if (!settings.clientId || !settings.clientSecret || !settings.redirectUri || !settings.tokenUrl) {
        throw new Error('Missing required Didit.me configuration. Check settings in admin panel.');
      }
      
      // Prepare request data
      const data = {
        grant_type: 'authorization_code',
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        code: code,
        redirect_uri: settings.redirectUri
      };
      
      // Make the token request
      const response = await axios.post(settings.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Didit.me: ' + (error.response?.data?.error_description || error.message));
    }
  },
  
  /**
   * Get user verification data from Didit.me
   * 
   * @param {string} accessToken - The OAuth access token
   * @returns {Object} User verification details from Didit.me
   */
  async getUserVerificationData(accessToken) {
    try {
      const settings = await configModel.getDiditSettings();
      
      // Validate required settings
      if (!settings.meUrl) {
        throw new Error('Missing required Didit.me configuration. Check settings in admin panel.');
      }
      
      // Make the API request to get user data
      const response = await axios.get(settings.meUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting user verification data:', error.response?.data || error.message);
      throw new Error('Failed to get verification data from Didit.me: ' + (error.response?.data?.error || error.message));
    }
  },
  
  /**
   * Validate the configuration is complete and valid
   * 
   * @returns {boolean} True if configuration is valid
   */
  async validateConfig() {
    try {
      const settings = await configModel.getDiditSettings();
      
      return !!(
        settings.clientId && 
        settings.clientSecret && 
        settings.redirectUri && 
        settings.authUrl && 
        settings.tokenUrl && 
        settings.meUrl
      );
    } catch (error) {
      console.error('Error validating config:', error);
      return false;
    }
  }
};

module.exports = diditService;