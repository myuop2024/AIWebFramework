import { db } from "./db";
import { IStorage } from "./storage";
import crypto from "crypto";
import { 
  users, users as usersTable, 
  systemSettings, 
  pollingStations,
  assignments,
  documents,
  userProfiles,
  reports,
  reportAttachments,
  formTemplates,
  events,
  eventParticipation,
  faqEntries,
  newsEntries,
  messages,
  registrationForms,
  userImportLogs,
  photoApprovals,
  roles,
  idCardTemplates,
  type User,
  type UpsertUser,
  type InsertUser,
  type SystemSetting,
  type InsertSystemSetting,
  type UserProfile,
  type InsertUserProfile,
  type PollingStation,
  type InsertPollingStation,
  type Assignment,
  type InsertAssignment,
  type Document,
  type InsertDocument,
  type Report,
  type InsertReport,
  type ReportAttachment,
  type InsertReportAttachment,
  type FormTemplate,
  type InsertFormTemplate,
  type RegistrationForm,
  type InsertRegistrationForm,
  type UserImportLog,
  type InsertUserImportLog,
  type Event,
  type InsertEvent,
  type EventParticipation,
  type InsertEventParticipation,
  type Faq,
  type InsertFaq,
  type News,
  type InsertNews,
  type Message,
  type InsertMessage,
  type PhotoApproval,
  type InsertPhotoApproval,
  type Role,
  type InsertRole,
  type IdCardTemplate,
  type InsertIdCardTemplate,
  ErrorLogQueryOptions,
  ErrorLogDeleteCriteria
} from "@shared/schema";
import { eq, and, isNull, or, not, desc, asc, lt, gt, gte, lte, like, ilike, inArray } from "drizzle-orm";
import logger from "./utils/logger";

// Generate a unique observer ID, to be used for QR code generation
function generateObserverId(): string {
  // Format: OBS-XXXXXX-YY where X is alphanumeric and Y is checksum
  const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase().substring(0, 6);
  const baseId = `OBS-${randomPart}`;
  
  // Generate simple checksum (sum of character codes modulo 100)
  const checksum = baseId
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100;
  
  // Format checksum to be two digits
  const checksumStr = checksum.toString().padStart(2, '0');
  
  return `${baseId}-${checksumStr}`;
}

export class DatabaseStorage implements IStorage {
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, key));
    
    return setting;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings);
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const [newSetting] = await db
      .insert(systemSettings)
      .values(setting)
      .returning();
    
    return newSetting;
  }

  async updateSystemSetting(key: string, value: any, updatedBy?: string): Promise<SystemSetting | undefined> {
    const [updatedSetting] = await db
      .update(systemSettings)
      .set({ 
        settingValue: value, 
        updatedAt: new Date(),
        updatedBy: updatedBy || null
      })
      .where(eq(systemSettings.settingKey, key))
      .returning();
    
    return updatedSetting;
  }

  // User methods for traditional auth integration
  async getUser(id: number): Promise<User | undefined> {
    try {
      logger.info(`Getting user by ID: ${id}`);
      const [user] = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          password: usersTable.password,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          observerId: usersTable.observerId,
          role: usersTable.role,
          verificationStatus: usersTable.verificationStatus,
          deviceId: usersTable.deviceId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          trainingStatus: usersTable.trainingStatus,
          phoneNumber: usersTable.phoneNumber
        })
        .from(usersTable)
        .where(eq(usersTable.id, id));
      
      return user;
    } catch (error) {
      logger.error(`Error getting user by ID: ${id}`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          password: usersTable.password,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          observerId: usersTable.observerId,
          role: usersTable.role,
          verificationStatus: usersTable.verificationStatus,
          deviceId: usersTable.deviceId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          trainingStatus: usersTable.trainingStatus,
          phoneNumber: usersTable.phoneNumber
          // Explicitly selecting fields instead of selecting all to avoid non-existent columns
        })
        .from(usersTable)
        .where(eq(usersTable.username, username));
      
      return user;
    } catch (error) {
      logger.error(`Error getting user by username: ${username}`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          password: usersTable.password,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          observerId: usersTable.observerId,
          role: usersTable.role,
          verificationStatus: usersTable.verificationStatus,
          deviceId: usersTable.deviceId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          trainingStatus: usersTable.trainingStatus,
          phoneNumber: usersTable.phoneNumber
        })
        .from(usersTable)
        .where(eq(usersTable.email, email));
      
      return user;
    } catch (error) {
      logger.error(`Error getting user by email: ${email}`, error);
      throw error;
    }
  }

  async getUserByObserverId(observerId: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.observerId, observerId));
      
      return user;
    } catch (error) {
      logger.error(`Error getting user by observerId: ${observerId}`, error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(usersTable);
    } catch (error) {
      logger.error("Error getting all users", error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Generate observer ID if not provided
      const observerId = generateObserverId();
      
      const [newUser] = await db
        .insert(usersTable)
        .values({
          ...user,
          observerId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newUser;
    } catch (error) {
      logger.error("Error creating user", error);
      throw error;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // For inserts, we don't need to provide an ID as it will be auto-generated
      if (userData.id) {
        logger.info(`Upserting user with ID: ${userData.id}`);
        
        // Check if the user exists first
        const existingUser = await this.getUser(userData.id);
        
        if (existingUser) {
          // Update existing user
          const [updatedUser] = await db
            .update(usersTable)
            .set({
              ...userData,
              updatedAt: new Date()
            })
            .where(eq(usersTable.id, userData.id))
            .returning();
          
          logger.info(`Updated existing user: ${userData.id}`);
          return updatedUser;
        }
      }
      
      // Create new user with generated observer ID
      const observerId = userData.observerId || generateObserverId();
      
      // Remove the id field for insert to let the database auto-generate it
      const { id, ...userDataWithoutId } = userData;
      
      const [newUser] = await db
        .insert(usersTable)
        .values({
          ...userDataWithoutId,
          observerId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      logger.info(`Created new user with ID: ${newUser.id} and observerId: ${observerId}`);
      return newUser;
    } catch (error) {
      logger.error(`Error upserting user`, error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(usersTable)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(usersTable.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user: ${id}`, error);
      throw error;
    }
  }

  // Implement other storage methods as needed
  
  // ID Card Template Methods
  async getAllIdCardTemplates(): Promise<IdCardTemplate[]> {
    try {
      return await db.select().from(idCardTemplates);
    } catch (error) {
      logger.error('Error getting all ID card templates', error);
      throw error;
    }
  }
  
  // Add stubs for required methods to satisfy the interface
  // These can be expanded later as needed
  
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId));
      
      return profile;
    } catch (error) {
      logger.error(`Error getting user profile for user: ${userId}`, error);
      throw error;
    }
  }
  
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    try {
      const [newProfile] = await db
        .insert(userProfiles)
        .values(profile)
        .returning();
      
      return newProfile;
    } catch (error) {
      logger.error(`Error creating user profile for user: ${profile.userId}`, error);
      throw error;
    }
  }
  
  async updateUserProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile | undefined> {
    try {
      const [updatedProfile] = await db
        .update(userProfiles)
        .set(data)
        .where(eq(userProfiles.userId, userId))
        .returning();
      
      return updatedProfile;
    } catch (error) {
      logger.error(`Error updating user profile for user: ${userId}`, error);
      throw error;
    }
  }

  // Stub implementations for remaining required methods
  // These should be expanded as needed for the application
  
  async getDocument(id: number): Promise<Document | undefined> {
    logger.warn('STUB: getDocument called, but it is not fully implemented.');
    return Promise.resolve(undefined);
  }
  
  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    logger.warn('STUB: getDocumentsByUserId called, but it is not fully implemented.');
    return Promise.resolve([]);
  }
  
  async createDocument(document: InsertDocument): Promise<Document> {
    logger.warn('STUB: createDocument called, but it is not fully implemented.');
    // To prevent downstream issues from a fake success, reject promise clearly.
    return Promise.reject(new Error('STUB: createDocument - This method is a stub and requires full implementation.'));
  }
  
  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    logger.warn('STUB: updateDocument called, but it is not fully implemented.');
    // To prevent downstream issues from a fake success, reject promise clearly.
    return Promise.reject(new Error('STUB: updateDocument - This method is a stub and requires full implementation.'));
  }
  
  async getPollingStation(id: number): Promise<PollingStation | undefined> {
    logger.warn('STUB: getPollingStation called, but it is not fully implemented.');
    return Promise.resolve(undefined);
  }
  
  async getAllPollingStations(): Promise<PollingStation[]> {
    logger.warn('STUB: getAllPollingStations called, but it is not fully implemented.');
    return Promise.resolve([]);
  }
  
  async createPollingStation(station: InsertPollingStation): Promise<PollingStation> {
    logger.warn('STUB: createPollingStation called, but it is not fully implemented.');
    return Promise.reject(new Error('STUB: createPollingStation - This method is a stub and requires full implementation.'));
  }
  
  async updatePollingStation(id: number, data: Partial<PollingStation>): Promise<PollingStation | undefined> {
    logger.warn('STUB: updatePollingStation called, but it is not fully implemented.');
    return Promise.reject(new Error('STUB: updatePollingStation - This method is a stub and requires full implementation.'));
  }
  
  async deletePollingStation(id: number): Promise<boolean> {
    logger.warn('STUB: deletePollingStation called, but it is not fully implemented.');
    return Promise.resolve(false); // Indicates no deletion occurred
  }
  
  async getAssignmentsByUserId(userId: number): Promise<Assignment[]> {
    logger.warn('STUB: getAssignmentsByUserId called, but it is not fully implemented.');
    return Promise.resolve([]);
  }
  
  async getAssignmentsByStationId(stationId: number): Promise<Assignment[]> {
    logger.warn('STUB: getAssignmentsByStationId called, but it is not fully implemented.');
    return Promise.resolve([]);
  }
  
  async getAssignment(id: number): Promise<Assignment | undefined> {
    logger.warn('STUB: getAssignment called, but it is not fully implemented.');
    return Promise.resolve(undefined);
  }
  
  async getActiveAssignments(userId: number): Promise<Assignment[]> {
    logger.warn('STUB: getActiveAssignments called, but it is not fully implemented.');
    return Promise.resolve([]);
  }
  
  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    logger.warn('STUB: createAssignment called, but it is not fully implemented.');
    return Promise.reject(new Error('STUB: createAssignment - This method is a stub and requires full implementation.'));
  }
  
  async updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment | undefined> {
    logger.warn('STUB: updateAssignment called, but it is not fully implemented.');
    return Promise.reject(new Error('STUB: updateAssignment - This method is a stub and requires full implementation.'));
  }
  
  // --- User Import Log Methods ---
  async getUserImportLog(importId: number): Promise<UserImportLog | undefined> {
    const [log] = await db
      .select()
      .from(userImportLogs)
      .where(eq(userImportLogs.id, importId));
    return log;
  }

  async updateUserImportLog(importId: number, data: Partial<UserImportLog>): Promise<void> {
    await db
      .update(userImportLogs)
      .set({ ...data })
      .where(eq(userImportLogs.id, importId));
  }

  // --- Bulk Create Users ---
  async bulkCreateUsers(users: InsertUser[], options: { defaultRole?: string; verificationStatus?: string; passwordHash?: (pwd: string) => string }): Promise<{ success: User[]; failures: { data: InsertUser; error: string }[] }> {
    const success: User[] = [];
    const failures: { data: InsertUser; error: string }[] = [];
    for (const user of users) {
      try {
        const userData = { ...user };
        if (user.password && options.passwordHash) {
          userData.password = options.passwordHash(user.password);
        }
        if (options.defaultRole) {
          (userData as any).role = options.defaultRole;
        }
        if (options.verificationStatus) {
          (userData as any).verificationStatus = options.verificationStatus;
        }
        const created = await this.createUser(userData as InsertUser);
        success.push(created);
      } catch (error: any) {
        failures.push({ data: user, error: error.message || 'Unknown error' });
      }
    }
    return { success, failures };
  }

  // --- ID Card Template Methods ---
  async getActiveIdCardTemplate(): Promise<IdCardTemplate | undefined> {
    const [template] = await db
      .select()
      .from(idCardTemplates)
      .where(eq(idCardTemplates.isActive, true));
    return template;
  }

  async createIdCardTemplate(template: InsertIdCardTemplate): Promise<IdCardTemplate> {
    const [newTemplate] = await db
      .insert(idCardTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  // Add more methods as needed to fulfill the interface
}