import { db } from "./db";
import { IStorage } from "./storage";
import crypto from "crypto";
import { 
  users, 
  userProfiles, 
  systemSettings, 
  pollingStations, 
  assignments, 
  documents, 
  reports, 
  reportAttachments,
  formTemplates,
  events,
  eventParticipation,
  faqs,
  news,
  messages,
  registrationForms,
  userImportLogs,
  photoApprovals,
  roles,
  groups,
  groupMemberships,
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
  type Group,
  type InsertGroup,
  type GroupMembership,
  type InsertGroupMembership,
  type IdCardTemplate,
  type InsertIdCardTemplate,
  achievements,
  userAchievements,
  userGameProfile,
  leaderboards,
  leaderboardEntries,
  achievementProgress,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type UserGameProfile,
  type InsertUserGameProfile,
  type Leaderboard,
  type InsertLeaderboard,
  type LeaderboardEntry,
  type InsertLeaderboardEntry,
  type AchievementProgress,
  type InsertAchievementProgress,
  ErrorLogQueryOptions,
  ErrorLogDeleteCriteria
} from "@shared/schema";
import { eq, and, isNull, or, not, desc, asc, lt, gt, gte, lte, like, ilike, inArray, sql } from "drizzle-orm";
import logger from "./utils/logger";

// Simple in-memory cache for user data
const userCache = new Map<string, { user: User; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Request-level cache to prevent multiple lookups within the same request
const requestCache = new Map<string, User>();

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
  // Clear request-level cache to prevent memory leaks and repeated lookups
  clearRequestCache(): void {
    requestCache.clear();
  }

  // Set user context for RLS
  async setUserContext(userId: number, userRole: string): Promise<void> {
    await db.execute(sql`SELECT auth.set_user_context(${userId}, ${userRole})`);
  }

  // Clear user context
  async clearUserContext(): Promise<void> {
    await db.execute(sql`SELECT set_config('app.current_user_id', '', true)`);
    await db.execute(sql`SELECT set_config('app.current_user_role', '', true)`);
  }

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
      // Check request-level cache first to prevent multiple lookups in same request
      const requestKey = `user_${id}`;
      if (requestCache.has(requestKey)) {
        return requestCache.get(requestKey);
      }

      // Check persistent cache
      const cached = userCache.get(String(id));
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        // Store in request cache and return without any logging
        requestCache.set(requestKey, cached.user);
        return cached.user;
      }

      // Only log actual database queries, not cache hits
      logger.info(`Fetching user from database by ID: ${id}`);
      const result = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          observerId: users.observerId,
          role: users.role,
          roleId: users.roleId,
          verificationStatus: users.verificationStatus,
          deviceId: users.deviceId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          trainingStatus: users.trainingStatus,
          phoneNumber: users.phoneNumber,
          twoFactorEnabled: users.twoFactorEnabled,
          twoFactorVerified: users.twoFactorVerified,
          profileImageUrl: users.profileImageUrl,
          twoFactorSecret: users.twoFactorSecret,
          recoveryCodes: users.recoveryCodes,
          rolePermissions: roles.permissions,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, id));

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
        // Cache the user data in both caches
        userCache.set(String(id), { user, timestamp: Date.now() });
        requestCache.set(`user_${id}`, user);
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
          id: users.id,
          username: users.username,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          observerId: users.observerId,
          role: users.role,
          roleId: users.roleId,
          verificationStatus: users.verificationStatus,
          deviceId: users.deviceId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          trainingStatus: users.trainingStatus,
          phoneNumber: users.phoneNumber,
          twoFactorEnabled: users.twoFactorEnabled,
          twoFactorVerified: users.twoFactorVerified,
          profileImageUrl: users.profileImageUrl,
          twoFactorSecret: users.twoFactorSecret,
          recoveryCodes: users.recoveryCodes,
          rolePermissions: roles.permissions,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.username, username));

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
          id: users.id,
          username: users.username,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          observerId: users.observerId,
          role: users.role,
          verificationStatus: users.verificationStatus,
          deviceId: users.deviceId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          trainingStatus: users.trainingStatus,
          phoneNumber: users.phoneNumber
        })
        .from(users)
        .where(eq(users.email, email));

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
        .from(users)
        .where(eq(users.observerId, observerId));

      return user;
    } catch (error) {
      logger.error(`Error getting user by observerId: ${observerId}`, error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
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
        .insert(users)
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
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date()
            })
            .where(eq(users.id, userData.id))
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
        .insert(users)
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
        .update(users)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
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
    try {
      const [doc] = await db.select().from(documents).where(eq(documents.id, id));
      return doc;
    } catch (error) {
      logger.error(`Error getting document by ID ${id}: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    try {
      return await db.select().from(documents).where(eq(documents.userId, userId));
    } catch (error) {
      logger.error(`Error getting documents for user ID ${userId}: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    try {
      const [newDoc] = await db.insert(documents).values(document).returning();
      if (!newDoc) throw new Error('Document creation failed, no data returned.');
      logger.info(`Document created: ${newDoc.name} (ID: ${newDoc.id})`);
      return newDoc;
    } catch (error) {
      logger.error(`Error creating document: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    try {
      const { id: docId, ...updateData } = data;
      const [updatedDoc] = await db.update(documents).set({...updateData, updatedAt: new Date()}).where(eq(documents.id, id)).returning();
      if (updatedDoc) logger.info(`Document updated: ID ${updatedDoc.id}`);
      return updatedDoc;
    } catch (error) {
      logger.error(`Error updating document ID ${id}: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
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
              .insert(users)
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
      // The failures array will contain the individual errors.
      if (failures.length > 0 && success.length > 0 && failures.length + success.length === users.length ) {
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
      // To be safe, explicitly handle permissions if the part of `data`.
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

      const usersWithRole = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, roleToDelete.name));
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

  // Group Operations
  async createGroup(groupData: InsertGroup): Promise<Group> {
    try {
      const [newGroup] = await db
        .insert(groups)
        .values({
          ...groupData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (!newGroup) {
        throw new Error("Group creation failed, no data returned.");
      }
      logger.info(`Group created: ${newGroup.name} (ID: ${newGroup.id})`);
      return newGroup;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating group: ${err.message}`, err);
      throw err;
    }
  }

  async getGroupById(id: number): Promise<Group & { members?: User[] } | undefined> {
    try {
      const [group] = await db.select().from(groups).where(eq(groups.id, id));
      if (!group) return undefined;

      // Get group members
      const members = await this.getGroupMembers(id);
      return { ...group, members };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting group by ID: ${id} - ${err.message}`, err);
      throw err;
    }
  }

  async getGroupByName(name: string): Promise<Group | undefined> {
    try {
      const [group] = await db.select().from(groups).where(eq(groups.name, name));
      return group;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting group by name: ${name} - ${err.message}`, err);
      throw err;
    }
  }

  async getAllGroups(): Promise<(Group & { members?: User[] })[]> {
    try {
      const allGroups = await db.select().from(groups).orderBy(asc(groups.name));

      // Get members for each group
      const groupsWithMembers = await Promise.all(
        allGroups.map(async (group) => {
          const members = await this.getGroupMembers(group.id);
          return { ...group, members };
        })
      );

      return groupsWithMembers;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting all groups: ${err.message}`, err);
      throw err;
    }
  }

  async updateGroup(id: number, data: Partial<Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<Group | undefined> {
    try {
      const groupToUpdate = await this.getGroupById(id);
      if (!groupToUpdate) {
        logger.warn(`Attempt to update non-existent group with ID: ${id}`);
        return undefined;
      }

      const updateData: Partial<Group> = { ...data, updatedAt: new Date() };

      if (data.permissions !== undefined) {
        updateData.permissions = data.permissions;
      }

      const [updatedGroup] = await db
        .update(groups)
        .set(updateData)
        .where(eq(groups.id, id))
        .returning();
      if (updatedGroup) {
        logger.info(`Group updated: ${updatedGroup.name} (ID: ${updatedGroup.id})`);
      }
      return updatedGroup;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating group: ${id} - ${err.message}`, err);
      throw err;
    }
  }

  async deleteGroup(id: number): Promise<boolean> {
    try {
      const groupToDelete = await this.getGroupById(id);
      if (!groupToDelete) {
        logger.warn(`Attempted to delete non-existent group with ID: ${id}`);
        return false;
      }

      // Remove all group memberships first
      await db.delete(groupMemberships).where(eq(groupMemberships.groupId, id));

      const result = await db.delete(groups).where(eq(groups.id, id)).returning();
      const success = result.length > 0;
      if (success) {
        logger.info(`Group deleted: ${groupToDelete.name} (ID: ${id})`);
      }
      return success;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error deleting group: ${id} - ${err.message}`, err);
      throw err;
    }
  }

  // Group membership operations
  async addGroupMember(groupId: number, userId: number, addedBy?: number): Promise<GroupMembership> {
    try {
      // Check if membership already exists
      const [existing] = await db
        .select()
        .from(groupMemberships)
        .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)));

      if (existing) {
        throw new Error(`User ${userId} is already a member of group ${groupId}`);
      }

      const [membership] = await db
        .insert(groupMemberships)
        .values({
          groupId,
          userId,
          addedBy,
          joinedAt: new Date(),
        })
        .returning();

      if (!membership) {
        throw new Error("Group membership creation failed, no data returned.");
      }

      logger.info(`User ${userId} added to group ${groupId}`);
      return membership;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error adding user ${userId} to group ${groupId}: ${err.message}`, err);
      throw err;
    }
  }

  async addGroupMembers(groupId: number, userIds: number[], addedBy?: number): Promise<GroupMembership[]> {
    try {
      const memberships: GroupMembership[] = [];

      for (const userId of userIds) {
        try {
          const membership = await this.addGroupMember(groupId, userId, addedBy);
          memberships.push(membership);
        } catch (error) {
          // Log error but continue with other users
          logger.warn(`Failed to add user ${userId} to group ${groupId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return memberships;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error adding multiple users to group ${groupId}: ${err.message}`, err);
      throw err;
    }
  }

  async removeGroupMember(groupId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(groupMemberships)
        .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
        .returning();

      const success = result.length > 0;
      if (success) {
        logger.info(`User ${userId} removed from group ${groupId}`);
      }
      return success;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error removing user ${userId} from group ${groupId}: ${err.message}`, err);
      throw err;
    }
  }

  async setGroupMembers(groupId: number, userIds: number[], addedBy?: number): Promise<void> {
    try {
      // Remove all existing memberships
      await db.delete(groupMemberships).where(eq(groupMemberships.groupId, groupId));

      // Add new memberships
      if (userIds.length > 0) {
        await this.addGroupMembers(groupId, userIds, addedBy);
      }

      logger.info(`Group ${groupId} members set to: [${userIds.join(', ')}]`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error setting members for group ${groupId}: ${err.message}`, err);
      throw err;
    }
  }

  async getGroupMembers(groupId: number): Promise<User[]> {
    try {
      const members = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          observerId: users.observerId,
          phoneNumber: users.phoneNumber,
          verificationStatus: users.verificationStatus,
          createdAt: users.createdAt,
          profileImageUrl: users.profileImageUrl,
          updatedAt: users.updatedAt,
        })
        .from(groupMemberships)
        .innerJoin(users, eq(groupMemberships.userId, users.id))
        .where(eq(groupMemberships.groupId, groupId))
        .orderBy(asc(users.firstName), asc(users.lastName));

      return members;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting members for group ${groupId}: ${err.message}`, err);
      throw err;
    }
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    try {
      const userGroups = await db
        .select({
          id: groups.id,
          name: groups.name,
          description: groups.description,
          permissions: groups.permissions,
          createdAt: groups.createdAt,
          updatedAt: groups.updatedAt,
          createdBy: groups.createdBy,
        })
        .from(groupMemberships)
        .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
        .where(eq(groupMemberships.userId, userId))
        .orderBy(asc(groups.name));

      return userGroups;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting groups for user ${userId}: ${err.message}`, err);
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

  // Communication operations
  async getRecentConversations(userId: number): Promise<any[]> {
    try {
      // Using sql tagged template for a more complex query involving CTE and window functions.
      // This correctly fetches the latest message for each conversation.
      const query = sql`
        WITH user_conversations AS (
            SELECT
                m.id as message_id,
                m.content as last_message_content,
                m.sent_at as last_message_sent_at,
                m.type as last_message_type,
                m.sender_id as last_message_sender_id,
                CASE
                    WHEN m.sender_id = ${userId} THEN m.receiver_id
                    ELSE m.sender_id
                END as other_user_id,
                ROW_NUMBER() OVER (PARTITION BY
                    CASE
                        WHEN m.sender_id = ${userId} THEN m.receiver_id
                        ELSE m.sender_id
                    END
                    ORDER BY m.sent_at DESC
                ) as rn
            FROM ${messages} m
            WHERE m.sender_id = ${userId} OR m.receiver_id = ${userId}
        )
        SELECT
            uc.message_id as "id", -- ID of the latest message in conversation
            uc.other_user_id as "otherUserId",
            other_user.username as "username",
            other_user.first_name as "firstName", -- For richer UI if needed
            other_user.last_name as "lastName",   -- For richer UI if needed
            other_user.profile_image_url as "profileImage", -- For richer UI if needed
            uc.last_message_content as "lastMessage",
            uc.last_message_sent_at as "lastMessageAt",
            uc.last_message_type as "lastMessageType",
            uc.last_message_sender_id as "lastMessageSenderId", 
            (
                SELECT COUNT(*)::int
                FROM ${messages} unread_msgs
                WHERE unread_msgs.receiver_id = ${userId}
                  AND unread_msgs.sender_id = uc.other_user_id
                  AND unread_msgs.read = FALSE
            ) as "unreadCount"
        FROM user_conversations uc
        JOIN ${users} other_user ON other_user.id = uc.other_user_id
        WHERE uc.rn = 1
        ORDER BY uc.last_message_sent_at DESC
        LIMIT 50;
      `;
      
      // Execute the raw query. Adjust if your db driver returns rows differently (e.g., result.rows)
      // For Drizzle with Neon serverless or similar pg-based drivers, direct result is often the array of rows.
      const result = await db.execute(query);
      return result as any[]; // Cast to any[] as the return type is broad. Frontend will map.
    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      throw error;
    }
  }

  async getMessagesBetweenUsers(userId: number, otherUserId: number): Promise<Message[]> {
    try {
      const result = await db
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
            and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
          )
        )
        .orderBy(asc(messages.sentAt));

      return result;
    } catch (error) {
      logger.error('Error getting messages between users:', error);
      throw error;
    }
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const [created] = await db.insert(messages).values({
        ...message,
        sentAt: message.sentAt || new Date()
      }).returning();
      return created;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating message from ${message.senderId} to ${message.receiverId}: ${err.message}`, err);
      throw err;
    }
  }

  async getMessage(id: number): Promise<Message | undefined> {
    try {
      const [msg] = await db.select().from(messages).where(eq(messages.id, id));
      return msg;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting message ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    try {
      const [updated] = await db
        .update(messages)
        .set({ read: true })
        .where(eq(messages.id, id))
        .returning();
      return updated;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error marking message ${id} as read: ${err.message}`, err);
      throw err;
    }
  }

  async markAllMessagesAsRead(senderId: number, receiverId: number): Promise<number> {
    try {
      const updated = await db
        .update(messages)
        .set({ read: true })
        .where(and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId),
          eq(messages.read, false)
        ))
        .returning({ id: messages.id });
      return updated.length;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error marking all messages from ${senderId} to ${receiverId} as read: ${err.message}`, err);
      throw err;
    }
  }

  

  // Achievement system operations
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      return await db.select().from(achievements).where(eq(achievements.isActive, true)).orderBy(asc(achievements.category), asc(achievements.title));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting all achievements: ${err.message}`, err);
      throw err;
    }
  }

  async getAchievement(id: number): Promise<Achievement | undefined> {
    try {
      const [achievement] = await db.select().from(achievements).where(eq(achievements.id, id));
      return achievement;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting achievement ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    try {
      const [created] = await db.insert(achievements).values(achievement).returning();
      logger.info(`Created achievement: ${created.title}`);
      return created;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating achievement: ${err.message}`, err);
      throw err;
    }
  }

  async updateAchievement(id: number, data: Partial<Achievement>): Promise<Achievement | undefined> {
    try {
      const [updated] = await db.update(achievements).set({ ...data, updatedAt: new Date() }).where(eq(achievements.id, id)).returning();
      if (updated) {
        logger.info(`Updated achievement ${id}: ${updated.title}`);
      }
      return updated;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating achievement ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async deleteAchievement(id: number): Promise<boolean> {
    try {
      await db.update(achievements).set({ isActive: false }).where(eq(achievements.id, id));
      logger.info(`Deactivated achievement ${id}`);
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error deleting achievement ${id}: ${err.message}`, err);
      return false;
    }
  }

  // User achievement operations
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    try {
      return await db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(desc(userAchievements.earnedAt));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting user achievements for ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async awardAchievement(userId: number, achievementId: number): Promise<UserAchievement> {
    try {
      // Check if user already has this achievement
      const existing = await this.checkAchievementEarned(userId, achievementId);
      if (existing) {
        throw new Error(`User ${userId} already has achievement ${achievementId}`);
      }

      const [awarded] = await db.insert(userAchievements).values({
        userId,
        achievementId
      }).returning();

      // Update user points
      const achievement = await this.getAchievement(achievementId);
      if (achievement) {
        await this.updateUserPoints(userId, achievement.points);
      }

      logger.info(`Awarded achievement ${achievementId} to user ${userId}`);
      return awarded;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error awarding achievement ${achievementId} to user ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async checkAchievementEarned(userId: number, achievementId: number): Promise<boolean> {
    try {
      const [earned] = await db.select().from(userAchievements).where(
        and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId))
      );
      return !!earned;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error checking achievement ${achievementId} for user ${userId}: ${err.message}`, err);
      return false;
    }
  }

  // User game profile operations
  async getUserGameProfile(userId: number): Promise<UserGameProfile | undefined> {
    try {
      const [profile] = await db.select().from(userGameProfile).where(eq(userGameProfile.userId, userId));
      return profile;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting game profile for user ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async createUserGameProfile(profile: InsertUserGameProfile): Promise<UserGameProfile> {
    try {
      const [created] = await db.insert(userGameProfile).values(profile).returning();
      logger.info(`Created game profile for user ${profile.userId}`);
      return created;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating game profile: ${err.message}`, err);
      throw err;
    }
  }

  async updateUserGameProfile(userId: number, data: Partial<UserGameProfile>): Promise<UserGameProfile | undefined> {
    try {
      const [updated] = await db.update(userGameProfile).set({ ...data, updatedAt: new Date() }).where(eq(userGameProfile.userId, userId)).returning();
      return updated;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating game profile for user ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async updateUserPoints(userId: number, points: number): Promise<UserGameProfile | undefined> {
    try {
      let profile = await this.getUserGameProfile(userId);

      if (!profile) {
        // Create initial profile if it doesn't exist
        profile = await this.createUserGameProfile({ userId });
      }

      const newTotalPoints = profile.totalPoints + points;
      const newCurrentLevelPoints = profile.currentLevelPoints + points;

      // Calculate level progression (100 points per level)
      const pointsPerLevel = 100;
      let newLevel = profile.level;
      let remainingPoints = newCurrentLevelPoints;

      while (remainingPoints >= pointsPerLevel) {
        remainingPoints -= pointsPerLevel;
        newLevel++;
      }

      const pointsToNextLevel = pointsPerLevel - remainingPoints;

      const [updated] = await db.update(userGameProfile).set({
        totalPoints: newTotalPoints,
        level: newLevel,
        currentLevelPoints: remainingPoints,
        pointsToNextLevel,
        updatedAt: new Date()
      }).where(eq(userGameProfile.userId, userId)).returning();

      if (newLevel > profile.level) {
        logger.info(`User ${userId} leveled up to level ${newLevel}!`);
      }

      return updated;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating points for user ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async updateUserStreak(userId: number): Promise<UserGameProfile | undefined> {
    try {
      let profile = await this.getUserGameProfile(userId);

      if (!profile) {
        profile = await this.createUserGameProfile({ userId });
      }

      const today = new Date().toISOString().split('T')[0];
      const lastActiveDate = profile.lastActiveDate?.toString();

      let newStreak = profile.streak;

      if (!lastActiveDate || lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActiveDate === yesterdayStr) {
          // Consecutive day, increase streak
          newStreak++;
        } else if (lastActiveDate !== today) {
          // Streak broken, reset to 1
          newStreak = 1;
        }

        const newLongestStreak = Math.max(profile.longestStreak, newStreak);

        const [updated] = await db.update(userGameProfile).set({
          streak: newStreak,
          longestStreak: newLongestStreak,
          lastActiveDate: today,
          updatedAt: new Date()
        }).where(eq(userGameProfile.userId, userId)).returning();

        return updated;
      }

      return profile;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating streak for user ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  // Leaderboard operations
  async getAllLeaderboards(): Promise<Leaderboard[]> {
    try {
      return await db.select().from(leaderboards).orderBy(desc(leaderboards.createdAt));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting all leaderboards: ${err.message}`, err);
      throw err;
    }
  }

  async getActiveLeaderboards(): Promise<Leaderboard[]> {
    try {
      return await db.select().from(leaderboards).where(eq(leaderboards.isActive, true)).orderBy(desc(leaderboards.createdAt));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting active leaderboards: ${err.message}`, err);
      throw err;
    }
  }

  async getLeaderboard(id: number): Promise<Leaderboard | undefined> {
    try {
      const [leaderboard] = await db.select().from(leaderboards).where(eq(leaderboards.id, id));
      return leaderboard;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting leaderboard ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard> {
    try {
      const [created] = await db.insert(leaderboards).values(leaderboard).returning();
      logger.info(`Created leaderboard: ${created.name}`);
      return created;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error creating leaderboard: ${err.message}`, err);
      throw err;
    }
  }

  async updateLeaderboard(id: number, data: Partial<Leaderboard>): Promise<Leaderboard | undefined> {
    try {
      const [updated] = await db.update(leaderboards).set(data).where(eq(leaderboards.id, id)).returning();
      return updated;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating leaderboard ${id}: ${err.message}`, err);
      throw err;
    }
  }

  async getLeaderboardEntries(leaderboardId: number, limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      return await db.select().from(leaderboardEntries)
        .where(eq(leaderboardEntries.leaderboardId, leaderboardId))
        .orderBy(asc(leaderboardEntries.rank))
        .limit(limit);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting leaderboard entries for ${leaderboardId}: ${err.message}`, err);
      throw err;
    }
  }

  async updateLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry> {
    try {
      // Check if entry exists
      const [existing] = await db.select().from(leaderboardEntries).where(
        and(eq(leaderboardEntries.leaderboardId, entry.leaderboardId), eq(leaderboardEntries.userId, entry.userId))
      );

      if (existing) {
        const [updated] = await db.update(leaderboardEntries).set({
          score: entry.score,
          metadata: entry.metadata,
          calculatedAt: new Date()
        }).where(eq(leaderboardEntries.id, existing.id)).returning();
        return updated;
      } else {
        const [created] = await db.insert(leaderboardEntries).values(entry).returning();
        return created;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating leaderboard entry: ${err.message}`, err);
      throw err;
    }
  }

  // Achievement progress operations
  async getAchievementProgress(userId: number, achievementId: number): Promise<AchievementProgress | undefined> {
    try {
      const [progress] = await db.select().from(achievementProgress).where(
        and(eq(achievementProgress.userId, userId), eq(achievementProgress.achievementId, achievementId))
      );
      return progress;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting achievement progress for user ${userId}, achievement ${achievementId}: ${err.message}`, err);
      throw err;
    }
  }

  async updateAchievementProgress(userId: number, achievementId: number, progress: number, progressData?: any): Promise<AchievementProgress> {
    try {
      const existing = await this.getAchievementProgress(userId, achievementId);

      if (existing) {
        const [updated] = await db.update(achievementProgress).set({
          currentProgress: progress,
          progressData,
          lastUpdated: new Date()
        }).where(eq(achievementProgress.id, existing.id)).returning();
        return updated;
      } else {
        // Get achievement to set target progress
        const achievement = await this.getAchievement(achievementId);
        const targetProgress = achievement?.requirements?.target || 1;

        const [created] = await db.insert(achievementProgress).values({
          userId,
          achievementId,
          currentProgress: progress,
          targetProgress,
          progressData
        }).returning();
        return created;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error updating achievement progress: ${err.message}`, err);
      throw err;
    }
  }

  async getUserAchievementProgress(userId: number): Promise<AchievementProgress[]> {
    try {
      return await db.select().from(achievementProgress).where(eq(achievementProgress.userId, userId)).orderBy(desc(achievementProgress.lastUpdated));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error getting achievement progress for user ${userId}: ${err.message}`, err);
      throw err;
    }
  }

  async getAllNews(): Promise<any[]> {
    try {
      const result = await db.select().from(newsEntries).orderBy(desc(newsEntries.createdAt));
      return result;
    } catch (error) {
      logger.error('Error fetching news:', error);
      throw error;
    }
  }

  async getLatestNews(limit: number = 5): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(newsEntries)
        .orderBy(desc(newsEntries.createdAt))
        .limit(limit);
      return result;
    } catch (error) {
      logger.error('Error fetching latest news:', error);
      throw error;
    }
  }

  async getUpcomingEvents(): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(events)
        .where(gte(events.eventDate, new Date()))
        .orderBy(asc(events.eventDate));
      return result;
    } catch (error) {
      logger.error('Error fetching upcoming events:', error);
      throw error;
    }
  }
}