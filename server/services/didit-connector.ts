import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
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
    baseUrl: 'https://api.didit.me/v1',
    enabled: false
  };
  private serverProcess: ChildProcess | null = null;
  private serverRunning = false;

  constructor() {
    // Initialize with empty config, will be loaded from system settings later
  }

  /**
   * Initialize configuration from system settings
   */
  async initializeConfig(): Promise<void> {
    try {
      const apiKey = await storage.getSystemSetting('didit_api_key');
      const apiSecret = await storage.getSystemSetting('didit_api_secret');
      const baseUrl = await storage.getSystemSetting('didit_base_url');
      const enabled = await storage.getSystemSetting('didit_enabled');

      this.config = {
        apiKey: apiKey?.settingValue,
        apiSecret: apiSecret?.settingValue,
        baseUrl: baseUrl?.settingValue || 'https://api.didit.me/v1',
        enabled: enabled?.settingValue === 'true'
      };
      
      console.log('Didit connector initialized with config:', { 
        apiKey: this.config.apiKey ? '[REDACTED]' : undefined, 
        apiSecret: this.config.apiSecret ? '[REDACTED]' : undefined,
        baseUrl: this.config.baseUrl,
        enabled: this.config.enabled
      });
    } catch (error) {
      console.error('Error initializing Didit config:', error);
      // Use default config
      this.config = {
        baseUrl: 'https://api.didit.me/v1',
        enabled: false
      };
    }
  }

  /**
   * Update configuration with new values
   */
  updateConfig(newConfig: DiditConfig): void {
    this.config = { ...this.config, ...newConfig };
    
    console.log('Didit connector config updated:', { 
      apiKey: this.config.apiKey ? '[REDACTED]' : undefined, 
      apiSecret: this.config.apiSecret ? '[REDACTED]' : undefined,
      baseUrl: this.config.baseUrl,
      enabled: this.config.enabled
    });
    
    // If server is running and enabled flag changed to false, stop the server
    if (this.serverRunning && this.config.enabled === false) {
      this.stopServer();
    }
  }

  /**
   * Ensure the Didit integration server is running
   */
  async ensureServerRunning(): Promise<void> {
    if (this.serverRunning) {
      return;
    }

    if (!this.config.enabled || !this.config.apiKey || !this.config.apiSecret) {
      throw new Error('Didit integration is not enabled or configured properly');
    }

    await this.startServer();
  }

  /**
   * Start the Didit integration server
   */
  async startServer(): Promise<void> {
    if (this.serverRunning) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Load current configuration from system settings first
        this.initializeConfig().then(() => {
          if (!this.config.enabled) {
            console.log('Didit integration server not started: integration is disabled');
            return resolve();
          }

          if (!this.config.apiKey || !this.config.apiSecret) {
            console.log('Didit integration server not started: API credentials not configured');
            return resolve();
          }

          console.log('Starting Didit integration server...');
          
          // Set environment variables for the server
          const env = {
            ...process.env,
            DIDIT_API_KEY: this.config.apiKey,
            DIDIT_API_SECRET: this.config.apiSecret,
            DIDIT_API_URL: this.config.baseUrl,
            PORT: '3030'
          };

          // Start the server process
          const serverPath = path.resolve(process.cwd(), 'didit-integration/app.js');
          this.serverProcess = spawn('node', [serverPath], { 
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
          });

          // Handle output
          if (this.serverProcess.stdout) {
            this.serverProcess.stdout.on('data', (data) => {
              console.log(`[Didit Integration] ${data.toString().trim()}`);
            });
          }

          if (this.serverProcess.stderr) {
            this.serverProcess.stderr.on('data', (data) => {
              console.error(`[Didit Integration Error] ${data.toString().trim()}`);
            });
          }

          // Handle server exit
          this.serverProcess.on('close', (code) => {
            console.log(`Didit integration server exited with code ${code}`);
            this.serverRunning = false;
            this.serverProcess = null;
          });

          // Handle error
          this.serverProcess.on('error', (err) => {
            console.error('Failed to start Didit integration server:', err);
            this.serverRunning = false;
            this.serverProcess = null;
            reject(err);
          });

          // Wait for server to be ready
          setTimeout(() => {
            this.serverRunning = true;
            console.log('Didit integration server started successfully');
            resolve();
          }, 1000);
        });
      } catch (error) {
        console.error('Error starting Didit integration server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the Didit integration server
   */
  stopServer(): void {
    if (!this.serverProcess) {
      return;
    }

    console.log('Stopping Didit integration server...');
    if (process.platform === 'win32') {
      // Windows
      spawn('taskkill', ['/pid', `${this.serverProcess.pid}`, '/f', '/t']);
    } else {
      // Linux/Mac
      process.kill(-this.serverProcess.pid, 'SIGINT');
    }

    this.serverRunning = false;
    this.serverProcess = null;
  }

  /**
   * Check verification status with Didit service
   */
  async checkVerificationStatus(email: string): Promise<{ verified: boolean, details?: any }> {
    try {
      if (!this.config.enabled || !this.config.apiKey || !this.config.apiSecret) {
        console.log('Didit integration is not enabled or configured properly');
        return { verified: false };
      }

      // Start server if not running
      await this.ensureServerRunning();

      // Call the Didit server API to check status
      const response = await axios.get(`http://localhost:3030/api/status?email=${encodeURIComponent(email)}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'internal'
        }
      });

      if (response.data && response.data.verified) {
        return {
          verified: true,
          details: response.data
        };
      }

      return { verified: false };
    } catch (error) {
      console.error('Error checking verification status with Didit:', error);
      return { verified: false };
    }
  }

  /**
   * Get verification details from Didit service
   */
  async getVerificationDetails(verificationId: string): Promise<any> {
    try {
      if (!this.config.enabled || !this.config.apiKey || !this.config.apiSecret) {
        console.log('Didit integration is not enabled or configured properly');
        return null;
      }

      // Start server if not running
      await this.ensureServerRunning();

      // Call the Didit server API to get verification details
      const response = await axios.get(`http://localhost:3030/api/verification/${verificationId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'internal'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting verification details from Didit:', error);
      return null;
    }
  }
}

// Create singleton instance
export const diditConnector = new DiditConnector();