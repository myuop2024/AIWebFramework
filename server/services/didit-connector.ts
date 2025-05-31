import axios from 'axios';
import crypto from 'crypto';
import { storage } from '../storage';
import logger from '../utils/logger';
import { DiditVerificationRecord, DiditSession } from '../models/didit'; // Assuming these models exist or will be adapted

/**
 * Configuration interface for Didit service
 */
interface DiditConfig {
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string; // For API like /me e.g. https://api.didit.me/v1
  authUrl?: string; // For /oauth/authorize e.g. https://auth.didit.me/oauth/authorize
  tokenUrl?: string; // For /oauth/token e.g. https://auth.didit.me/oauth/token
  enabled?: boolean;
}

/**
 * DiditConnector class handles interaction with the Didit.me identity verification service
 */
class DiditConnector {
  private config: DiditConfig = {
    baseUrl: process.env.DIDIT_API_URL || 'https://api.didit.me/v1',
    authUrl: 'https://auth.didit.me/oauth/authorize',
    tokenUrl: 'https://auth.didit.me/oauth/token',
    enabled: false
  };
  
  private initialized = false;
  private static instance: DiditConnector;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): DiditConnector {
    if (!DiditConnector.instance) {
      DiditConnector.instance = new DiditConnector();
    }
    return DiditConnector.instance;
  }

  /**
   * Initialize configuration from system settings
   */
  public async initializeConfig(): Promise<void> {
    try {
      // if (this.initialized) return; // Allow re-initialization if settings change
      
      const clientIdSetting = await storage.getSystemSetting('didit_client_id');
      const clientSecretSetting = await storage.getSystemSetting('didit_client_secret');
      const baseUrlSetting = await storage.getSystemSetting('didit_base_url');
      const authUrlSetting = await storage.getSystemSetting('didit_auth_url');
      const tokenUrlSetting = await storage.getSystemSetting('didit_token_url');
      const enabledSetting = await storage.getSystemSetting('didit_enabled');
      
      this.config.clientId = clientIdSetting?.settingValue || process.env.DIDIT_CLIENT_ID;
      this.config.clientSecret = clientSecretSetting?.settingValue || process.env.DIDIT_CLIENT_SECRET;
      this.config.baseUrl = baseUrlSetting?.settingValue || process.env.DIDIT_API_URL || 'https://api.didit.me/v1';
      this.config.authUrl = authUrlSetting?.settingValue || 'https://auth.didit.me/oauth/authorize';
      this.config.tokenUrl = tokenUrlSetting?.settingValue || 'https://auth.didit.me/oauth/token';
      this.config.enabled = enabledSetting?.settingValue === 'true' || false;
      
      this.initialized = true;
      logger.info('Didit connector initialized with config', {
        clientIdPresent: !!this.config.clientId,
        baseUrl: this.config.baseUrl,
        authUrl: this.config.authUrl,
        tokenUrl: this.config.tokenUrl,
        enabled: this.config.enabled
      });
    } catch (error) {
      logger.error('Failed to initialize Didit configuration', { error: error instanceof Error ? error : new Error(String(error)) });
      this.config.enabled = false; // Ensure it's disabled on error
      // throw error; // Propagate error if needed, or handle gracefully
    }
  }

  /**
   * Update configuration with new values
   */
  public async updateConfig(newConfig: Partial<DiditConfig>): Promise<void> {
    // Preserve existing values if not provided in newConfig, then re-initialize
    // const oldConfig = { ...this.config }; // oldConfig not used
    this.config = { ...this.config, ...newConfig };

    // Typically, system settings are the source of truth, so this method might just trigger a re-read
    // For direct updates (e.g. tests or dynamic changes not via DB settings):
    logger.info('Didit configuration updated directly. For persistent changes, update system settings.', {
        clientIdPresent: !!this.config.clientId,
        baseUrl: this.config.baseUrl,
        authUrl: this.config.authUrl,
        tokenUrl: this.config.tokenUrl,
        enabled: this.config.enabled
    });
    // If newConfig implies a change in settings that would be fetched by initializeConfig,
    // you might want to call initializeConfig again or ensure settings are written back to storage.
    // For this refactor, we assume updateConfig is for runtime adjustments or tests.
    // If it should persist, the calling code should handle storage.updateSystemSetting.
  }

  public getAuthorizationUrl(state: string, callbackUrl: string): string {
    if (!this.config.clientId) {
      throw new Error('Didit Client ID is not configured.');
    }
    if (!this.config.authUrl) {
      throw new Error('Didit Auth URL is not configured.');
    }

    const url = new URL(this.config.authUrl);
    url.searchParams.append('client_id', this.config.clientId);
    url.searchParams.append('redirect_uri', callbackUrl);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', 'openid profile email'); // Standard OIDC scopes
    url.searchParams.append('state', state);
    return url.toString();
  }

  async exchangeCodeForToken(code: string, callbackUrl: string): Promise<any> {
    await this.initializeConfig(); // Ensure config is loaded
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Didit Client ID or Secret is not configured.');
    }
    if (!this.config.tokenUrl) {
      throw new Error('Didit Token URL is not configured.');
    }

    try {
      const response = await axios.post(this.config.tokenUrl, {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: callbackUrl
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.data?.access_token) {
        throw new Error('Invalid token response from Didit.me');
      }
      return response.data; // Contains access_token, id_token, etc.
    } catch (error: any) {
      logger.error('Error exchanging code for token with Didit.me', {
        message: error.message,
        responseData: error.response?.data
      });
      throw new Error(`Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  async getUserVerificationData(accessToken: string): Promise<any> {
    await this.initializeConfig(); // Ensure config is loaded
    if (!this.config.baseUrl) {
      throw new Error('Didit API Base URL is not configured.');
    }
    // Standard OIDC UserInfo endpoint is typically /userinfo, Didit might use /me or similar
    const userInfoUrl = `${this.config.baseUrl}/me`;

    try {
      const response = await axios.get(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      const userData = response.data;
      return { // Adapt this structure based on actual Didit.me response and application needs
        id: userData.id || userData.sub,
        name: userData.name,
        email: userData.email,
        email_verified: userData.email_verified,
        profile: userData.profile,
        raw_data: userData
      };
    } catch (error: any) {
      logger.error('Error fetching user data from Didit.me', {
        message: error.message,
        responseData: error.response?.data
      });
      throw new Error(`Failed to retrieve user verification data: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Test connection to the Didit API
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    await this.initializeConfig();

    if (!this.config.enabled) {
      return { success: false, message: 'Didit integration is currently disabled.' };
    }
    const requiredConfigs = ['clientId', 'clientSecret', 'baseUrl', 'authUrl', 'tokenUrl'];
    for (const key of requiredConfigs) {
      if (!this.config[key as keyof DiditConfig]) {
        return { success: false, message: `Didit configuration missing: ${key}. Please configure it in admin settings.` };
      }
    }

    try {
      let urlToTest = this.config.authUrl!;
      if (this.config.authUrl!.includes('/authorize')) {
        try {
            const wellKnownUrl = this.config.authUrl!.replace('/authorize', '/.well-known/openid-configuration');
            const wellKnownResponse = await axios.head(wellKnownUrl, { timeout: 5000 });
            if (wellKnownResponse.status >= 200 && wellKnownResponse.status < 500) {
                urlToTest = wellKnownUrl;
            }
        } catch (e) {
            logger.warn('Didit .well-known/openid-configuration endpoint not found or failed, testing authUrl directly.', { authUrl: this.config.authUrl, error: e instanceof Error ? e.message : String(e) });
        }
      }
      
      const response = await axios.head(urlToTest, { timeout: 5000 });
      if (response.status >= 200 && response.status < 500) {
        return { success: true, message: `Didit configuration appears valid and Auth URL (${urlToTest}) is reachable.` };
      }
      return { success: false, message: `Auth URL (${urlToTest}) returned status ${response.status}.`};
    } catch (error: any) {
      logger.error('Error testing Didit connection (Auth URL reachability test)', {
        errorMessage: error.message,
        authUrl: this.config.authUrl
      });
      return { success: false, message: `Failed to reach Auth URL (${this.config.authUrl}): ${error.message}. Check network/DNS.` };
    }
  }

  public async startVerification(state: string, callbackUrl: string): Promise<string> {
    await this.initializeConfig();
    if (!this.config.enabled) {
      throw new Error('Didit integration is not enabled.');
    }
    if (!this.config.clientId) {
      throw new Error('Didit Client ID is not configured.');
    }
    if (!state) {
      throw new Error('State parameter is required to start verification.');
    }
    if (!callbackUrl) {
      throw new Error('Callback URL is required.');
    }
    const authorizationUrl = this.getAuthorizationUrl(state, callbackUrl);
    logger.info('Generated Didit authorization URL', { url: authorizationUrl });
    return authorizationUrl;
  }

  public async checkVerificationStatus(state: string): Promise<{ status: string; details?: any }> {
    await this.initializeConfig();
    if (!this.config.enabled) {
      throw new Error('Didit integration is not enabled.');
    }
    logger.warn('checkVerificationStatus is called, but its role in OAuth flow is unclear. Returning mock status.', { state });

    const session = await storage.getDiditSessionByState(state);
    if (session && session.access_token && session.user_profile) {
      return { status: 'completed', details: JSON.parse(session.user_profile as string || '{}') };
    }
    if (session && session.access_token && !session.user_profile) {
      return { status: 'token_exchanged_pending_user_data', details: { message: "Access token obtained, user data fetch pending." } };
    }
    if (session && session.auth_code) {
       return { status: 'code_received_pending_token', details: { message: "Authorization code received, pending token exchange." } };
    }
    if (session) {
      return { status: 'pending_callback', details: {message: "Authorization URL generated, awaiting callback."}};
    }
    return { status: 'unknown_or_not_started', details: { message: "No active Didit session found for this state." } };
  }

  public async getVerificationDetails(state: string): Promise<DiditVerificationRecord | null> {
    await this.initializeConfig();
    if (!this.config.enabled) {
      throw new Error('Didit integration is not enabled.');
    }
    logger.info('Attempting to get verification details (user data stored in session)', { state });
    
    const session = await storage.getDiditSessionByState(state);

    if (session && session.user_profile) {
      const profile = typeof session.user_profile === 'string' ? JSON.parse(session.user_profile) : session.user_profile;

      const record: DiditVerificationRecord = {
        state: session.state,
        status: 'completed',
        didit_user_id: profile.id || profile.sub,
        user_profile: profile,
        created_at: session.created_at ? new Date(session.created_at) : new Date(),
        updated_at: session.updated_at ? new Date(session.updated_at) : new Date(),
      };
      return record;
    }

    logger.warn('No user profile / verification details found in session for state', { state });
    return null;
  }

  public isEnabled(): boolean {
    if (!this.initialized) {
        logger.warn("Checking isEnabled before DiditConnector is fully initialized. Config might be stale.");
    }
    return !!this.config.enabled;
  }
}

export const diditConnector = DiditConnector.getInstance();