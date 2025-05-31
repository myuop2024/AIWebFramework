import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { processUserDataWithAI, detectDuplicateUsers, generateImportErrorExplanation } from './google-ai-service';
import { db } from '../db';
import { users } from '@shared/schema';
import { InsertUser } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import logger from '../utils/logger';

const scryptAsync = promisify(scrypt);

interface CSVUserData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phoneNumber?: string | null;
  role?: string;
}

interface ProcessedResult {
  data: InsertUser[];
  errorRows: { 
    rowIndex: number;
    data: any;
    error: string;
    explanation?: string;
  }[];
  enhancementStats: {
    namesFormatted: number;
    emailsImproved: number;
    phoneNumbersFormatted: number;
    usernamesGenerated: number;
    rolesAssigned: number;
  };
  duplicateWarnings: {
    newUser: Partial<CSVUserData>;
    existingUsers: Partial<CSVUserData>[];
  }[];
}

/**
 * Hash a password using scrypt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Process a CSV file with user data, using Google AI to enhance the data quality
 */
export async function processCSVFile(filePath: string, recordsOverride?: any[]): Promise<ProcessedResult> {
  try {
    let records;
    if (recordsOverride) {
      records = recordsOverride;
    } else {
      // Read the CSV file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      // Parse the CSV content
      const { parse } = await import('csv-parse/sync');
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    }

    // Basic validation before AI processing
    const errorRows: { rowIndex: number; data: any; error: string; explanation?: string }[] = [];
    const validRows: CSVUserData[] = [];

    // Track basic validation
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      
      // Check for required fields
      if (!row.firstName || !row.lastName || !row.email || !row.password) {
        errorRows.push({
          rowIndex: i + 1, // +1 for human-readable row number (header is row 1)
          data: row,
          error: 'Missing required fields (firstName, lastName, email, or password)'
        });
        continue;
      }
      
      // Add to valid rows for AI processing
      validRows.push({
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        username: row.username || '',
        password: row.password,
        phoneNumber: row.phoneNumber || '',
        role: row.role || ''
      });
    }

    // Get existing users for duplicate detection
    const existingUsersList = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      username: users.username,
      phoneNumber: users.phoneNumber,
      role: users.role
    }).from(users);

    // Process valid rows with Google AI
    const enhancedData = await processUserDataWithAI(validRows);
    
    // Check for duplicates
    const duplicateResults = await detectDuplicateUsers(enhancedData, existingUsersList);
    
    // Prepare final processed data with hashed passwords
    const finalData: InsertUser[] = [];
    const duplicateWarnings: { newUser: Partial<CSVUserData>; existingUsers: Partial<CSVUserData>[] }[] = [];
    const enhancementStats = {
      namesFormatted: 0,
      emailsImproved: 0,
      phoneNumbersFormatted: 0,
      usernamesGenerated: 0,
      rolesAssigned: 0
    };

    for (let i = 0; i < enhancedData.length; i++) {
      const original = validRows[i];
      const enhanced = enhancedData[i];
      
      // Track enhancements
      if (original.firstName !== enhanced.firstName || original.lastName !== enhanced.lastName) {
        enhancementStats.namesFormatted++;
      }
      if (original.email !== enhanced.email) {
        enhancementStats.emailsImproved++;
      }
      if (original.phoneNumber !== enhanced.phoneNumber && enhanced.phoneNumber) {
        enhancementStats.phoneNumbersFormatted++;
      }
      if (!original.username && enhanced.username) {
        enhancementStats.usernamesGenerated++;
      }
      if (!original.role && enhanced.role) {
        enhancementStats.rolesAssigned++;
      }
      
      // Check for duplicates
      const duplicateCheck = duplicateResults.find(item => 
        item.user.email === enhanced.email || 
        item.user.username === enhanced.username
      );
      
      if (duplicateCheck && duplicateCheck.potentialDuplicates.length > 0) {
        duplicateWarnings.push({
          newUser: enhanced,
          existingUsers: duplicateCheck.potentialDuplicates
        });
      }
      
      // Hash the password and prepare final data
      try {
        const hashedPassword = await hashPassword(enhanced.password || '');
        finalData.push({
          firstName: enhanced.firstName || '',
          lastName: enhanced.lastName || '',
          email: enhanced.email || '',
          username: enhanced.username || '',
          password: hashedPassword,
          phoneNumber: enhanced.phoneNumber || null,
          role: enhanced.role || 'observer'
        });
      } catch (error) {
        errorRows.push({
          rowIndex: i + 1,
          data: enhanced,
          error: 'Error processing user data: ' + (error instanceof Error ? error.message : String(error))
        });
      }
    }
    
    // Generate enhanced error explanations
    for (const errorRow of errorRows) {
      try {
        errorRow.explanation = await generateImportErrorExplanation(
          errorRow.data, 
          errorRow.error
        );
      } catch (error) {
        logger.error('Error generating explanation for CSV error row', { rowIndex: errorRow.rowIndex, rowData: errorRow.data, originalError: errorRow.error, explanationError: error instanceof Error ? error : new Error(String(error)) });
      }
    }

    return {
      data: finalData,
      errorRows,
      enhancementStats,
      duplicateWarnings
    };
  } catch (error) {
    logger.error('Error processing CSV file', { filePath, error: error instanceof Error ? error : new Error(String(error)) });
    throw new Error('Failed to process CSV file: ' + (error instanceof Error ? error.message : String(error)));
  }
}