import { 
  type User, 
  type InsertUser,
  type UpsertUser,
  type UserProfile, 
  type InsertUserProfile,
  type SystemSetting,
  type InsertSystemSetting,
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
  type RegistrationForm,
  type InsertRegistrationForm,
  type UserImportLog,
  type InsertUserImportLog,
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
  type InsertAchievementProgress
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // System settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, value: any, updatedBy?: string): Promise<SystemSetting | undefined>;

  // ID Card operations
  getAllIdCardTemplates(): Promise<IdCardTemplate[]>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByObserverId(observerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;

  // User profile operations
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByUserId(userId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined>;

  // Polling station operations
  getPollingStation(id: number): Promise<PollingStation | undefined>;
  getAllPollingStations(): Promise<PollingStation[]>;
  createPollingStation(station: InsertPollingStation): Promise<PollingStation>;
  updatePollingStation(id: number, data: Partial<PollingStation>): Promise<PollingStation | undefined>;
  deletePollingStation(id: number): Promise<boolean>;

  // Assignment operations
  getAssignmentsByUserId(userId: number): Promise<Assignment[]>;
  getAssignmentsByStationId(stationId: number): Promise<Assignment[]>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getActiveAssignments(userId: number): Promise<Assignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment | undefined>;

  // Form template operations
  getAllFormTemplates(): Promise<FormTemplate[]>;

  // Registration form operations
  getAllRegistrationForms(): Promise<RegistrationForm[]>;

  // Role operations
  createRole(roleData: InsertRole): Promise<Role>;
  getRoleById(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  updateRole(id: number, data: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>> & { permissions?: string[] }): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;
  getPermissionsForRole(roleId: number): Promise<string[] | undefined>;

  // Group operations
  createGroup(groupData: InsertGroup): Promise<Group>;
  getGroupById(id: number): Promise<Group & { members?: User[] } | undefined>;
  getGroupByName(name: string): Promise<Group | undefined>;
  getAllGroups(): Promise<(Group & { members?: User[] })[]>;
  updateGroup(id: number, data: Partial<Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;

  // Group membership operations
  addGroupMember(groupId: number, userId: number, addedBy?: number): Promise<GroupMembership>;
  addGroupMembers(groupId: number, userIds: number[], addedBy?: number): Promise<GroupMembership[]>;
  removeGroupMember(groupId: number, userId: number): Promise<boolean>;
  setGroupMembers(groupId: number, userIds: number[], addedBy?: number): Promise<void>;
  getGroupMembers(groupId: number): Promise<User[]>;
  getUserGroups(userId: number): Promise<Group[]>;

  // User import log operations
  getUserImportLog(importId: number): Promise<UserImportLog | undefined>;
  getAllUserImportLogs(): Promise<UserImportLog[]>;
  createUserImportLog(logData: InsertUserImportLog): Promise<UserImportLog>;
  updateUserImportLog(importId: number, data: Partial<UserImportLog>): Promise<void>;
  bulkCreateUsers(users: InsertUser[], options: { defaultRole?: string; verificationStatus?: string; passwordHash?: (pwd: string) => string }): Promise<{ success: User[]; failures: { data: InsertUser; error: string }[] }>;

  // Communication operations
  getRecentConversations(userId: number): Promise<any[]>;

  // Achievement system operations
  getAllAchievements(): Promise<Achievement[]>;
  getAchievement(id: number): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  updateAchievement(id: number, data: Partial<Achievement>): Promise<Achievement | undefined>;
  deleteAchievement(id: number): Promise<boolean>;

  // User achievement operations
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  awardAchievement(userId: number, achievementId: number): Promise<UserAchievement>;
  checkAchievementEarned(userId: number, achievementId: number): Promise<boolean>;

  // User game profile operations
  getUserGameProfile(userId: number): Promise<UserGameProfile | undefined>;
  createUserGameProfile(profile: InsertUserGameProfile): Promise<UserGameProfile>;
  updateUserGameProfile(userId: number, data: Partial<UserGameProfile>): Promise<UserGameProfile | undefined>;
  updateUserPoints(userId: number, points: number): Promise<UserGameProfile | undefined>;
  updateUserStreak(userId: number): Promise<UserGameProfile | undefined>;

  // Leaderboard operations
  getAllLeaderboards(): Promise<Leaderboard[]>;
  getActiveLeaderboards(): Promise<Leaderboard[]>;
  getLeaderboard(id: number): Promise<Leaderboard | undefined>;
  createLeaderboard(leaderboard: InsertLeaderboard): Promise<Leaderboard>;
  updateLeaderboard(id: number, data: Partial<Leaderboard>): Promise<Leaderboard | undefined>;
  getLeaderboardEntries(leaderboardId: number, limit?: number): Promise<LeaderboardEntry[]>;
  updateLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry>;

  // Achievement progress operations
  getAchievementProgress(userId: number, achievementId: number): Promise<AchievementProgress | undefined>;
  updateAchievementProgress(userId: number, achievementId: number, progress: number, progressData?: any): Promise<AchievementProgress>;
  getUserAchievementProgress(userId: number): Promise<AchievementProgress[]>;

  // News operations
  getAllNews(): Promise<any[]>;
  getLatestNews(limit?: number): Promise<any[]>;

  // Event operations
  getAllEvents(): Promise<any[]>;
  getUpcomingEvents(): Promise<any[]>;
}

// Import database storage
import { DatabaseStorage } from "./database-storage";

// Create storage instance
export const storage = new DatabaseStorage();