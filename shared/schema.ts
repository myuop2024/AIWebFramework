import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
});

// User-polling station assignments
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => pollingStations.id),
  isPrimary: boolean("is_primary").default(false),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Observer reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => pollingStations.id),
  reportType: text("report_type").notNull(),
  content: jsonb("content").notNull(),
  status: text("status").notNull().default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  checkinTime: timestamp("checkin_time"),
  checkoutTime: timestamp("checkout_time"),
  mileageTraveled: integer("mileage_traveled"),
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

export const insertReportSchema = createInsertSchema(reports)
  .omit({
    id: true,
    status: true,
    submittedAt: true,
    reviewedAt: true,
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

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
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

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

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

export type LoginUser = z.infer<typeof loginUserSchema>;
