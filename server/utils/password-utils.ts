import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

// Promisify the scrypt function for easier async/await usage
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using a secure method
 * @param password The plain text password to hash
 * @returns A string containing the hashed password and salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = randomBytes(16).toString('hex');
  
  // Hash the password with the salt
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  
  // Return the hashed password with salt in format: hash.salt
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compare a supplied password with a stored password hash
 * @param supplied The plain text password to check
 * @param stored The stored password hash with salt
 * @returns Boolean indicating if the passwords match
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Split the stored hash into the hash and salt components
  const [hashed, salt] = stored.split('.');
  
  // Convert the stored hash to a buffer
  const hashedBuf = Buffer.from(hashed, 'hex');
  
  // Hash the supplied password with the same salt
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  
  // Compare the two buffers using a constant-time comparison
  // This helps prevent timing attacks
  if (hashedBuf.length !== suppliedBuf.length) {
    return false;
  }
  
  // Perform constant-time comparison
  let diff = 0;
  for (let i = 0; i < hashedBuf.length; i++) {
    diff |= hashedBuf[i] ^ suppliedBuf[i];
  }
  return diff === 0;
}