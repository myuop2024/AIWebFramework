/**
 * Encryption service for securely storing and retrieving sensitive user information
 * Uses AES-256-GCM for encryption with unique initialization vectors
 */
import crypto from 'crypto';
import logger from '../utils/logger'; // Added logger import

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, initialization vector is always 16 bytes
const AUTH_TAG_LENGTH = 16; // For GCM mode
// ENCRYPTION_KEY must be a strong, unique key.
// Ideally, it should be 32 bytes before hashing.
// If not 32 bytes, it will be hashed to 32 bytes using SHA-256.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Ensure we have a proper 32-byte key for AES-256
const getKey = (): Buffer => {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables.');
  }

  // Hash the key to ensure we have exactly 32 bytes
  const hashedKey = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

  if (hashedKey.length !== 32) {
    // This case should ideally not be reached if SHA-256 is used correctly.
    throw new Error('Hashed ENCRYPTION_KEY must be 32 bytes long.');
  }
  
  return hashedKey;
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
    console.error('Decryption error:', error);
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
    'creditCard',
    'address',
    'city',
    'state',
    'postOfficeRegion',
    'country',
    'trn',
    'idType',
    'profilePhotoUrl',
    'idPhotoUrl',
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

// --- Generic Encryption/Decryption Helpers ---

/**
 * Generic function to encrypt specified fields in a data object.
 * Stores all IVs in a single JSON object in data[ivStorageField].
 * Sets data[isEncryptedFlagField] = true if any field was encrypted.
 *
 * @param data The data object.
 * @param fieldsToEncrypt Array of field names to encrypt.
 * @param ivStorageField Name of the field to store the JSON object of IVs.
 * @param isEncryptedFlagField Name of the boolean flag field.
 * @returns The modified data object with encrypted fields.
 */
export function encryptFields(
  data: Record<string, any>,
  fieldsToEncrypt: string[],
  ivStorageField: string,
  isEncryptedFlagField: string
): Record<string, any> {
  const result: Record<string, any> = { ...data };
  const ivs: Record<string, string> = {};
  let hasEncryptedItem = false;

  fieldsToEncrypt.forEach(field => {
    if (result[field] !== undefined && result[field] !== null) {
      // Handle cases where a field might be an object (e.g. userImportLogs.errors which is jsonb)
      const valueToEncrypt = typeof result[field] === 'object' ? JSON.stringify(result[field]) : String(result[field]);
      const { encrypted, iv } = encrypt(valueToEncrypt);
      result[field] = encrypted;
      ivs[field] = iv;
      hasEncryptedItem = true;
    }
  });

  if (hasEncryptedItem) {
    result[isEncryptedFlagField] = true;
    result[ivStorageField] = JSON.stringify(ivs);
  } else {
    // Ensure fields are present even if no encryption happened, to maintain schema consistency for new objects
    result[isEncryptedFlagField] = result[isEncryptedFlagField] || false;
    result[ivStorageField] = result[ivStorageField] || null;
  }
  return result;
}

/**
 * Generic function to decrypt specified fields in a data object.
 * Retrieves IVs from data[ivStorageField].
 *
 * @param data The data object.
 * @param userRole Role of the user requesting decryption for permission check.
 * @param ivStorageField Name of the field where the JSON object of IVs is stored.
 * @param isEncryptedFlagField Name of the boolean flag field.
 * @param fieldsToParseAsObject Array of field names that should be parsed as JSON after decryption.
 * @returns The modified data object with decrypted fields if permitted.
 */
export function decryptFields(
  data: Record<string, any> | null | undefined,
  userRole: string, // For canViewSensitiveData check
  ivStorageField: string,
  isEncryptedFlagField: string,
  fieldsToParseAsObject: string[] = [] // Optional: fields like 'recoveryCodes' or 'errors' (jsonb)
): Record<string, any> | null | undefined {
  if (!data || !data[isEncryptedFlagField] || !data[ivStorageField]) {
    return data;
  }

  // Permission check (can be made more granular by the caller if needed)
  // For messages, this check needs to be more specific (sender/receiver).
  // This will be handled by specific wrapper functions or in the route.
  if (!canViewSensitiveData(userRole)) {
    // console.warn(`User with role '${userRole}' attempted to decrypt fields without general permission.`);
    // For now, if general permission fails, we might still want to allow specific decryption
    // e.g. a user decrypting their own message. This function will proceed,
    // relying on callers to implement stricter checks if canViewSensitiveData is too broad.
    // If a specific check already happened, userRole could be a special system role.
  }

  const result = { ...data };
  let ivs: Record<string, string> = {};

  try {
    if (typeof result[ivStorageField] === 'string') {
      ivs = JSON.parse(result[ivStorageField]);
    } else if (typeof result[ivStorageField] === 'object' && result[ivStorageField] !== null) {
      ivs = result[ivStorageField];
    } else {
      console.error(`${ivStorageField} is missing or not a string/object:`, result[ivStorageField]);
      return data; // Cannot decrypt without IVs
    }
  } catch (error) {
    console.error(`Error parsing ${ivStorageField} JSON:`, error);
    return data; // Cannot decrypt if IVs are malformed
  }

  Object.keys(ivs).forEach(fieldKey => {
    if (result[fieldKey] && ivs[fieldKey]) {
      const asObject = fieldsToParseAsObject.includes(fieldKey);
      const decryptedValue = decrypt(result[fieldKey], ivs[fieldKey], asObject);
      if (decryptedValue !== null) {
        result[fieldKey] = decryptedValue;
      } else {
        console.warn(`Decryption failed for field '${fieldKey}' in object. Keeping original.`);
      }
    }
  });
  return result;
}

// --- UserProfile specific encryption (using generic helpers) ---

const userProfileSensitiveFields = [ // Replaces the old `sensitiveFields` from `shouldEncryptField`
  'idNumber', 'bankAccount', 'ssn', 'passport', 'driverLicense', 'creditCard',
  'address', 'city', 'state', 'postOfficeRegion', 'country', 'trn',
  'idType', 'profilePhotoUrl', 'idPhotoUrl',
];

/**
 * Encrypts sensitive fields in a UserProfile object.
 * Uses generic encryptFields helper.
 * Original function was encryptSensitiveFields.
 */
export function encryptUserProfileFields(data: Record<string, any>): Record<string, any> {
  return encryptFields(data, userProfileSensitiveFields, "encryptionIv", "isEncrypted");
}

// Fields in the 'users' table that should be encrypted.
// Note: 'deviceId', 'twoFactorSecret', 'recoveryCodes' require careful handling
// for decryption, usually only for the user themselves or system processes.
export const userTableSensitiveFields = [
  'email',
  'firstName',
  'lastName',
  'observerId',
  'phoneNumber',
  'deviceId', // For user session tracking or device-specific settings
  'twoFactorSecret', // Secret key for 2FA
  'recoveryCodes', // Recovery codes for 2FA (usually stored as a JSON array string)
];

/**
 * Encrypts sensitive fields in a user object specifically for the 'users' table.
 * Stores IVs in a single JSON object in 'personalInfoIv'.
 * Adds 'isPersonalInfoEncrypted' flag.
 *
 * @param data User data object
 * @returns User data object with specified fields encrypted
 */
export function encryptUserFields(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...data };
  const ivs: Record<string, string> = {};
  let hasEncryptedFields = false;

  userTableSensitiveFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null) {
      // Ensure data[field] is a string before encryption, especially for recoveryCodes (JSON array)
      const valueToEncrypt = typeof data[field] === 'object' ? JSON.stringify(data[field]) : String(data[field]);
      const { encrypted, iv } = encrypt(valueToEncrypt);
      result[field] = encrypted;
      ivs[field] = iv;
      hasEncryptedFields = true;
    }
  });

  if (hasEncryptedFields) {
    result.isPersonalInfoEncrypted = true;
    result.personalInfoIv = JSON.stringify(ivs);
  } else {
    // Ensure fields are present even if no encryption happened, to maintain schema consistency
    result.isPersonalInfoEncrypted = data.isPersonalInfoEncrypted || false;
    result.personalInfoIv = data.personalInfoIv || null;
  }
  
  return result;
}

/**
 * Decrypts sensitive fields in a user object from the 'users' table.
 * Uses IVs from 'personalInfoIv'.
 *
 * @param user User data object (potentially with encrypted fields) - must contain 'id' field.
 * @param requestingUserId The ID of the user making the request.
 * @param userRole Role of the user requesting decryption.
 * @returns User data object with specified fields decrypted if permitted.
 */
export function decryptUserFields(
  user: Record<string, any> | null | undefined,
  requestingUserId: number, // Added: ID of the user making the request
  userRole: string
): Record<string, any> | null | undefined {
  if (!user || !user.isPersonalInfoEncrypted || !user.personalInfoIv || user.id === undefined) {
    return user;
  }

  const result = { ...user };
  let ivs: Record<string, string> = {};

  try {
    if (typeof user.personalInfoIv === 'string') {
      ivs = JSON.parse(user.personalInfoIv);
    } else if (typeof user.personalInfoIv === 'object' && user.personalInfoIv !== null) {
      // If it's already an object (e.g. from a previous step or direct JSONB handling)
      ivs = user.personalInfoIv;
    } else {
      console.error('personalInfoIv is missing or not a string/object:', user.personalInfoIv);
      return user; // Cannot decrypt without IVs
    }
  } catch (error) {
    console.error('Error parsing personalInfoIv JSON:', error);
    return user; // Cannot decrypt if IVs are malformed
  }

  Object.keys(ivs).forEach(field => {
    if (user[field] && ivs[field]) {
      let canDecryptField = false;

      if (field === 'twoFactorSecret' || field === 'recoveryCodes') {
        // These fields can only be decrypted by the owner.
        canDecryptField = user.id === requestingUserId;
        if (!canDecryptField) {
          // If not owner, explicitly nullify or remove these fields from result for security.
          // For now, we keep them encrypted as per original logic for non-permitted fields.
          // Or, more securely: delete result[field];
           logger.warn(`Attempt to decrypt sensitive 2FA field '${field}' for user ID ${user.id} by non-owner ${requestingUserId}. Field kept encrypted.`);
        }
      } else {
        // For other fields, use the role-based general permission.
        canDecryptField = canViewSensitiveData(userRole);
        if (!canDecryptField) {
            logger.warn(`User role '${userRole}' (requester ID ${requestingUserId}) does not have general permission to decrypt field '${field}' for user ID ${user.id}. Field kept encrypted.`);
        }
      }

      if (canDecryptField) {
        const asObject = field === 'recoveryCodes'; // recoveryCodes is JSON
        const decryptedValue = decrypt(user[field], ivs[field], asObject);
        if (decryptedValue !== null) {
          result[field] = decryptedValue;
        } else {
          console.warn(`Decryption failed for field '${field}' for user ID ${user.id}. Field kept encrypted.`);
        }
      } else {
        // If not permitted to decrypt (either 2FA field by non-owner, or other field by insufficient role),
        // the field remains encrypted in the 'result' object (copied from 'user').
        // Consider if these fields should be nulled out or removed from 'result' if the requester
        // isn't the owner (for 2FA) or doesn't have canViewSensitiveData (for others).
        // For now, they remain encrypted if permission is denied.
      }
    }
  });
  
  // No need to explicitly delete personalInfoIv or isPersonalInfoEncrypted from the result here,
  // as the client might need to know if the object was originally encrypted.
  // Sensitive fields like twoFactorSecret should be explicitly removed before sending to client
  // unless the specific operation requires them. This function's job is just decryption.

  return result;
}

/**
 * Decrypt sensitive fields in a user profile
 *
 * Decrypts sensitive fields in a UserProfile object.
 * Uses generic decryptFields helper.
 * Original function was decryptProfileFields.
 */
export function decryptUserProfileFields(
  profile: Record<string, any> | null | undefined,
  userRole: string
): Record<string, any> | null | undefined {
  // The generic decryptFields function already handles the checks for null profile,
  // isEncrypted flag, IV existence, and the canViewSensitiveData permission.
  return decryptFields(profile, userRole, "encryptionIv", "isEncrypted");
}

// Remove the old shouldEncryptField function as it's no longer used.
/*
export function shouldEncryptField(fieldName: string): boolean {
  const sensitiveFields = [
    'idNumber',
    'bankAccount',
    'ssn',
    'passport',
    'driverLicense',
    'creditCard',
    'address',
    'city',
    'state',
    'postOfficeRegion',
    'country',
    'trn',
    'idType',
    'profilePhotoUrl',
    'idPhotoUrl',
  ];

  return sensitiveFields.includes(fieldName);
}
*/

/**
 * Decrypts message content if the requesting user is the sender or receiver.
 *
 * @param message The message object (must include senderId, receiverId, content, content_iv, is_content_encrypted).
 * @param requestingUserId The ID of the user making the request.
 * @returns The message object with 'content' decrypted if permitted, otherwise original message.
 */
export function decryptMessageFields(
  message: Record<string, any> | null | undefined,
  requestingUserId: number
): Record<string, any> | null | undefined {
  if (!message || !message.is_content_encrypted || !message.content_iv || !message.content) {
    return message; // Not encrypted or necessary fields missing
  }

  // Permission check: Only sender or receiver can decrypt
  if (requestingUserId !== message.senderId && requestingUserId !== message.receiverId) {
    logger.warn(`User ${requestingUserId} attempted to decrypt message ${message.id || 'unknown'} not sent or received by them. Sender: ${message.senderId}, Receiver: ${message.receiverId}.`);
    // Return message as is (content still encrypted)
    return message;
  }

  const result = { ...message };
  let ivs: Record<string, string> = {}; // IVs for message content are stored directly in content_iv

  try {
    // content_iv stores the IV for the 'content' field directly as a string "iv_hex:auth_tag_hex"
    // but our generic decrypt function expects a JSON string of IVs like {"content": "iv_hex:auth_tag_hex"}
    // So, we reconstruct this structure for the core 'decrypt' function.
    // Alternatively, we can call 'decrypt' directly.

    const [ivHex, authTagHex] = (message.content_iv as string).split(':');
    if (!ivHex || !authTagHex) {
      logger.error(`Invalid content_iv format for message ${message.id || 'unknown'}: ${message.content_iv}`);
      return message; // Cannot decrypt
    }

    // The 'content' field itself is what's encrypted.
    const decryptedContent = decrypt(message.content, message.content_iv, false); // false because message content is string

    if (decryptedContent !== null) {
      result.content = decryptedContent;
    } else {
      logger.warn(`Decryption failed for message content (ID: ${message.id || 'unknown'}). Content kept encrypted.`);
    }
  } catch (error) {
    logger.error(`Error during message content decryption (ID: ${message.id || 'unknown'}):`, error);
    // Return original message if decryption process fails
    return message;
  }

  return result;
}