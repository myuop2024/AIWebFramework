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
  type IdCardTemplate,
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
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByObserverId(observerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;
  
  // User profile operations
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByUserId(userId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined>;
  
  // Polling station operations
  getPollingStation(id: number): Promise<PollingStation | undefined>;
  getAllPollingStations(): Promise<PollingStation[]>;
  createPollingStation(station: InsertPollingStation): Promise<PollingStation>;
  updatePollingStation(id: number, data: Partial<PollingStation>): Promise<PollingStation | undefined>;
  deletePollingStation(id: number): Promise<boolean>;
  
  // Assignment operations
  getAssignmentsByUserId(userId: string): Promise<Assignment[]>;
  getAssignmentsByStationId(stationId: number): Promise<Assignment[]>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getActiveAssignments(userId: string): Promise<Assignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment | undefined>;
}

// Import database storage
import { DatabaseStorage } from "./database-storage";

// Create storage instance
export const storage = new DatabaseStorage();