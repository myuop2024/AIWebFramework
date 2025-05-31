/**
 * Encryption service for securely storing and retrieving sensitive user information
 * Uses AES-256-GCM for encryption with unique initialization vectors
 */
import crypto from 'crypto';
import logger from '../utils/logger';

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, initialization vector is always 16 bytes
const AUTH_TAG_LENGTH = 16; // For GCM mode
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'CAFFE_encryption_key_must_be_32_bytes!';

// Ensure we have a proper 32-byte key for AES-256
const getKey = (): Buffer => {
  let keyBase = ENCRYPTION_KEY;
  const defaultKey = 'CAFFE_encryption_key_must_be_32_bytes!';

  if (keyBase === defaultKey && process.env.NODE_ENV === 'production') {
    const errorMessage = 'CRITICAL: Default ENCRYPTION_KEY is being used in a production environment. This is insecure. Please set a strong, unique ENCRYPTION_KEY environment variable.';
    logger.critical(errorMessage);
    // For critical security, it's often best to prevent the application from running with such a configuration.
    // Consider whether to throw an error here to halt startup, or if logging is sufficient (not recommended for this).
    throw new Error(errorMessage);
  } else if (keyBase === defaultKey) {
    logger.warn('WARNING: Using default ENCRYPTION_KEY. This is insecure and should ONLY be used for development/testing. Set a proper ENCRYPTION_KEY environment variable for production.');
  }
  
  // Hash it to ensure we have exactly 32 bytes
  return crypto.createHash('sha256').update(keyBase).digest();
};

/**
 * Encrypts sensitive data (strings or objects)
 * 
 * @param data Data to encrypt (will be stringified if an object)
 * @returns Object containing encrypted data and initialization vector
 */
export function encrypt(data: any): { encrypted: string; iv: string } {
  // Generate a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Convert data to string if it's an object
  const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
  
  // Create the cipher using our key and IV
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt the data
  let encrypted = cipher.update(dataString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the auth tag (for GCM mode)
  const authTag = cipher.getAuthTag();
  
  // Return the encrypted data and IV (both needed for decryption)
  // Store the auth tag with the encrypted data
  return {
    encrypted: encrypted + ':' + authTag.toString('hex'),
    iv: iv.toString('hex')
  };
}

/**
 * Decrypts data that was encrypted with the encrypt function
 * 
 * @param encryptedData The encrypted data string
 * @param iv The initialization vector used for encryption (hex string)
 * @param asObject Whether to parse the decrypted result as JSON
 * @returns The decrypted data
 */
export function decrypt(encryptedData: string, iv: string, asObject = false): any {
  try {
    // Split the encrypted data and auth tag
    const [encrypted, authTag] = encryptedData.split(':');
    
    // Convert the IV from hex to bytes
    const ivBuffer = Buffer.from(iv, 'hex');
    
    // Create the decipher
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    
    // Set the auth tag
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Return as object if requested
    if (asObject) {
      return JSON.parse(decrypted);
    }
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error', { encryptedDataLength: encryptedData?.length, ivLength: iv?.length, asObject, error: error instanceof Error ? error : new Error(String(error)) });
    return null;
  }
}

/**
 * Checks if a given field should be encrypted based on its content
 * 
 * @param fieldName The name of the field to check
 * @returns True if the field should be encrypted
 */
export function shouldEncryptField(fieldName: string): boolean {
  const sensitiveFields = [
    'idNumber', 
    'bankAccount',
    'ssn', 
    'passport',
    'driverLicense',
    'creditCard'
  ];
  
  return sensitiveFields.includes(fieldName);
}

/**
 * Determines if a user has permission to view sensitive data
 * 
 * @param userRole The role of the user checking permissions
 * @returns True if the user can view sensitive data
 */
export function canViewSensitiveData(userRole: string): boolean {
  if (!userRole) return false;
  const authorizedRoles = ['admin', 'director', 'supervisor'];
  return authorizedRoles.includes(userRole.toLowerCase());
}

/**
 * Transform an object to encrypt sensitive fields
 * Returns a new object with sensitive fields encrypted
 * 
 * @param data The data object with fields to selectively encrypt
 * @returns Object with encrypted fields and IVs
 */
export function encryptSensitiveFields(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...data };
  const ivs: Record<string, string> = {};
  let hasEncryptedFields = false;
  
  // Process each field that needs encryption
  Object.keys(data).forEach(field => {
    if (shouldEncryptField(field) && data[field]) {
      const { encrypted, iv } = encrypt(data[field]);
      result[field] = encrypted;
      ivs[field] = iv;
      hasEncryptedFields = true;
    }
  });
  
  // Only add encryption metadata if we encrypted something
  if (hasEncryptedFields) {
    result.isEncrypted = true;
    result.encryptionIv = JSON.stringify(ivs);
  }
  
  return result;
}

/**
 * Decrypt sensitive fields in a user profile
 * 
 * @param profile The user profile with potentially encrypted fields
 * @param userRole The role of the requesting user (for permission check)
 * @returns Profile with decrypted fields if user has permission
 */
export function decryptProfileFields(
  profile: Record<string, any> | null | undefined, 
  userRole: string
): Record<string, any> | null | undefined {
  if (!profile) return profile;
  // Return the original profile if not encrypted or user doesn't have permission
  if (!profile.isEncrypted || !canViewSensitiveData(userRole)) {
    return profile;
  }
  
  const result = { ...profile };
  let ivs: Record<string, string> = {};
  
  // Parse the stored IVs
  try {
    ivs = JSON.parse(profile.encryptionIv || '{}');
  } catch (error) {
    logger.error('Error parsing encryption IVs from profile', { profileId: profile.id, userId: profile.userId, error: error instanceof Error ? error : new Error(String(error)) });
    return profile;
  }
  
  // Decrypt each encrypted field
  Object.keys(ivs).forEach(field => {
    if (profile[field] && ivs[field]) {
      result[field] = decrypt(profile[field], ivs[field]);
    }
  });
  
  return result;
}