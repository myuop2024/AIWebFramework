import {
  type User, type InsertUser, type UserProfile, type InsertUserProfile,
  type Document, type InsertDocument, type PollingStation, type InsertPollingStation,
  type Assignment, type InsertAssignment, type FormTemplate, type InsertFormTemplate,
  type Report, type InsertReport, type ReportAttachment, type InsertReportAttachment,
  type Event, type InsertEvent, type EventParticipation, type InsertEventParticipation,
  type Faq, type InsertFaq, type News, type InsertNews, type Message, type InsertMessage,
  type RegistrationForm, type InsertRegistrationForm, type UserImportLog, type InsertUserImportLog,
  type SystemSetting, type InsertSystemSetting,
  type PhotoApproval, type InsertPhotoApproval, type ErrorLog, type InsertErrorLog,
  type Role, type InsertRole
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // System settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, value: any, updatedBy?: number): Promise<SystemSetting | undefined>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByObserverId(observerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
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
  checkSchedulingConflicts(userId: number, startDate: Date, endDate: Date, excludeAssignmentId?: number): Promise<Assignment[]>;
  getActiveAssignmentsForStation(stationId: number, startDate: Date, endDate: Date): Promise<Assignment[]>;
  checkInObserver(assignmentId: number): Promise<Assignment | undefined>;
  checkOutObserver(assignmentId: number): Promise<Assignment | undefined>;
  
  // Form template operations
  getFormTemplate(id: number): Promise<FormTemplate | undefined>;
  getAllFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplatesByCategory(category: string): Promise<FormTemplate[]>;
  getActiveFormTemplates(): Promise<FormTemplate[]>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: number, data: Partial<FormTemplate>): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: number): Promise<boolean>;
  
  // Report operations
  getReport(id: number): Promise<Report | undefined>;
  getReportsByUserId(userId: number): Promise<Report[]>;
  getReportsByStationId(stationId: number): Promise<Report[]>;
  getReportsByStatus(status: string): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, data: Partial<Report>): Promise<Report | undefined>;
  generateContentHash(reportContent: any): string;
  
  // Report attachment operations
  getReportAttachment(id: number): Promise<ReportAttachment | undefined>;
  getAttachmentsByReportId(reportId: number): Promise<ReportAttachment[]>;
  createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment>;
  updateReportAttachment(id: number, data: Partial<ReportAttachment>): Promise<ReportAttachment | undefined>;
  deleteReportAttachment(id: number): Promise<boolean>;
  
  // Event operations
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  
  // Event participation operations
  getEventParticipation(userId: number, eventId: number): Promise<EventParticipation | undefined>;
  getEventParticipationsByUserId(userId: number): Promise<EventParticipation[]>;
  createEventParticipation(participation: InsertEventParticipation): Promise<EventParticipation>;
  updateEventParticipation(id: number, data: Partial<EventParticipation>): Promise<EventParticipation | undefined>;
  
  // FAQ operations
  getFaq(id: number): Promise<Faq | undefined>;
  getAllFaqs(): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;
  
  // News operations
  getNews(id: number): Promise<News | undefined>;
  getAllNews(): Promise<News[]>;
  getLatestNews(limit?: number): Promise<News[]>;
  createNews(news: InsertNews): Promise<News>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Registration form operations
  getRegistrationForm(id: number): Promise<RegistrationForm | undefined>;
  getActiveRegistrationForm(): Promise<RegistrationForm | undefined>;
  getAllRegistrationForms(): Promise<RegistrationForm[]>;
  createRegistrationForm(form: InsertRegistrationForm): Promise<RegistrationForm>;
  updateRegistrationForm(id: number, data: Partial<RegistrationForm>): Promise<RegistrationForm | undefined>;
  activateRegistrationForm(id: number): Promise<RegistrationForm | undefined>;
  
  // User import operations
  createUserImportLog(log: InsertUserImportLog): Promise<UserImportLog>;
  getUserImportLog(id: number): Promise<UserImportLog | undefined>;
  getAllUserImportLogs(): Promise<UserImportLog[]>;
  updateUserImportLog(id: number, data: Partial<UserImportLog>): Promise<UserImportLog | undefined>;
  bulkCreateUsers(userData: any[], options?: {
    verificationStatus?: string;
    defaultRole?: string;
    passwordHash?: (password: string) => string;
  }): Promise<{ success: User[], failures: any[] }>;
  
  // Statistics operations for admin dashboard
  getTotalUserCount(): Promise<number>;
  getActiveObserverCount(): Promise<number>;
  getUserCountByRole(): Promise<Record<string, number>>;
  getReportCountByType(): Promise<Record<string, number>>;
  getReportCountByStatus(): Promise<Record<string, number>>;
  getActiveAssignmentsCount(): Promise<number>;
  getStationsWithIssueReports(): Promise<{id: number, name: string, issueCount: number}[]>;
  
  // Photo approval operations
  getPhotoApproval(id: number): Promise<PhotoApproval | undefined>;
  getPendingPhotoApprovals(): Promise<PhotoApproval[]>;
  getPhotoApprovalsByUserId(userId: number): Promise<PhotoApproval[]>;
  createPhotoApproval(approval: InsertPhotoApproval): Promise<PhotoApproval>;
  updatePhotoApproval(id: number, data: Partial<PhotoApproval>): Promise<PhotoApproval | undefined>;
  approvePhotoApproval(id: number, approvedBy: number): Promise<PhotoApproval | undefined>;
  rejectPhotoApproval(id: number, approvedBy: number, notes?: string): Promise<PhotoApproval | undefined>;
  
  // Role management operations
  getAllRoles(): Promise<Role[]>;
  getRoleById(id: number): Promise<Role | undefined>; 
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, data: Partial<Role>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;
  
  // Error log operations
  getErrorLog(id: number): Promise<ErrorLog | undefined>;
  getErrorLogs(options?: {
    page?: number;
    limit?: number;
    source?: string;
    level?: string;
    userId?: number;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    searchTerm?: string;
  }): Promise<{logs: ErrorLog[], total: number}>;
  createErrorLog(log: InsertErrorLog): Promise<ErrorLog>;
  updateErrorLog(id: number, data: Partial<ErrorLog>): Promise<ErrorLog | undefined>;
  resolveErrorLog(id: number, resolvedBy: number, notes?: string): Promise<ErrorLog | undefined>;
  deleteErrorLog(id: number): Promise<boolean>;
  deleteErrorLogs(options: {
    ids?: number[];
    olderThan?: Date;
    allResolved?: boolean;
  }): Promise<number>;
}

// Import DatabaseStorage implementation
import { DatabaseStorage } from './database-storage';

// Export an instance of DatabaseStorage as the default storage
export const storage = new DatabaseStorage();