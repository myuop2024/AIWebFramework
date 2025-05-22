import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import path from 'path';
import { storage } from '../storage';
import { logger } from '../utils/logger';

/**
 * Configuration interface for Didit service
 */
interface DiditConfig {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  enabled?: boolean;
}

/**
 * DiditConnector class handles interaction with the Didit.me identity verification service
 */
class DiditConnector {
  private config: DiditConfig = {
    apiKey: '',
    apiSecret: '',
    baseUrl: process.env.DIDIT_API_URL || 'https://api.didit.me/v1',
    enabled: false
  };
  
  private serverProcess: ChildProcess | null = null;
  private serverRunning = false;
  private initialized = false;

  constructor() {
    // We'll initialize later from system settings
  }

  /**
   * Initialize configuration from system settings
   */
  async initializeConfig(): Promise<void> {
    try {
      if (this.initialized) return;
      
      const apiKeySetting = await storage.getSystemSetting('didit_api_key');
      const apiSecretSetting = await storage.getSystemSetting('didit_api_secret');
      const baseUrlSetting = await storage.getSystemSetting('didit_base_url');
      const enabledSetting = await storage.getSystemSetting('didit_enabled');
      
      this.config = {
        apiKey: apiKeySetting?.settingValue,
        apiSecret: apiSecretSetting?.settingValue,
        baseUrl: baseUrlSetting?.settingValue || process.env.DIDIT_API_URL || 'https://api.didit.me/v1',
        enabled: enabledSetting?.settingValue || false
      };
      
      this.initialized = true;
      console.log('Didit connector initialized with config:', {
        apiKeyPresent: !!this.config.apiKey,
        apiSecretPresent: !!this.config.apiSecret,
        baseUrl: this.config.baseUrl,
        enabled: this.config.enabled
      });
    } catch (error) {
      console.error('Error initializing Didit configuration:', error);
      throw error;
    }
  }

  /**
   * Update configuration with new values
   */
  updateConfig(newConfig: DiditConfig): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Didit configuration updated:', {
      apiKeyPresent: !!this.config.apiKey,
      apiSecretPresent: !!this.config.apiSecret,
      baseUrl: this.config.baseUrl,
      enabled: this.config.enabled
    });
  }

  /**
   * Test connection to the Didit API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config.apiKey || !this.config.apiSecret) {
        return {
          success: false,
          message: 'API credentials are not configured. Please provide both API key and secret.'
        };
      }

      if (!this.config.enabled) {
        return {
          success: false,
          message: 'Didit integration is currently disabled. Enable it to test the connection.'
        };
      }

      // Test connection by making a real API call
      const testUrl = `${this.config.baseUrl}/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Secret': this.config.apiSecret,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      // Validate the credentials with auth endpoint
      const authUrl = `${this.config.baseUrl}/auth/validate`;
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Secret': this.config.apiSecret,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!authResponse.ok) {
        throw new Error('Invalid credentials');
      }
      
      return {
        success: true,
        message: 'Connection successful. Didit.me integration is properly configured and responsive.'
      };
    } catch (error) {
      console.error('Error testing Didit connection:', error);
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Ensure the Didit integration server is running
   */
  async ensureServerRunning(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Didit integration is not enabled');
    }
    
    if (this.serverRunning) {
      return;
    }
    
    await this.startServer();
  }

  /**
   * Start the Didit integration server
   */
  async startServer(): Promise<void> {
    if (this.serverRunning) {
      console.log('Didit server is already running');
      return;
    }

    try {
      const serverPath = path.join(process.cwd(), 'didit-integration', 'app.js');
      
      this.serverProcess = spawn('node', [serverPath], {
        env: {
          ...process.env,
          DIDIT_API_KEY: this.config.apiKey || '',
          DIDIT_API_SECRET: this.config.apiSecret || '',
          DIDIT_BASE_URL: this.config.baseUrl || process.env.DIDIT_API_URL || 'https://api.didit.me/v1',
          PORT: '5000',
          HOST: '0.0.0.0'
        },
        detached: false,
        stdio: 'pipe'
      });
      
      this.serverProcess.stdout?.on('data', (data) => {
        console.log(`Didit server: ${data}`);
      });
      
      this.serverProcess.stderr?.on('data', (data) => {
        console.error(`Didit server error: ${data}`);
      });
      
      this.serverProcess.on('close', (code) => {
        console.log(`Didit server process exited with code ${code}`);
        this.serverRunning = false;
        this.serverProcess = null;
      });
      
      // Wait for server to be ready
      await new Promise<void>((resolve, reject) => {
        // In a real implementation, we'd check if the server is responding
        // For now, we'll just wait a short time
        // setTimeout(() => {
        //   this.serverRunning = true;
        //   resolve();
        // }, 1000);
        const startTime = Date.now();
        const timeout = 30000; // 30 seconds timeout for server to start
        const interval = 2000; // Poll every 2 seconds

        const pollServer = async () => {
          try {
            const diditServerUrl = `http://localhost:${process.env.DIDIT_INTEGRATION_PORT || '5000'}`;
            const response = await fetch(diditServerUrl);
            if (response.ok) {
              console.log('Didit integration server is responsive.');
              this.serverRunning = true;
              resolve();
            } else {
              throw new Error(`Server responded with ${response.status}`);
            }
          } catch (error) {
            if (Date.now() - startTime > timeout) {
              console.error('Didit integration server start timed out.');
              this.serverProcess?.kill(); 
              reject(new Error('Didit server start timed out'));
            } else {
              setTimeout(pollServer, interval);
            }
          }
        };
        pollServer();
      });
      
      console.log('Didit integration server started');
    } catch (error) {
      console.error('Failed to start Didit integration server:', error);
      throw error;
    }
  }

  /**
   * Stop the Didit integration server
   */
  stopServer(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
      this.serverRunning = false;
      console.log('Didit integration server stopped');
    }
  }

  /**
   * Check verification status with Didit service
   */
  async checkVerificationStatus(email: string): Promise<{ verified: boolean, status: string, verificationDetails?: any }> {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      if (!this.config.enabled) {
        return { 
          verified: false, 
          status: 'none',
          verificationDetails: null
        };
      }

      if (!this.initialized) {
        await this.initializeConfig();
      }

      // Ensure the server is running
      await this.ensureServerRunning();
      
      // This would normally make an API call to the Didit service
      // For now, we'll just return a fake status for demonstration
      
      // In a real implementation, we would check the user's verification status in our database
      // or make an API call to Didit's service
      const user = await storage.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      const userProfile = await storage.getUserProfile(user.id);
      if (!userProfile) {
        return { verified: false, status: 'none' };
      }
      
      // Check if user has verification status in profile
      if (userProfile.verificationStatus === 'verified' && userProfile.verificationId) {
        // If verified, return details (in a real implementation, we might fetch these from Didit)
        return {
          verified: true,
          status: 'verified',
          verificationDetails: {
            id: userProfile.verificationId,
            timestamp: userProfile.verifiedAt?.toISOString() || new Date().toISOString(),
            documentType: 'National ID Card', // Example data
            fullName: `${user.firstName} ${user.lastName}`,
            documentNumber: '1234567890' // Example data
          }
        };
      } else if (userProfile.verificationStatus === 'pending') {
        return {
          verified: false,
          status: 'pending'
        };
      } else if (userProfile.verificationStatus === 'failed') {
        return {
          verified: false,
          status: 'failed'
        };
      }
      
      // Default status
      return { verified: false, status: 'none' };
    } catch (error) {
      console.error('Error checking verification status:', error);
      throw error;
    }
  }

  /**
   * Get verification details from Didit service
   */
  async getVerificationDetails(verificationId: string): Promise<any> {
    try {
      if (!this.config.enabled) {
        throw new Error('Didit integration is not enabled');
      }

      // This would normally make an API call to the Didit service
      // For now, we'll just return fake details
      
      return {
        id: verificationId,
        timestamp: new Date().toISOString(),
        documentType: 'National ID Card',
        fullName: 'John Doe',
        documentNumber: '1234567890'
      };
    } catch (error) {
      console.error('Error getting verification details:', error);
      throw error;
    }
  }

  /**
   * Initiates the verification process with Didit.me
   * @param email The email of the user to verify
   * @param callbackUrl The URL Didit should redirect to after verification
   * @returns The redirect URL for the user to start verification
   */
  async startVerification(email: string, callbackUrl: string): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Didit integration is not enabled.');
    }
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('Didit API key or secret is not configured.');
    }
    if (!email) {
      throw new Error('Email is required to start verification.');
    }
    if (!callbackUrl) {
      throw new Error('Callback URL is required.');
    }

    logger.warn(
      '*****************************************************************************\n' +
      '** WARNING: DiditConnector.startVerification is using a MOCK implementation. **\n' +
      '** This will NOT perform real identity verification.                         **\n' +
      '** TODO: Implement actual API call to Didit.me service.                      **\n' +
      '*****************************************************************************'
    );

    // In a real implementation, this would involve:
    // 1. Making an API call to this.config.baseUrl (e.g., /verifications/initiate)
    //    with the email, callbackUrl, and API credentials (this.config.apiKey, this.config.apiSecret).
    //    The request body might include: { email, callback_url: callbackUrl, client_reference_id: userId_or_some_local_id }
    // 2. Receiving a response from Didit.me containing a unique verification ID and a redirect URL for the user.
    //    Example response: { verification_id: "didit_verification_XYZ", redirect_uri: "https://verify.didit.me/start/XYZ" }
    // 3. Storing the verification_id and associating it with the user (e.g., in userProfile or a dedicated table)
    //    to later query the status using this ID or receive webhook updates.
    // 4. Returning the redirect_uri provided by Didit.me for the user to start the verification flow.

    // For now, returning a MOCK redirect URL that points to a local mock verification page.
    // Ensure this matches the mock verification route in server/routes/didit-verification.ts
    let appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) {
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        appBaseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`;
      } else {
        const port = process.env.PORT || '8080'; // Default to 8080 if PORT is not set
        appBaseUrl = `http://localhost:${port}`;
      }
    }
    const mockRedirectUrl = `${appBaseUrl}/api/verification/mockverify?email=${encodeURIComponent(email)}`;
    
    // Optionally, we could still try to use the spawned didit-integration server if it handles initiation
    // const diditIntegrationServerUrl = `http://localhost:${process.env.DIDIT_INTEGRATION_PORT || '5000'}`;
    // const mockRedirectUrl = `${diditIntegrationServerUrl}/initiate?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

    return mockRedirectUrl;
  }
}

export const diditConnector = new DiditConnector();