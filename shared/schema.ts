import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { TrainingSystemConfig } from "./moodle-types";

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
  });

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  observerId: text("observer_id").notNull().unique(),
  phoneNumber: text("phone_number"),
  role: text("role").notNull().default("observer"),
  verificationStatus: text("verification_status").notNull().default("pending"),
  deviceId: text("device_id"),
  trainingStatus: text("training_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User profile table for KYC
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  trn: text("trn"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  idType: text("id_type"),
  idNumber: text("id_number"),
  profilePhotoUrl: text("profile_photo_url"),
  idPhotoUrl: text("id_photo_url"),
  verificationStatus: text("verification_status"),
  verificationId: text("verification_id"),
  verifiedAt: timestamp("verified_at"),
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
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

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

// Define insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    observerId: true,
    verificationStatus: true,
    trainingStatus: true,
  });

export const insertUserProfileSchema = createInsertSchema(userProfiles)
  .omit({
    id: true,
  });

export const insertDocumentSchema = createInsertSchema(documents)
  .omit({
    id: true,
    ocrText: true,
    verificationStatus: true,
    uploadedAt: true,
  });

export const insertPollingStationSchema = createInsertSchema(pollingStations)
  .omit({
    id: true,
  });

export const insertAssignmentSchema = createInsertSchema(assignments)
  .omit({
    id: true,
    assignedAt: true,
  });

export const insertFormTemplateSchema = createInsertSchema(formTemplates)
  .omit({
    id: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertReportSchema = createInsertSchema(reports)
  .omit({
    id: true,
    status: true,
    submittedAt: true,
    reviewedAt: true,
    reviewedBy: true,
    contentHash: true,
    encryptedData: true,
  });

export const insertReportAttachmentSchema = createInsertSchema(reportAttachments)
  .omit({
    id: true,
    uploadedAt: true,
    ocrProcessed: true,
    ocrText: true,
    encryptionIv: true,
  });

export const insertEventSchema = createInsertSchema(events)
  .omit({
    id: true,
  });

export const insertEventParticipationSchema = createInsertSchema(eventParticipation)
  .omit({
    id: true,
    completionStatus: true,
    certificateUrl: true,
  });

export const insertFaqSchema = createInsertSchema(faqEntries)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertNewsSchema = createInsertSchema(newsEntries)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertMessageSchema = createInsertSchema(messages)
  .omit({
    id: true,
    isRead: true,
    sentAt: true,
  });

// Field definitions for form templates
export const formFieldSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum([
    'text', 'textarea', 'number', 'email', 'tel', 'date', 'time', 'datetime',
    'checkbox', 'radio', 'select', 'file', 'image', 'signature', 'location'
  ]),
  label: z.string().min(1, "Label is required"),
  name: z.string().min(1, "Field name is required"),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    customMessage: z.string().optional(),
  }).optional(),
  defaultValue: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null()
  ]).optional().nullable(),
  isEncrypted: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  order: z.number().optional(),
  conditional: z.object({
    field: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  }).optional(),
});

export const formSectionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Section title is required"),
  description: z.string().optional(),
  order: z.number().optional(),
  fields: z.array(formFieldSchema)
});

export const formTemplateExtendedSchema = z.object({
  name: z.string().min(3, "Name is required and must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  sections: z.array(formSectionSchema),
  isEncrypted: z.boolean().default(false),
  createdBy: z.number().optional(),
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  deviceId: z.string().optional(), // Device fingerprint for security binding
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertPollingStation = z.infer<typeof insertPollingStationSchema>;
export type PollingStation = typeof pollingStations.$inferSelect;

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertReportAttachment = z.infer<typeof insertReportAttachmentSchema>;
export type ReportAttachment = typeof reportAttachments.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type InsertEventParticipation = z.infer<typeof insertEventParticipationSchema>;
export type EventParticipation = typeof eventParticipation.$inferSelect;

export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof faqEntries.$inferSelect;

export type InsertNews = z.infer<typeof insertNewsSchema>;
export type News = typeof newsEntries.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Training schema
export const insertTrainingIntegrationSchema = createInsertSchema(trainingIntegrations)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastSyncTime: true,
  });

export const insertTrainingProgressSchema = createInsertSchema(trainingProgress)
  .omit({
    id: true,
    completedAt: true,
    lastAccessedAt: true,
  });

export const insertExternalUserMappingSchema = createInsertSchema(externalUserMappings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertPhotoApprovalSchema = createInsertSchema(photoApprovals)
  .omit({
    id: true,
    status: true,
    approvedBy: true,
    createdAt: true,
    processedAt: true,
  });

// Registration form schemas
export const registrationFieldSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum([
    'text', 'textarea', 'number', 'email', 'tel', 'date', 'select',
    'checkbox', 'radio', 'file'
  ]),
  label: z.string().min(1, "Label is required"),
  name: z.string().min(1, "Field name is required"),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    customMessage: z.string().optional(),
  }).optional(),
  defaultValue: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null()
  ]).optional().nullable(),
  isHidden: z.boolean().default(false),
  order: z.number().optional(),
  isUserEditable: z.boolean().default(true), // Can users modify this field after registration
  isAdminOnly: z.boolean().default(false), // Only visible/editable by admins
  mapToUserField: z.string().optional(), // Maps to a field in the users table
  mapToProfileField: z.string().optional(), // Maps to a field in the userProfiles table
});

export const insertRegistrationFormSchema = createInsertSchema(registrationForms)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    version: true,
  })
  .extend({
    fields: z.array(registrationFieldSchema)
  });

export const insertUserImportLogSchema = createInsertSchema(userImportLogs)
  .omit({
    id: true,
    importedAt: true,
  });

export const bulkUserImportSchema = z.object({
  users: z.array(z.record(z.string(), z.any())),
  options: z.object({
    verificationStatus: z.enum(['pending', 'verified', 'rejected']).default('pending'),
    sendWelcomeEmails: z.boolean().default(false),
    generatePasswords: z.boolean().default(true),
    defaultRole: z.enum(['observer', 'admin', 'supervisor']).default('observer'),
  }),
  mappings: z.record(z.string(), z.string()).optional(), // Maps CSV/form headers to user fields
});

export type LoginUser = z.infer<typeof loginUserSchema>;

// Registration form types
export type RegistrationField = z.infer<typeof registrationFieldSchema>;
export type InsertRegistrationForm = z.infer<typeof insertRegistrationFormSchema>;
export type RegistrationForm = typeof registrationForms.$inferSelect;

export type InsertUserImportLog = z.infer<typeof insertUserImportLogSchema>;
export type UserImportLog = typeof userImportLogs.$inferSelect;
export type BulkUserImport = z.infer<typeof bulkUserImportSchema>;

// Define types for training integration
export type InsertTrainingIntegration = z.infer<typeof insertTrainingIntegrationSchema>;
export type TrainingIntegration = typeof trainingIntegrations.$inferSelect;

export type InsertTrainingProgress = z.infer<typeof insertTrainingProgressSchema>;
export type TrainingProgress = typeof trainingProgress.$inferSelect;

export type InsertExternalUserMapping = z.infer<typeof insertExternalUserMappingSchema>;
export type ExternalUserMapping = typeof externalUserMappings.$inferSelect;

// ID Card Templates table
export const idCardTemplates = pgTable("id_card_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateData: jsonb("template_data").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  securityFeatures: jsonb("security_features").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ID card template schema for validation
export const idCardTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  templateData: z.object({
    background: z.string().optional(), // Base64 or URL for background
    logo: z.string().optional(), // Base64 or URL for logo
    elements: z.array(z.object({
      type: z.enum(['text', 'image', 'qrcode', 'barcode']),
      x: z.number(), // X position
      y: z.number(), // Y position
      width: z.number().optional(),
      height: z.number().optional(),
      value: z.string().optional(), // Static text or data field name
      fieldName: z.string().optional(), // Reference to user data field
      style: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    })),
    dimensions: z.object({
      width: z.number(),
      height: z.number(),
    }),
  }),
  securityFeatures: z.object({
    watermark: z.string().optional(),
    hologram: z.string().optional(),
    qrEncryption: z.boolean().optional(),
    otherFeatures: z.array(z.string()).optional(),
  }).optional().default({}),
  isActive: z.boolean().optional().default(false),
});

// Create insert schema for ID card templates
export const insertIdCardTemplateSchema = createInsertSchema(idCardTemplates);

// Form field type definitions
export type FormField = z.infer<typeof formFieldSchema>;
export type FormSection = z.infer<typeof formSectionSchema>;
export type FormTemplateExtended = z.infer<typeof formTemplateExtendedSchema>;

// ID card template types
export type IdCardTemplate = typeof idCardTemplates.$inferSelect;
export type InsertIdCardTemplate = z.infer<typeof insertIdCardTemplateSchema>;

// Photo approval types
export type PhotoApproval = typeof photoApprovals.$inferSelect;
export type InsertPhotoApproval = z.infer<typeof insertPhotoApprovalSchema>;

// System setting types
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
