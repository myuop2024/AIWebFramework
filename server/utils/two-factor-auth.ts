import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

// Set up authenticator
authenticator.options = {
  window: 1, // Allow one period before and after the current time for clock skew tolerance
  step: 30   // Time step in seconds (default is 30)
};

// Application name for TOTP
const APP_NAME = 'Election Observer System';

/**
 * Generate a new secret key for TOTP
 * @returns Secret key for TOTP
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate the OTP authentication URL for QR codes
 * @param username User's username or email
 * @param secret User's TOTP secret
 * @returns URL for QR code generation
 */
export function generateOtpAuthUrl(username: string, secret: string): string {
  return authenticator.keyuri(username, APP_NAME, secret);
}

/**
 * Generate a QR code as a data URL
 * @param otpAuthUrl The OTP auth URL
 * @returns Promise resolving to a data URL string for the QR code
 */
export async function generateQRCode(otpAuthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpAuthUrl);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a user-provided token against the stored secret
 * @param token The token provided by the user
 * @param secret The secret stored for the user
 * @returns Boolean indicating if the token is valid
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

/**
 * Generate a token from the secret (primarily for testing)
 * @param secret The TOTP secret
 * @returns The current TOTP token
 */
export function generateToken(secret: string): string {
  return authenticator.generate(secret);
}