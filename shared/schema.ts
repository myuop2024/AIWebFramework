import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  doublePrecision,
  date,
  varchar,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { TrainingSystemConfig } from "./moodle-types";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// System settings for global application configuration
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: jsonb("setting_value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings)
  .omit({
    id: true,
    updatedAt: true,
  } as any);

// ID Card templates table
export const idCardTemplates = pgTable("id_card_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  template: jsonb("template_data").notNull(),
  isActive: boolean("is_active").default(false),
  securityFeatures: jsonb("security_features"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Removed created_by as it doesn't exist in the current database
});

export const idCardTemplateSchema = createInsertSchema(idCardTemplates)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  } as any);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey().notNull(),
  username: text("username").unique(),
  password: text("password"),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  observerId: text("observer_id").unique(),
  phoneNumber: text("phone_number"),
  role: text("role").default("observer"),
  roleId: integer("role_id").references(() => roles.id),
  verificationStatus: text("verification_status").default("pending"),
  deviceId: text("device_id"),
  trainingStatus: text("training_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  profileImageUrl: varchar("profile_image_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Two-factor authentication fields
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorVerified: boolean("two_factor_verified").default(false),
  // Recovery codes for 2FA (stored as JSON array)
  recoveryCodes: jsonb("recovery_codes"),
  // Gamification fields
  totalGamificationPoints: integer("total_gamification_points").default(0),
  lastLoginForGamification: date("last_login_for_gamification"),
});

// User profile table for KYC
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  // Contact Information
  address: text("address"),
  city: text("city"),
  state: text("state"), // This represents the Parish in Jamaica
  postOfficeRegion: text("post_office_region"), // Replaces zipCode
  country: text("country"),
  // Identification Information
  trn: text("trn"), // Tax Registration Number
  idType: text("id_type"), // National ID, Passport, Driver's License, School ID, Work ID, Other
  idNumber: text("id_number"),
  // Financial Information
  bankName: text("bank_name"), // Will be dropdown with Jamaican banks
  bankBranchLocation: text("bank_branch_location"), // New field for bank branch
  bankAccount: text("bank_account"),
  accountType: text("account_type"), // Savings or Checking
  accountCurrency: text("account_currency").default("JMD"), // JMD or USD 
  // Profile and verification 
  profilePhotoUrl: text("profile_photo_url"),
  idPhotoUrl: text("id_photo_url"),
  verificationStatus: text("verification_status"),
  verificationId: text("verification_id"),
  verifiedAt: timestamp("verified_at"),
  // New fields for preferences
  notifications: jsonb("notifications"),
  language: text("language"),
  region: text("region"),
  // Encryption fields
  encryptionIv: text("encryption_iv"), // Initialization vector for encrypted fields
  isEncrypted: boolean("is_encrypted").default(false),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  ocrText: text("ocr_text"),
  verificationStatus: text("verification_status").notNull().default("pending"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Polling stations table
export const pollingStations = pgTable("polling_stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  coordinates: text("coordinates"),
  stationCode: text("station_code").notNull().unique(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  capacity: integer("capacity").default(5), // Max number of observers that can be assigned
  status: text("status").default("active").notNull(), // active, closed, pending
});

// User-polling station assignments
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => pollingStations.id),
  isPrimary: boolean("is_primary").default(false),
  assignedAt: timestamp("assigned_at").defaultNow(),
  startDate: timestamp("start_date").notNull(), // When the assignment begins
  endDate: timestamp("end_date").notNull(),     // When the assignment ends
  status: text("status").default("scheduled").notNull(), // scheduled, active, completed, cancelled
  notes: text("notes"),                          // Any special instructions
  checkInRequired: boolean("check_in_required").default(true), // Whether observer needs to check in
  lastCheckIn: timestamp("last_check_in"),       // Last time observer checked in
  lastCheckOut: timestamp("last_check_out"),     // Last time observer checked out
  role: text("role").default("observer").notNull(), // Role at polling station: observer, supervisor, etc.
  priority: integer("priority").default(1),      // Assignment priority
});

// Form templates for customizable reports
export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull(), // Array of field definitions (type, label, required, etc)
  isActive: boolean("is_active").default(true).notNull(),
  category: text("category").notNull(), // e.g., "polling", "incident", "observation"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Observer reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => pollingStations.id),
  templateId: integer("template_id").references(() => formTemplates.id),
  reportType: text("report_type").notNull(),
  content: jsonb("content").notNull(),
  contentHash: text("content_hash"), // For data integrity verification
  status: text("status").notNull().default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  checkinTime: timestamp("checkin_time"),
  checkoutTime: timestamp("checkout_time"),
  mileageTraveled: integer("mileage_traveled"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  encryptedData: boolean("encrypted_data").default(false),
  // --- Added columns for analytics and reporting ---
  createdAt: timestamp("created_at").defaultNow(),
  severity: text("severity"),
  category: text("category"),
  // pollingStationId: integer("polling_station_id").references(() => pollingStations.id), // Redundant, stationId is used
  description: text("description"),
});

// Report attachments with OCR support
export const reportAttachments = pgTable("report_attachments", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => reports.id, { onDelete: 'cascade' }),
  fileType: text("file_type").notNull(), // e.g., "image/jpeg", "application/pdf"
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  ocrProcessed: boolean("ocr_processed").default(false),
  ocrText: text("ocr_text"),
  encryptionIv: text("encryption_iv"), // Initialization vector for encryption
});

// Events and training
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(),
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
});

// User event participation
export const eventParticipation = pgTable("event_participation", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  status: text("status").notNull().default("registered"),
  completionStatus: text("completion_status"),
  certificateUrl: text("certificate_url"),
});

// FAQ knowledge base
export const faqEntries = pgTable("faq_entries", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// News and announcements
export const newsEntries = pgTable("news_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  content: text("content").notNull(),
  type: text("type").default("text").notNull(), // text, file, image, system
  read: boolean("read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Add after messages table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // null for broadcast
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define a type for Message type
export const messageTypeEnum = ["text", "file", "image", "system"] as const;

// Dynamic registration form configuration
export const registrationForms = pgTable("registration_forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  fields: jsonb("fields").notNull(), // Array of registration field definitions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  version: integer("version").default(1).notNull(),
});

// Bulk import records
export const userImportLogs = pgTable("user_import_logs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  importedBy: integer("imported_by").references(() => users.id),
  totalRecords: integer("total_records").notNull(),
  successCount: integer("success_count").notNull(),
  failureCount: integer("failure_count").notNull(),
  importedAt: timestamp("imported_at").defaultNow(),
  status: text("status").notNull(), // "in_progress", "completed", "failed"
  errors: jsonb("errors"), // Any error details
  options: jsonb("options"), // Import options (verification status, etc.)
  sourceType: text("source_type").notNull(), // "csv", "google_form", "json", etc.
});

// Training systems integration configuration
export const trainingIntegrations = pgTable("training_integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  systems: jsonb("systems").notNull(), // Array of TrainingSystemConfig
  syncSchedule: text("sync_schedule"), // Cron format for sync schedule
  lastSyncTime: timestamp("last_sync_time"),
  settings: jsonb("settings"), // Additional settings as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User training content progress
export const trainingProgress = pgTable("training_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contentId: text("content_id").notNull(), // External content ID (e.g., moodle_course_123)
  contentType: text("content_type").notNull(), // course, meeting, webinar, etc.
  source: text("source").notNull(), // moodle, zoom, internal
  progress: integer("progress").default(0), // 0-100 percentage
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  metadata: jsonb("metadata"), // Additional data specific to content type
});

// External user mappings
export const externalUserMappings = pgTable("external_user_mappings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  system: text("system").notNull(), // moodle, zoom, etc.
  externalId: text("external_id").notNull(), // ID in the external system
  externalUsername: text("external_username"),
  externalEmail: text("external_email"),
  metadata: jsonb("metadata"), // Additional mapping data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pending profile photo approvals
export const photoApprovals = pgTable("photo_approvals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  photoUrl: text("photo_url").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
});

// User roles and permissions table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").default([]),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// User group memberships table
export const groupMemberships = pgTable("group_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  joinedAt: timestamp("joined_at").defaultNow(),
  addedBy: integer("added_by").references(() => users.id),
},
(table) => ({
  userGroupUniqueIdx: index("group_memberships_user_id_group_id_idx").on(table.userId, table.groupId),
}));

// Gamification Tables

export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  pointsEarned: integer("points_earned").notNull(),
  actionType: varchar("action_type", { length: 255 }).notNull(), // e.g., 'TRAINING_COMPLETED', 'REPORT_SUBMITTED'
  actionDetailsId: integer("action_details_id"), // Optional: ID of the related entity (report, training module)
  createdAt: timestamp("created_at").defaultNow(),
},
(table) => ({
  userIdx: index("user_points_user_id_idx").on(table.userId),
}));

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  iconUrl: varchar("icon_url", { length: 255 }),
  criteria: jsonb("criteria"), // e.g., { "reports_verified": 100 }
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: integer("badge_id").notNull().references(() => badges.id, { onDelete: 'cascade' }),
  earnedAt: timestamp("earned_at").defaultNow(),
},
(table) => ({
  userBadgeUniqueIdx: index("user_badges_user_id_badge_id_idx").on(table.userId, table.badgeId), // Index for unique constraint, Drizzle handles actual UNIQUE in migration
}));

// Leaderboard tables (consider if these should be materialized views or managed by application logic)
// For simplicity in schema, defining as tables first.
export const leaderboardWeekly = pgTable("leaderboard_weekly", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  totalPointsThisWeek: integer("total_points_this_week").notNull().default(0),
  rank: integer("rank"),
  weekStartDate: date("week_start_date").notNull(), // To identify the week
  updatedAt: timestamp("updated_at").defaultNow(),
},
(table) => ({
  pointsIdx: index("leaderboard_weekly_points_idx").on(table.totalPointsThisWeek),
}));

export const leaderboardOverall = pgTable("leaderboard_overall", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  totalPointsAllTime: integer("total_points_all_time").notNull().default(0),
  rank: integer("rank"),
  updatedAt: timestamp("updated_at").defaultNow(),
},
(table) => ({
  pointsIdx: index("leaderboard_overall_points_idx").on(table.totalPointsAllTime),
}));

// Define insert schema for roles
export const insertRoleSchema = createInsertSchema(roles)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  } as any);

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof insertRoleSchema._type;

// Define insert schema for groups
export const insertGroupSchema = createInsertSchema(groups)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  } as any);

export const insertGroupMembershipSchema = createInsertSchema(groupMemberships)
  .omit({
    id: true,
    joinedAt: true,
  } as any);

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof insertGroupSchema._type;
export type GroupMembership = typeof groupMemberships.$inferSelect;
export type InsertGroupMembership = typeof insertGroupMembershipSchema._type;

// Insert Schemas for Gamification
export const insertUserPointSchema = createInsertSchema(userPoints).omit({ id: true, createdAt: true } as any);
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true } as any);
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true } as any);
export const insertLeaderboardWeeklySchema = createInsertSchema(leaderboardWeekly).omit({ updatedAt: true } as any);
export const insertLeaderboardOverallSchema = createInsertSchema(leaderboardOverall).omit({ updatedAt: true } as any);

// Verification settings schema for the application
export const verificationSettingsSchema = z.object({
  autoApproval: z.boolean().default(false),
  requireIdCard: z.boolean().default(true),
  requireAddress: z.boolean().default(true),
  requireProfilePhoto: z.boolean().default(true),
  requireIdentificationNumber: z.boolean().default(true),
  allowPhotoUpdates: z.boolean().default(true),
  verificationMessage: z.string().optional(),
  minVerificationAge: z.number().min(16).max(99).default(18),
});

export type VerificationSettings = z.infer<typeof verificationSettingsSchema>;

// ID Card Templates are already defined above

// Project management insert schemas will be defined later after the tables are created

// Error logs for application monitoring
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  source: text("source").notNull().default("unknown"), // express, websocket, webrtc, client, etc.
  level: text("level").notNull().default("error"), // error, warning, info
  message: text("message").notNull(),
  code: text("code"), // error code or error name
  stack: text("stack"),
  url: text("url"), // full URL where error occurred
  userAgent: text("user_agent"),
  path: text("path"), // request path
  method: text("method"), // HTTP method
  context: jsonb("context"), // additional context data
  timestamp: timestamp("timestamp").defaultNow(),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

export interface ErrorLogQueryOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  level?: string;
  resolved?: boolean;
  userId?: string;
  path?: string;
}

export interface ErrorLogDeleteCriteria {
  olderThan?: Date;
  level?: string;
  resolved?: boolean;
}

// Project Management Enums
export const projectStatusEnum = ["planning", "active", "completed", "on_hold", "cancelled"] as const;
export const taskStatusEnum = ["pending", "in_progress", "completed", "blocked", "cancelled"] as const;
export const taskPriorityEnum = ["low", "medium", "high", "urgent"] as const;
export const projectMemberRoleEnum = ["owner", "manager", "member", "viewer"] as const;

// Project Management Tables
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").default("planning").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: text("status").default("pending").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskCategories = pgTable("task_categories", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  milestoneId: integer("milestone_id").references(() => milestones.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(),
  priority: text("priority").default("medium"),
  dueDate: date("due_date"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  categoryId: integer("category_id").references(() => taskCategories.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  userId: integer("user_id").references(() => users.id),
  role: text("role").default("member"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  userId: integer("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskAttachments = pgTable("task_attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  userId: integer("user_id").references(() => users.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskHistory = pgTable("task_history", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define insert schemas

export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    observerId: true,
    verificationStatus: true,
    trainingStatus: true,
  } as any);

export const upsertUserSchema = createInsertSchema(users)
  .omit({
    createdAt: true,
    updatedAt: true,
  } as any);

export const insertUserProfileSchema = createInsertSchema(userProfiles)
  .omit({
    id: true,
    verifiedAt: true,
    encryptionIv: true,
    isEncrypted: true,
  } as any);

export const insertDocumentSchema = createInsertSchema(documents)
  .omit({
    id: true,
    ocrText: true,
    verificationStatus: true,
    uploadedAt: true,
  } as any);

export const insertPollingStationSchema = createInsertSchema(pollingStations)
  .omit({
    id: true,
  } as any);

export const insertAssignmentSchema = createInsertSchema(assignments)
  .omit({
    id: true,
    assignedAt: true,
  } as any);

export const insertFormTemplateSchema = createInsertSchema(formTemplates)
  .omit({
    id: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } as any);

export const insertReportSchema = createInsertSchema(reports)
  .omit({
    id: true,
    status: true,
    submittedAt: true,
    reviewedAt: true,
    reviewedBy: true,
    contentHash: true,
    encryptedData: true,
  } as any);

export const insertReportAttachmentSchema = createInsertSchema(reportAttachments)
  .omit({
    id: true,
    uploadedAt: true,
    ocrProcessed: true,
    ocrText: true,
  } as any);

export const insertEventSchema = createInsertSchema(events)
  .omit({
    id: true,
  } as any);

export const insertEventParticipationSchema = createInsertSchema(eventParticipation)
  .omit({
    id: true,
  } as any);

export const insertFaqSchema = createInsertSchema(faqEntries)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  } as any);

export const insertNewsSchema = createInsertSchema(newsEntries)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  } as any);

export const insertMessageSchema = createInsertSchema(messages)
  .omit({
    id: true,
    sentAt: true,
  } as any);

export const insertRegistrationFormSchema = createInsertSchema(registrationForms)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  } as any);

export const insertUserImportLogSchema = createInsertSchema(userImportLogs)
  .omit({
    id: true,
    importedAt: true,
  } as any);

// Bulk user import schema
export const bulkUserImportSchema = z.object({
  users: z.array(
    z.object({
      username: z.string().optional(),
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
      phoneNumber: z.string().optional(),
      role: z.string().default("observer"),
    })
  ),
  options: z.object({
    verificationStatus: z.string().default("pending"),
    sendWelcomeEmail: z.boolean().default(false),
    generateTemporaryPasswords: z.boolean().default(true),
    autoGenerateObserverIds: z.boolean().default(true),
  }).optional(),
});

export const insertTrainingIntegrationSchema = createInsertSchema(trainingIntegrations)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  } as any);

export const insertTrainingProgressSchema = createInsertSchema(trainingProgress)
  .omit({
    id: true,
    lastAccessedAt: true,
  } as any);

export const insertExternalUserMappingSchema = createInsertSchema(externalUserMappings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  } as any);

export const insertPhotoApprovalSchema = createInsertSchema(photoApprovals)
  .omit({
    id: true,
    createdAt: true,
    processedAt: true,
  } as any);

// Login schema
export const loginUserSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  deviceId: z.string().optional(),
});

// Type definitions
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof insertSystemSettingSchema._type;

export type User = typeof users.$inferSelect & { permissions?: string[] };
export type InsertUser = typeof insertUserSchema._type;
export type UpsertUser = typeof upsertUserSchema._type;
export type IdCardTemplate = typeof idCardTemplates.$inferSelect;
export type InsertIdCardTemplate = typeof idCardTemplateSchema._type;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof insertUserProfileSchema._type;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof insertDocumentSchema._type;

export type PollingStation = typeof pollingStations.$inferSelect;
export type InsertPollingStation = typeof insertPollingStationSchema._type;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof insertAssignmentSchema._type;

export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = typeof insertFormTemplateSchema._type;

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof insertReportSchema._type;

export type ReportAttachment = typeof reportAttachments.$inferSelect;
export type InsertReportAttachment = typeof insertReportAttachmentSchema._type;

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof insertEventSchema._type;

export type EventParticipation = typeof eventParticipation.$inferSelect;
export type InsertEventParticipation = typeof insertEventParticipationSchema._type;

export type Faq = typeof faqEntries.$inferSelect;
export type InsertFaq = typeof insertFaqSchema._type;

export type News = typeof newsEntries.$inferSelect;
export type InsertNews = typeof insertNewsSchema._type;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof insertMessageSchema._type;

export type RegistrationForm = typeof registrationForms.$inferSelect;
export type InsertRegistrationForm = typeof insertRegistrationFormSchema._type;

export type UserImportLog = typeof userImportLogs.$inferSelect;
export type InsertUserImportLog = typeof insertUserImportLogSchema._type;

export type TrainingIntegration = typeof trainingIntegrations.$inferSelect;
export type InsertTrainingIntegration = typeof insertTrainingIntegrationSchema._type;

export type TrainingProgress = typeof trainingProgress.$inferSelect;
export type InsertTrainingProgress = typeof insertTrainingProgressSchema._type;

export type ExternalUserMapping = typeof externalUserMappings.$inferSelect;
export type InsertExternalUserMapping = typeof insertExternalUserMappingSchema._type;

export type PhotoApproval = typeof photoApprovals.$inferSelect;
export type InsertPhotoApproval = typeof insertPhotoApprovalSchema._type;

export type Session = typeof sessions.$inferSelect;

// Gamification Types
export type UserPoint = typeof userPoints.$inferSelect;
export type InsertUserPoint = typeof insertUserPointSchema._type;
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof insertBadgeSchema._type;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof insertUserBadgeSchema._type;
export type LeaderboardWeekly = typeof leaderboardWeekly.$inferSelect;
export type InsertLeaderboardWeekly = typeof insertLeaderboardWeeklySchema._type;
export type LeaderboardOverall = typeof leaderboardOverall.$inferSelect;
export type InsertLeaderboardOverall = typeof insertLeaderboardOverallSchema._type;

// Form template extended schema
export const formFieldSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string(),
    value: z.string()
  })).optional(),
  defaultValue: z.any().optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
});

export const formTemplateExtendedSchema = insertFormTemplateSchema.extend({
  fields: z.array(formFieldSchema)
});

// ErrorLog types and schema
export interface ErrorLogQueryOptions {
  limit?: number;
  offset?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  errorType?: string;
  source?: string;
}

export interface ErrorLogDeleteCriteria {
  resolvedOnly?: boolean;
  olderThan?: Date;
  errorType?: string;
  source?: string;
}

// Type definitions for login data
export type LoginData = z.infer<typeof loginUserSchema>;

// Export relations
export const userRelations = relations(users, ({ many, one }) => ({
  profiles: many(userProfiles),
  documents: many(documents),
  assignments: many(assignments),
  reports: many(reports),
  eventParticipations: many(eventParticipation),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  userBadges: many(userBadges),
  userPoints: many(userPoints),
}));

export const userPointsRelations = relations(userPoints, ({ one }) => ({
  user: one(users, {
    fields: [userPoints.userId],
    references: [users.id],
  }),
}));

export const badgeRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgeRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const leaderboardWeeklyRelations = relations(leaderboardWeekly, ({ one }) => ({
  user: one(users, {
    fields: [leaderboardWeekly.userId],
    references: [users.id],
  }),
}));

export const leaderboardOverallRelations = relations(leaderboardOverall, ({ one }) => ({
  user: one(users, {
    fields: [leaderboardOverall.userId],
    references: [users.id],
  }),
}));

export const roleRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const userProfileRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const documentRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const pollingStationRelations = relations(pollingStations, ({ many }) => ({
  assignments: many(assignments),
  reports: many(reports),
}));

export const assignmentRelations = relations(assignments, ({ one }) => ({
  user: one(users, {
    fields: [assignments.userId],
    references: [users.id],
  }),
  pollingStation: one(pollingStations, {
    fields: [assignments.stationId],
    references: [pollingStations.id],
  }),
}));

export const formTemplateRelations = relations(formTemplates, ({ many, one }) => ({
  reports: many(reports),
  createdBy: one(users, {
    fields: [formTemplates.createdBy],
    references: [users.id],
  }),
}));

export const reportRelations = relations(reports, ({ one, many }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
  pollingStation: one(pollingStations, {
    fields: [reports.stationId],
    references: [pollingStations.id],
  }),
  template: one(formTemplates, {
    fields: [reports.templateId],
    references: [formTemplates.id],
  }),
  reviewer: one(users, {
    fields: [reports.reviewedBy],
    references: [users.id],
  }),
  attachments: many(reportAttachments),
}));

export const reportAttachmentRelations = relations(reportAttachments, ({ one }) => ({
  report: one(reports, {
    fields: [reportAttachments.reportId],
    references: [reports.id],
  }),
}));

export const eventRelations = relations(events, ({ many }) => ({
  participations: many(eventParticipation),
}));

export const eventParticipationRelations = relations(eventParticipation, ({ one }) => ({
  user: one(users, {
    fields: [eventParticipation.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [eventParticipation.eventId],
    references: [events.id],
  }),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const registrationFormRelations = relations(registrationForms, ({ one }) => ({
  createdBy: one(users, {
    fields: [registrationForms.createdBy],
    references: [users.id],
  }),
}));

export const userImportLogRelations = relations(userImportLogs, ({ one }) => ({
  importedBy: one(users, {
    fields: [userImportLogs.importedBy],
    references: [users.id],
  }),
}));

export const trainingProgressRelations = relations(trainingProgress, ({ one }) => ({
  user: one(users, {
    fields: [trainingProgress.userId],
    references: [users.id],
  }),
}));

export const externalUserMappingRelations = relations(externalUserMappings, ({ one }) => ({
  user: one(users, {
    fields: [externalUserMappings.userId],
    references: [users.id],
  }),
}));

export const photoApprovalRelations = relations(photoApprovals, ({ one }) => ({
  user: one(users, {
    fields: [photoApprovals.userId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [photoApprovals.approvedBy],
    references: [users.id],
  }),
}));

// Project management insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertTaskCategorySchema = createInsertSchema(taskCategories).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertTaskAttachmentSchema = createInsertSchema(taskAttachments).omit({ id: true, createdAt: true } as any);
export const insertTaskHistorySchema = createInsertSchema(taskHistory).omit({ id: true, createdAt: true } as any);

// Achievement system tables
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  iconName: text("icon_name").notNull(),
  iconColor: text("icon_color").notNull(),
  points: integer("points").notNull().default(0),
  rarity: text("rarity").notNull().default("common"),
  requirements: jsonb("requirements"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const userGameProfile = pgTable("user_game_profile", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  totalPoints: integer("total_points").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentLevelPoints: integer("current_level_points").notNull().default(0),
  pointsToNextLevel: integer("points_to_next_level").notNull().default(100),
  streak: integer("streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaderboards = pgTable("leaderboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // points, streak, achievements
  timeframe: text("timeframe").notNull(), // weekly, monthly, all-time
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  leaderboardId: integer("leaderboard_id").notNull().references(() => leaderboards.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rank: integer("rank").notNull(),
  score: integer("score").notNull(),
  metadata: jsonb("metadata"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export const achievementProgress = pgTable("achievement_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  currentProgress: integer("current_progress").notNull().default(0),
  targetProgress: integer("target_progress").notNull().default(1),
  progressData: jsonb("progress_data"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Insert schemas for achievement system
export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true, earnedAt: true } as any);
export const insertUserGameProfileSchema = createInsertSchema(userGameProfile).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertLeaderboardSchema = createInsertSchema(leaderboards).omit({ id: true, createdAt: true, updatedAt: true } as any);
export const insertLeaderboardEntrySchema = createInsertSchema(leaderboardEntries).omit({ id: true, calculatedAt: true } as any);
export const insertAchievementProgressSchema = createInsertSchema(achievementProgress).omit({ id: true, lastUpdated: true } as any);

// Types for achievement system
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof insertAchievementSchema._type;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof insertUserAchievementSchema._type;
export type UserGameProfile = typeof userGameProfile.$inferSelect;
export type InsertUserGameProfile = typeof insertUserGameProfileSchema._type;
export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = typeof insertLeaderboardSchema._type;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = typeof insertLeaderboardEntrySchema._type;
export type AchievementProgress = typeof achievementProgress.$inferSelect;
export type InsertAchievementProgress = typeof insertAchievementProgressSchema._type;

// Add types at the bottom:
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;