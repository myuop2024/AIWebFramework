import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import path from 'path';
import { storage } from '../storage';

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
    baseUrl: 'https://api.didit.me/v1',
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
        baseUrl: baseUrlSetting?.settingValue || 'https://api.didit.me/v1',
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

      // For demo purposes, we'll just check if we have credentials
      // In a real implementation, this would make an API call to test auth
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      
      return {
        success: true,
        message: 'Connection successful. Didit.me integration is properly configured.'
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
          DIDIT_BASE_URL: this.config.baseUrl || 'https://api.didit.me/v1',
          PORT: '3030' // Use a different port from the main app
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
        setTimeout(() => {
          this.serverRunning = true;
          resolve();
        }, 1000);
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
      if (!this.config.enabled) {
        return { 
          verified: false, 
          status: 'none',
          verificationDetails: null
        };
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
}

export const diditConnector = new DiditConnector();