/**
 * Connector service to integrate with Didit.me verification flow
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { storage } from '../storage';

// Constants
const DIDIT_INTEGRATION_PATH = path.join(process.cwd(), 'didit-integration');
const DIDIT_PORT = process.env.DIDIT_PORT || 3030;
const DIDIT_URL = `http://localhost:${DIDIT_PORT}`;

let diditProcess: any = null;

/**
 * DiditConnectorService provides methods to interact with the Didit.me integration
 */
class DiditConnectorService {
  isRunning: boolean = false;
  
  /**
   * Start the Didit.me integration server
   */
  async startServer(): Promise<boolean> {
    if (this.isRunning) {
      console.log('Didit.me integration server is already running');
      return true;
    }
    
    try {
      // Make sure the directory exists
      if (!fs.existsSync(DIDIT_INTEGRATION_PATH)) {
        console.error('Didit integration directory not found:', DIDIT_INTEGRATION_PATH);
        return false;
      }
      
      // Make sure the .env file exists
      const envPath = path.join(DIDIT_INTEGRATION_PATH, '.env');
      if (!fs.existsSync(envPath)) {
        // Create it from the example
        const exampleEnvPath = path.join(DIDIT_INTEGRATION_PATH, '.env.example');
        if (fs.existsSync(exampleEnvPath)) {
          await fs.copyFile(exampleEnvPath, envPath);
          console.log('Created .env file from example');
          
          // Update the PORT in the .env file
          let envContent = await fs.readFile(envPath, 'utf8');
          envContent = envContent.replace(/PORT=\d+/, `PORT=${DIDIT_PORT}`);
          await fs.writeFile(envPath, envContent, 'utf8');
        } else {
          console.error('No .env.example file found for Didit integration');
        }
      }
      
      // Start the Didit.me integration server
      console.log('Starting Didit.me integration server...');
      diditProcess = spawn('node', ['app.js'], {
        cwd: DIDIT_INTEGRATION_PATH,
        env: {
          ...process.env,
          PORT: String(DIDIT_PORT)
        },
        stdio: 'pipe' // Capture stdout and stderr
      });
      
      diditProcess.stdout.on('data', (data: Buffer) => {
        console.log(`[Didit Integration] ${data.toString().trim()}`);
      });
      
      diditProcess.stderr.on('data', (data: Buffer) => {
        console.error(`[Didit Integration Error] ${data.toString().trim()}`);
      });
      
      diditProcess.on('close', (code: number) => {
        console.log(`Didit.me integration server exited with code ${code}`);
        this.isRunning = false;
        diditProcess = null;
      });
      
      // Wait for the server to start
      await this.waitForServer();
      this.isRunning = true;
      console.log(`Didit.me integration server started on port ${DIDIT_PORT}`);
      
      return true;
    } catch (error) {
      console.error('Failed to start Didit.me integration server:', error);
      return false;
    }
  }
  
  /**
   * Stop the Didit.me integration server
   */
  stopServer(): boolean {
    if (!diditProcess || !this.isRunning) {
      console.log('Didit.me integration server is not running');
      return true;
    }
    
    try {
      diditProcess.kill();
      this.isRunning = false;
      diditProcess = null;
      console.log('Didit.me integration server stopped');
      return true;
    } catch (error) {
      console.error('Failed to stop Didit.me integration server:', error);
      return false;
    }
  }
  
  /**
   * Wait for the server to be ready
   */
  private async waitForServer(maxAttempts: number = 10): Promise<boolean> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(DIDIT_URL, { timeout: 2000 });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    throw new Error('Didit.me integration server failed to start in time');
  }
  
  /**
   * Generate a verification URL for a user
   * @param userId User ID in our main application
   * @returns The verification URL to redirect the user to
   */
  async getVerificationUrl(userId: number): Promise<string> {
    try {
      // Make sure the server is running
      if (!this.isRunning) {
        await this.startServer();
      }
      
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Create a "shadow" user in the Didit integration
      const response = await axios.post(`${DIDIT_URL}/api/login`, {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      });
      
      if (!response.data.success) {
        throw new Error('Failed to create user in Didit integration');
      }
      
      // Return the verification URL
      return `${DIDIT_URL}/start-verification`;
    } catch (error) {
      console.error('Error generating verification URL:', error);
      throw new Error('Failed to generate verification URL');
    }
  }
  
  /**
   * Check the verification status of a user
   * @param userId User ID in our main application
   * @returns The verification status
   */
  async checkVerificationStatus(userId: number): Promise<{
    verified: boolean;
    verificationDetails: any;
  }> {
    try {
      // Make sure the server is running
      if (!this.isRunning) {
        await this.startServer();
      }
      
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Create a "shadow" user in the Didit integration if needed
      await axios.post(`${DIDIT_URL}/api/login`, {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      });
      
      // Check verification status
      const response = await axios.get(`${DIDIT_URL}/verification-status`);
      
      return {
        verified: response.data.verified || false,
        verificationDetails: response.data.verificationDetails || null
      };
    } catch (error) {
      console.error('Error checking verification status:', error);
      return {
        verified: false,
        verificationDetails: null
      };
    }
  }
  
  /**
   * Update the Didit.me configuration
   * @param config Configuration object
   * @returns Success status
   */
  async updateConfiguration(config: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    authUrl?: string;
    tokenUrl?: string;
    meUrl?: string;
  }): Promise<boolean> {
    try {
      // Make sure the server is running
      if (!this.isRunning) {
        await this.startServer();
      }
      
      // Admin login
      await axios.post(`${DIDIT_URL}/api/admin/login`, {
        username: 'admin',
        password: 'admin123'
      });
      
      // Update configuration
      const response = await axios.put(`${DIDIT_URL}/admin/settings/didit`, config);
      
      return response.data.isValid || false;
    } catch (error) {
      console.error('Error updating Didit.me configuration:', error);
      return false;
    }
  }
}

export const diditConnector = new DiditConnectorService();