import { eq, desc, and } from "drizzle-orm";
import { IStorage } from "./storage";
import { db } from "./db";
import {
  users, User, InsertUser,
  userProfiles, UserProfile, InsertUserProfile,
  documents, Document, InsertDocument,
  pollingStations, PollingStation, InsertPollingStation,
  assignments, Assignment, InsertAssignment,
  formTemplates, FormTemplate, InsertFormTemplate,
  reports, Report, InsertReport,
  reportAttachments, ReportAttachment, InsertReportAttachment,
  events, Event, InsertEvent,
  eventParticipation, EventParticipation, InsertEventParticipation,
  faqEntries, Faq, InsertFaq,
  newsEntries, News, InsertNews,
  messages, Message, InsertMessage
} from "@shared/schema";
import crypto from "crypto";

// Generate a unique observer ID in the format "JM+6-digit-number"
function generateObserverId(): string {
  const min = 100000; // Minimum 6-digit number
  const max = 999999; // Maximum 6-digit number
  const randomDigits = Math.floor(min + Math.random() * (max - min + 1)).toString();
  return `JM${randomDigits}`;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByObserverId(observerId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.observerId, observerId));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Generate observer ID if not provided
    if (!user.observerId) {
      user.observerId = generateObserverId();
    }
    
    // Set default values for role and status if not provided
    if (!user.role) {
      user.role = 'observer';
    }
    
    if (!user.verificationStatus) {
      user.verificationStatus = 'pending';
    }
    
    if (!user.trainingStatus) {
      user.trainingStatus = 'not-started';
    }
    
    // Create user
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // User profile operations
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const result = await db.insert(userProfiles).values(profile).returning();
    return result[0];
  }

  async updateUserProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile | undefined> {
    // Check if profile exists
    const existingProfile = await this.getUserProfile(userId);
    
    if (!existingProfile) {
      // If no profile exists, create one
      return this.createUserProfile({ ...data, userId } as InsertUserProfile);
    }
    
    // Otherwise, update the existing profile
    const result = await db.update(userProfiles)
      .set(data)
      .where(eq(userProfiles.userId, userId))
      .returning();
      
    return result[0];
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    const result = await db.select().from(documents).where(eq(documents.id, id));
    return result[0];
  }

  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.userId, userId));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(document).returning();
    return result[0];
  }

  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    const result = await db.update(documents)
      .set(data)
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }

  // Polling station operations
  async getPollingStation(id: number): Promise<PollingStation | undefined> {
    const result = await db.select().from(pollingStations).where(eq(pollingStations.id, id));
    return result[0];
  }

  async getAllPollingStations(): Promise<PollingStation[]> {
    return db.select().from(pollingStations);
  }

  async createPollingStation(station: InsertPollingStation): Promise<PollingStation> {
    const result = await db.insert(pollingStations).values(station).returning();
    return result[0];
  }

  // Assignment operations
  async getAssignmentsByUserId(userId: number): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.userId, userId));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const result = await db.insert(assignments)
      .values({
        ...assignment,
        assignedAt: new Date()
      })
      .returning();
    return result[0];
  }

  // Report operations
  async getReport(id: number): Promise<Report | undefined> {
    const result = await db.select().from(reports).where(eq(reports.id, id));
    return result[0];
  }

  async getReportsByUserId(userId: number): Promise<Report[]> {
    return db.select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.submittedAt));
  }

  async getReportsByStationId(stationId: number): Promise<Report[]> {
    return db.select()
      .from(reports)
      .where(eq(reports.stationId, stationId))
      .orderBy(desc(reports.submittedAt));
  }

  async getReportsByStatus(status: string): Promise<Report[]> {
    return db.select()
      .from(reports)
      .where(eq(reports.status, status))
      .orderBy(desc(reports.submittedAt));
  }

  async createReport(report: InsertReport): Promise<Report> {
    // Generate content hash for data integrity verification
    const contentHash = this.generateContentHash(report.content);
    
    const result = await db.insert(reports)
      .values({
        ...report,
        submittedAt: new Date(),
        status: 'submitted',
        contentHash,
        encryptedData: false
      })
      .returning();
    return result[0];
  }

  async updateReport(id: number, data: Partial<Report>): Promise<Report | undefined> {
    // If content is updated, regenerate the content hash
    if (data.content) {
      data.contentHash = this.generateContentHash(data.content);
    }
    
    const result = await db.update(reports)
      .set(data)
      .where(eq(reports.id, id))
      .returning();
    return result[0];
  }
  
  // Generate a content hash for a report
  generateContentHash(reportContent: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(reportContent)).digest('hex');
  }
  
  // Report attachment operations
  async getReportAttachment(id: number): Promise<ReportAttachment | undefined> {
    const result = await db.select().from(reportAttachments).where(eq(reportAttachments.id, id));
    return result[0];
  }
  
  async getAttachmentsByReportId(reportId: number): Promise<ReportAttachment[]> {
    return db.select()
      .from(reportAttachments)
      .where(eq(reportAttachments.reportId, reportId));
  }
  
  async createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment> {
    const result = await db.insert(reportAttachments)
      .values({
        ...attachment,
        uploadedAt: new Date(),
        ocrProcessed: false,
        ocrText: null,
        encryptionIv: null
      })
      .returning();
    return result[0];
  }
  
  async updateReportAttachment(id: number, data: Partial<ReportAttachment>): Promise<ReportAttachment | undefined> {
    const result = await db.update(reportAttachments)
      .set(data)
      .where(eq(reportAttachments.id, id))
      .returning();
    return result[0];
  }
  
  async deleteReportAttachment(id: number): Promise<boolean> {
    try {
      await db.delete(reportAttachments).where(eq(reportAttachments.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting report attachment:', error);
      return false;
    }
  }
  
  // Form template operations
  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    const result = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
    return result[0];
  }
  
  async getAllFormTemplates(): Promise<FormTemplate[]> {
    return db.select().from(formTemplates);
  }
  
  async getFormTemplatesByCategory(category: string): Promise<FormTemplate[]> {
    return db.select()
      .from(formTemplates)
      .where(eq(formTemplates.category, category));
  }
  
  async getActiveFormTemplates(): Promise<FormTemplate[]> {
    return db.select()
      .from(formTemplates)
      .where(eq(formTemplates.isActive, true));
  }
  
  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const now = new Date();
    const result = await db.insert(formTemplates)
      .values({
        ...template,
        createdAt: now,
        updatedAt: now,
        isActive: true
      })
      .returning();
    return result[0];
  }
  
  async updateFormTemplate(id: number, data: Partial<FormTemplate>): Promise<FormTemplate | undefined> {
    const now = new Date();
    data.updatedAt = now;
    
    const result = await db.update(formTemplates)
      .set(data)
      .where(eq(formTemplates.id, id))
      .returning();
    return result[0];
  }
  
  async deleteFormTemplate(id: number): Promise<boolean> {
    try {
      await db.delete(formTemplates).where(eq(formTemplates.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting form template:', error);
      return false;
    }
  }

  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  }

  async getAllEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(events.startTime);
  }

  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return db.select()
      .from(events)
      .where(
        events.startTime > now
      )
      .orderBy(events.startTime);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(event).returning();
    return result[0];
  }

  // Event participation operations
  async getEventParticipation(userId: number, eventId: number): Promise<EventParticipation | undefined> {
    const result = await db.select()
      .from(eventParticipation)
      .where(
        and(
          eq(eventParticipation.userId, userId),
          eq(eventParticipation.eventId, eventId)
        )
      );
    return result[0];
  }

  async getEventParticipationsByUserId(userId: number): Promise<EventParticipation[]> {
    return db.select()
      .from(eventParticipation)
      .where(eq(eventParticipation.userId, userId));
  }

  async createEventParticipation(participation: InsertEventParticipation): Promise<EventParticipation> {
    const result = await db.insert(eventParticipation)
      .values({
        ...participation,
        status: participation.status || 'registered'
      })
      .returning();
    return result[0];
  }

  async updateEventParticipation(id: number, data: Partial<EventParticipation>): Promise<EventParticipation | undefined> {
    const result = await db.update(eventParticipation)
      .set(data)
      .where(eq(eventParticipation.id, id))
      .returning();
    return result[0];
  }

  // FAQ operations
  async getFaq(id: number): Promise<Faq | undefined> {
    const result = await db.select().from(faqEntries).where(eq(faqEntries.id, id));
    return result[0];
  }

  async getAllFaqs(): Promise<Faq[]> {
    return db.select()
      .from(faqEntries)
      .where(eq(faqEntries.isPublished, true));
  }

  async createFaq(faq: InsertFaq): Promise<Faq> {
    const result = await db.insert(faqEntries)
      .values({
        ...faq,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: faq.isPublished !== undefined ? faq.isPublished : true
      })
      .returning();
    return result[0];
  }

  // News operations
  async getNews(id: number): Promise<News | undefined> {
    const result = await db.select().from(newsEntries).where(eq(newsEntries.id, id));
    return result[0];
  }

  async getAllNews(): Promise<News[]> {
    return db.select()
      .from(newsEntries)
      .where(eq(newsEntries.isPublished, true))
      .orderBy(desc(newsEntries.createdAt));
  }

  async getLatestNews(limit = 5): Promise<News[]> {
    return db.select()
      .from(newsEntries)
      .where(eq(newsEntries.isPublished, true))
      .orderBy(desc(newsEntries.createdAt))
      .limit(limit);
  }

  async createNews(newsItem: InsertNews): Promise<News> {
    const result = await db.insert(newsEntries)
      .values({
        ...newsItem,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: newsItem.isPublished !== undefined ? newsItem.isPublished : true
      })
      .returning();
    return result[0];
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id));
    return result[0];
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
    return db.select()
      .from(messages)
      .where(
        and(
          eq(messages.senderId, userId1),
          eq(messages.receiverId, userId2)
        )
      )
      .orderBy(messages.sentAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages)
      .values({
        ...message,
        sentAt: new Date(),
        isRead: false
      })
      .returning();
    return result[0];
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const result = await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }
}