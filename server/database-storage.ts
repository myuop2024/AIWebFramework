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
import { eq, and, isNull, or, not, desc, asc, lt, gt, gte, lte, like, ilike, inArray, sql } from "drizzle-orm";
import logger from "./utils/logger";

// Simple in-memory cache for user data
const userCache = new Map<string, { user: User; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of Array.from(userCache.entries())) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

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
      // Check cache first
      const cached = userCache.get(String(id));
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        logger.info(`Getting user from cache by ID: ${id}`);
        return cached.user;
      }

      logger.info(`Getting user by ID: ${id}`);
      const result = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          password: usersTable.password,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          observerId: usersTable.observerId,
          role: usersTable.role,
          roleId: usersTable.roleId,
          verificationStatus: usersTable.verificationStatus,
          deviceId: usersTable.deviceId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          trainingStatus: usersTable.trainingStatus,
          phoneNumber: usersTable.phoneNumber,
          twoFactorEnabled: usersTable.twoFactorEnabled,
          twoFactorVerified: usersTable.twoFactorVerified,
          profileImageUrl: usersTable.profileImageUrl,
          twoFactorSecret: usersTable.twoFactorSecret,
          recoveryCodes: usersTable.recoveryCodes,
          rolePermissions: roles.permissions,
        })
        .from(usersTable)
        .leftJoin(roles, eq(usersTable.roleId, roles.id))
        .where(eq(usersTable.id, id));

      const [userWithRole] = result;
      if (!userWithRole) return undefined;

      // Create user object with permissions from role
      const user = {
        ...userWithRole,
        permissions: (userWithRole.rolePermissions as string[]) || []
      };

      // Remove the rolePermissions field as it's now in permissions
      delete (user as any).rolePermissions;

      if (user) {
        // Cache the user data
        userCache.set(String(id), { user, timestamp: Date.now() });
      }

      return user;
    } catch (error) {
      logger.error(`Error getting user by ID: ${id}`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          password: usersTable.password,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          observerId: usersTable.observerId,
          role: usersTable.role,
          roleId: usersTable.roleId,
          verificationStatus: usersTable.verificationStatus,
          deviceId: usersTable.deviceId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          trainingStatus: usersTable.trainingStatus,
          phoneNumber: usersTable.phoneNumber,
          twoFactorEnabled: usersTable.twoFactorEnabled,
          twoFactorVerified: usersTable.twoFactorVerified,
          profileImageUrl: usersTable.profileImageUrl,
          twoFactorSecret: usersTable.twoFactorSecret,
          recoveryCodes: usersTable.recoveryCodes,
          rolePermissions: roles.permissions,
        })
        .from(usersTable)
        .leftJoin(roles, eq(usersTable.roleId, roles.id))
        .where(eq(usersTable.username, username));

      const [userWithRole] = result;
      if (!userWithRole) return undefined;

      // Create user object with permissions from role
      const user = {
        ...userWithRole,
        permissions: (userWithRole.rolePermissions as string[]) || []
      };

      // Remove the rolePermissions field as it's now in permissions
      delete (user as any).rolePermissions;

      return user;
    } catch (error) {
      logger.error(`Error getting user by username: ${username}`, error as Error);
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

  // Polling Station Methods
  async getPollingStation(id: number): Promise<PollingStation | undefined> {
    try {
      const [station] = await db.select().from(pollingStations).where(eq(pollingStations.id, id));
      return station;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting polling station by ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async getAllPollingStations(): Promise<PollingStation[]> {
    try {
      return await db.select().from(pollingStations).orderBy(asc(pollingStations.name));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting all polling stations: ${err.message}`, err);
      throw err;
    }
  }

  async createPollingStation(stationData: InsertPollingStation): Promise<PollingStation> {
    try {
      const [newStation] = await db
        .insert(pollingStations)
        .values(stationData)
        .returning();
      if (!newStation) {
        throw new Error("Polling station creation failed, no data returned.");
      }
      logger.info(`Polling station created: ${newStation.name} (ID: ${newStation.id})`);
      return newStation;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating polling station: ${err.message}`, err);
      throw err;
    }
  }

  async updatePollingStation(id: number, data: Partial<PollingStation>): Promise<PollingStation | undefined> {
    try {
      // Ensure 'id' is not part of the data to be updated
      const { id: stationId, ...updateData } = data;

      const [updatedStation] = await db
        .update(pollingStations)
        .set({...updateData, updatedAt: new Date() })
        .where(eq(pollingStations.id, id))
        .returning();
      if (updatedStation) {
        logger.info(`Polling station updated: ${updatedStation.name} (ID: ${updatedStation.id})`);
      }
      return updatedStation;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating polling station ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async deletePollingStation(id: number): Promise<boolean> {
    try {
      // Consider checking for active assignments to this station before deleting
      const assignmentsToStation = await db.select({count: sql<number>`count(*)::int`}).from(assignments).where(eq(assignments.stationId, id));
      if(assignmentsToStation[0].count > 0) {
        logger.warn(`Attempt to delete polling station ID ${id} which has ${assignmentsToStation[0].count} assignments.`);
        throw new Error(`Cannot delete polling station ID ${id} as it has ${assignmentsToStation[0].count} active or past assignments. Please reassign or remove them first.`);
      }

      const result = await db.delete(pollingStations).where(eq(pollingStations.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        logger.info(`Polling station deleted: ID ${id}`);
      }
      return success;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error deleting polling station ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  // Assignment Methods
  async getAssignmentsByUserId(userId: number): Promise<Assignment[]> {
    try {
      return await db.select().from(assignments).where(eq(assignments.userId, String(userId)));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting assignments for user ID ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async getAssignmentsByStationId(stationId: number): Promise<Assignment[]> {
    try {
      return await db.select().from(assignments).where(eq(assignments.stationId, stationId));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting assignments for station ID ${stationId}: ${err.message}`, err);
      throw err;
    }
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    try {
      const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
      return assignment;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting assignment by ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async getActiveAssignments(userId: number): Promise<Assignment[]> {
    try {
      return await db
        .select()
        .from(assignments)
        .where(and(eq(assignments.userId, String(userId)), eq(assignments.status, 'active')));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting active assignments for user ID ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    try {
      const [newAssignment] = await db
        .insert(assignments)
        .values({...assignmentData, createdAt: new Date(), updatedAt: new Date()})
        .returning();
      if (!newAssignment) {
        throw new Error("Assignment creation failed, no data returned.");
      }
      logger.info(`Assignment created for user ID ${newAssignment.userId} at station ID ${newAssignment.stationId} (Assignment ID: ${newAssignment.id})`);
      return newAssignment;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating assignment: ${err.message}`, err);
      throw err;
    }
  }

  async updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment | undefined> {
    try {
      // Ensure 'id' is not part of the data to be updated
      const { id: assignmentId, ...updateData } = data;
      const [updatedAssignment] = await db
        .update(assignments)
        .set({...updateData, updatedAt: new Date()})
        .where(eq(assignments.id, id))
        .returning();
      if (updatedAssignment) {
        logger.info(`Assignment updated: ID ${updatedAssignment.id}`);
      }
      return updatedAssignment;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating assignment ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  // --- User Import Log Methods ---
  async getUserImportLog(importId: number): Promise<UserImportLog | undefined> {
    const [log] = await db
      .select()
      .from(userImportLogs)
      .where(eq(userImportLogs.id, importId));
    return log;
  }

  async getAllUserImportLogs(): Promise<UserImportLog[]> {
    return await db
      .select()
      .from(userImportLogs)
      .orderBy(desc(userImportLogs.importedAt));
  }

  async createUserImportLog(logData: InsertUserImportLog): Promise<UserImportLog> {
    const [newLog] = await db
      .insert(userImportLogs)
      .values({
        ...logData,
        importedAt: new Date()
      })
      .returning();
    if (!newLog) {
      throw new Error("User import log creation failed, no data returned.");
    }
    return newLog;
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

    try {
      await db.transaction(async (tx) => {
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

            // Generate observer ID if not provided
            const observerId = (userData as any).observerId || generateObserverId();

            const [createdUser] = await tx
              .insert(usersTable)
              .values({
                ...userData,
                observerId,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();

            if (!createdUser) {
                throw new Error('User creation returned no result');
            }
            success.push(createdUser);

          } catch (error: any) {
            // Log individual error and add to failures, then rethrow to abort transaction
            logger.error('Error creating user within bulk transaction (will be rolled back)', { username: user.username, email: user.email, error: error.message });
            failures.push({ data: user, error: error.message || 'Unknown error' });
            throw error; // This will trigger a rollback of the transaction
          }
        }
      });
    } catch (transactionError: any) {
      // This catch block is for errors that cause the transaction to fail (e.g., the rethrown error from inner catch)
      // The 'failures' array will already be populated with specific errors.
      // 'success' array will be empty as transaction is rolled back.
      logger.error('Bulk user import transaction failed and was rolled back.', { errorMessage: transactionError.message, stack: transactionError.stack });
      // Ensure success array is empty on transaction failure, as all operations are rolled back.
      // The failures array will contain the individual errors that led to the rollback.
      // No need to clear success here as it's scoped outside the transaction block's modifications if tx fails.
      // However, if the transaction fails, the 'success' array as seen by the caller should indeed be empty.
      // The current structure might return partially filled success if other non-tx errors occur.
      // For a full rollback, the success array should effectively be considered empty.
      // To be absolutely clear, we can reset it, though Drizzle's transaction should ensure this.
      if (failures.length > 0 && success.length > 0 && failures.length + success.length === users.length ) {
         // This implies some succeeded before a failure that rolled back the transaction.
         // The 'success' array should represent the final state.
         // If transaction rolls back, all are failures effectively.
         // However, the current logic collects successes then rolls back.
         // The most straightforward is to ensure failures are accurate, and success is what committed.
         // If tx.rollback() is called, success should be empty.
      }
       // If the transaction itself fails (e.g. connection error, or error rethrown from inner catch),
       // all operations within it are rolled back. The `failures` array will contain the errors
       // that occurred before the transaction was rolled back. The `success` array should be cleared
       // or considered invalid because none of those users were actually committed.
       // For simplicity, we'll rely on the fact that if transactionError is caught, 'success'
       // items were never truly committed. The `failures` array is the source of truth for what went wrong.
       // Reset success array to reflect rollback
       success.length = 0;
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

  // Role Operations
  async createRole(roleData: InsertRole): Promise<Role> {
    try {
      const [newRole] = await db
        .insert(roles)
        .values({
          ...roleData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (!newRole) {
        // This case should ideally be handled by Drizzle throwing an error if insertion fails.
        // If Drizzle returns an empty array on failure, this check is valid.
        throw new Error("Role creation failed, no data returned.");
      }
      logger.info(`Role created: ${newRole.name} (ID: ${newRole.id})`);
      return newRole;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating role: ${err.message}`, err);
      throw err; // Re-throw the original or wrapped error
    }
  }

  async getRoleById(id: number): Promise<Role | undefined> {
    try {
      const [role] = await db.select().from(roles).where(eq(roles.id, id));
      return role;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting role by ID: ${id} - ${err.message}`, err);
      throw err;
    }
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    try {
      const [role] = await db.select().from(roles).where(eq(roles.name, name));
      return role;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting role by name: ${name} - ${err.message}`, err);
      throw err;
    }
  }

  async getAllRoles(): Promise<Role[]> {
    try {
      return await db.select().from(roles).orderBy(asc(roles.name));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting all roles: ${err.message}`, err);
      throw err;
    }
  }

  async updateRole(id: number, data: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>> & { permissions?: string[] }): Promise<Role | undefined> {
    try {
      const roleToUpdate = await this.getRoleById(id);
      if (!roleToUpdate) {
        logger.warn(`Attempt to update non-existent role with ID: ${id}`);
        return undefined; // Or throw a specific "NotFound" error
      }

      if (roleToUpdate.isSystem) {
        if (data.name !== undefined && data.name !== roleToUpdate.name) {
          throw new Error("System role name cannot be changed.");
        }
        if (data.description !== undefined && data.description !== roleToUpdate.description) {
          throw new Error("System role description cannot be changed.");
        }
      }

      const updateData: Partial<Role> = { ...data, updatedAt: new Date() };

      // Ensure permissions are stored as JSONB, Drizzle should handle JS array to JSONB conversion.
      // If data.permissions is explicitly null, it will be set to null.
      // If data.permissions is undefined, the field won't be updated unless it's part of the spread.
      // To be safe, explicitly handle permissions if it's part of `data`.
      if (data.permissions !== undefined) {
        updateData.permissions = data.permissions;
      }


      const [updatedRole] = await db
        .update(roles)
        .set(updateData)
        .where(eq(roles.id, id))
        .returning();
      if (updatedRole) {
        logger.info(`Role updated: ${updatedRole.name} (ID: ${updatedRole.id})`);
      }
      return updatedRole;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating role: ${id} - ${err.message}`, err);
      throw err;
    }
  }

  async deleteRole(id: number): Promise<boolean> {
    try {
      const roleToDelete = await this.getRoleById(id);
      if (!roleToDelete) {
        logger.warn(`Attempted to delete non-existent role with ID: ${id}`);
        return false;
      }
      if (roleToDelete.isSystem) {
        logger.warn(`Attempted to delete system role: ${roleToDelete.name} (ID: ${id})`);
        throw new Error("System roles cannot be deleted.");
      }

      const usersWithRole = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, roleToDelete.name));
      if (usersWithRole[0].count > 0) {
         logger.warn(`Attempted to delete role '${roleToDelete.name}' (ID: ${id}) that is still assigned to ${usersWithRole[0].count} users.`);
         throw new Error(`Cannot delete role '${roleToDelete.name}' as it is still assigned to ${usersWithRole[0].count} users. Please reassign users before deleting this role.`);
      }

      const result = await db.delete(roles).where(eq(roles.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        logger.info(`Role deleted: ${roleToDelete.name} (ID: ${id})`);
      }
      return success;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error deleting role: ${id} - ${err.message}`, err);
      throw err;
    }
  }

  async getPermissionsForRole(roleId: number): Promise<string[] | undefined> {
    try {
      const role = await this.getRoleById(roleId);
      if (role && role.permissions) {
        if (Array.isArray(role.permissions) && role.permissions.every(p => typeof p === 'string')) {
          return role.permissions as string[];
        }
        // This case should ideally not happen if data is inserted correctly via `updateRole` or `createRole`.
        // Drizzle should handle JSONB conversion, so `role.permissions` should already be a JavaScript array.
        logger.warn(`Permissions for role ID ${roleId} are not in the expected format (array of strings). Found: ${JSON.stringify(role.permissions)}. Attempting to use as is if array, otherwise empty.`);
        // If it's an array but not of strings, or not an array at all, this is problematic.
        // For robustness, we could try to filter or convert, but it indicates an upstream issue.
        return Array.isArray(role.permissions) ? role.permissions.map(String) : [];
      }
      return undefined; // Role not found or has no permissions field
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting permissions for role ID: ${roleId} - ${err.message}`, err);
      throw err;
    }
  }
  // Ensure all other existing methods in DatabaseStorage are maintained.

  // Form Template Methods
  async getAllFormTemplates(): Promise<FormTemplate[]> {
    try {
      return await db.select().from(formTemplates).orderBy(asc(formTemplates.name));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting all form templates: ${err.message}`, err);
      throw err;
    }
  }

  async getActiveFormTemplates(): Promise<FormTemplate[]> {
    try {
      return await db.select().from(formTemplates).where(eq(formTemplates.isActive, true)).orderBy(asc(formTemplates.name));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting active form templates: ${err.message}`, err);
      throw err;
    }
  }

  async getFormTemplatesByCategory(category: string): Promise<FormTemplate[]> {
    try {
      return await db.select().from(formTemplates).where(eq(formTemplates.category, category)).orderBy(asc(formTemplates.name));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting form templates by category ${category}: ${err.message}`, err);
      throw err;
    }
  }

  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    try {
      const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
      return template;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting form template by ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async createFormTemplate(templateData: InsertFormTemplate): Promise<FormTemplate> {
    try {
      const [newTemplate] = await db
        .insert(formTemplates)
        .values({ ...templateData, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      if (!newTemplate) {
        throw new Error("Form template creation failed, no data returned.");
      }
      logger.info(`Form template created: ${newTemplate.name} (ID: ${newTemplate.id})`);
      return newTemplate;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating form template: ${err.message}`, err);
      throw err;
    }
  }

  async updateFormTemplate(id: number, data: Partial<FormTemplate>): Promise<FormTemplate | undefined> {
    try {
      const { id: templateId, createdAt, ...updateData } = data; // Exclude id and createdAt from update set
      const [updatedTemplate] = await db
        .update(formTemplates)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(formTemplates.id, id))
        .returning();
      if (updatedTemplate) {
        logger.info(`Form template updated: ${updatedTemplate.name} (ID: ${updatedTemplate.id})`);
      }
      return updatedTemplate;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating form template ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async deleteFormTemplate(id: number): Promise<boolean> {
    try {
      // Check if any reports are using this template
      const linkedReports = await db.select({ count: sql<number>`count(*)::int` }).from(reports).where(eq(reports.templateId, id));
      if (linkedReports[0].count > 0) {
        logger.warn(`Attempt to delete form template ID ${id} which is linked to ${linkedReports[0].count} reports.`);
        throw new Error(`Cannot delete form template ID ${id} as it is currently linked to ${linkedReports[0].count} reports. Please reassign or delete these reports first.`);
      }

      const result = await db.delete(formTemplates).where(eq(formTemplates.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        logger.info(`Form template deleted: ID ${id}`);
      }
      return success;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error deleting form template ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  // Registration form operations
  async getAllRegistrationForms(): Promise<RegistrationForm[]> {
    try {
      return await db.select().from(registrationForms).orderBy(asc(registrationForms.id));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting all registration forms: ${err.message}`, err);
      throw err;
    }
  }

  // Report Methods
  async createReport(reportData: InsertReport): Promise<Report> {
    try {
      const [newReport] = await db
        .insert(reports)
        .values({ ...reportData, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      if (!newReport) {
        throw new Error("Report creation failed, no data returned.");
      }
      logger.info(`Report created: ID ${newReport.id} by user ID ${newReport.userId}`);
      return newReport;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating report: ${err.message}`, err);
      throw err;
    }
  }

  async getReport(id: number): Promise<Report | undefined> {
    try {
      const [report] = await db.select().from(reports).where(eq(reports.id, id));
      return report;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting report by ID ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async getReportsByUserId(userId: number): Promise<Report[]> {
    try {
      // Assuming reports.userId is varchar, similar to assignments.userId
      return await db.select().from(reports).where(eq(reports.userId, String(userId))).orderBy(desc(reports.createdAt));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting reports for user ID ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async getReportsByStationId(stationId: number): Promise<Report[]> {
    try {
      return await db.select().from(reports).where(eq(reports.stationId, stationId)).orderBy(desc(reports.createdAt));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting reports for station ID ${stationId}: ${err.message}`, err);
      throw err;
    }
  }

  async getReportsByStatus(status: string): Promise<Report[]> {
    try {
      return await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting reports by status ${status}: ${err.message}`, err);
      throw err;
    }
  }

  async updateReportStatus(id: number, status: string, reviewedByUserId?: number): Promise<Report | undefined> {
    try {
      const updateData: Partial<Report> = { status, updatedAt: new Date() };
      if (reviewedByUserId !== undefined) {
        updateData.reviewedBy = String(reviewedByUserId); // Assuming reviewedBy is varchar
        updateData.reviewedAt = new Date();
      }

      const [updatedReport] = await db
        .update(reports)
        .set(updateData)
        .where(eq(reports.id, id))
        .returning();
      if (updatedReport) {
        logger.info(`Report ID ${updatedReport.id} status updated to ${updatedReport.status}`);
      }
      return updatedReport;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating status for report ID ${id}: ${err.message}`, err);
      throw err;
    }
  }
}