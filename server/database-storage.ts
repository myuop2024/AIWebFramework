import { eq, desc, and, gt, lt, or, between, sql, asc, isNull, not } from "drizzle-orm";
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
  messages, Message, InsertMessage,
  registrationForms, RegistrationForm, InsertRegistrationForm,
  userImportLogs, UserImportLog, InsertUserImportLog,
  idCardTemplates, IdCardTemplate, InsertIdCardTemplate,
  photoApprovals, PhotoApproval, InsertPhotoApproval,
  systemSettings, SystemSetting, InsertSystemSetting,
  errorLogs, ErrorLog, InsertErrorLog, ErrorLogQueryOptions, ErrorLogDeleteCriteria,
  BulkUserImport, RegistrationField
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
  // System settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    try {
      const result = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, key));
      return result[0];
    } catch (error) {
      console.error('Error fetching system setting:', error);
      return undefined;
    }
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    try {
      return await db.select().from(systemSettings);
    } catch (error) {
      console.error('Error fetching all system settings:', error);
      return [];
    }
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    try {
      const result = await db
        .insert(systemSettings)
        .values(setting)
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error creating system setting:', error);
      throw error;
    }
  }

  async updateSystemSetting(key: string, value: any, updatedBy?: number): Promise<SystemSetting | undefined> {
    try {
      const result = await db
        .update(systemSettings)
        .set({ 
          settingValue: value, 
          updatedAt: new Date(),
          updatedBy: updatedBy
        })
        .where(eq(systemSettings.settingKey, key))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating system setting:', error);
      return undefined;
    }
  }
  
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
  
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
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
  
  async updatePollingStation(id: number, data: Partial<PollingStation>): Promise<PollingStation | undefined> {
    // If lat/lng coordinates are provided in a JSON string, extract them
    if (data.coordinates && typeof data.coordinates === 'string') {
      try {
        const coords = JSON.parse(data.coordinates);
        if (coords.lat && coords.lng) {
          data.latitude = coords.lat;
          data.longitude = coords.lng;
        }
      } catch (e) {
        // Invalid coordinates format, ignore and continue
        console.error('Error parsing coordinates:', e);
      }
    }
    
    const result = await db.update(pollingStations)
      .set(data)
      .where(eq(pollingStations.id, id))
      .returning();
      
    return result[0];
  }
  
  async deletePollingStation(id: number): Promise<boolean> {
    try {
      // First check if station exists
      const station = await this.getPollingStation(id);
      if (!station) return false;
      
      // Delete the polling station
      await db.delete(pollingStations).where(eq(pollingStations.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting polling station:', error);
      return false;
    }
  }

  // Assignment operations
  async getAssignmentsByUserId(userId: number): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.userId, userId));
  }

  async getAssignmentsByStationId(stationId: number): Promise<Assignment[]> {
    return db.select()
      .from(assignments)
      .where(eq(assignments.stationId, stationId))
      .orderBy(assignments.startDate);
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const result = await db.select().from(assignments).where(eq(assignments.id, id));
    return result[0];
  }

  async getActiveAssignments(userId: number): Promise<Assignment[]> {
    const now = new Date();
    return db.select()
      .from(assignments)
      .where(
        and(
          eq(assignments.userId, userId),
          or(
            eq(assignments.status, 'active'),
            eq(assignments.status, 'scheduled')
          ),
          // Assignment end date is in the future
          gt(assignments.endDate, now)
        )
      )
      .orderBy(assignments.startDate);
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    // Check if this would create a scheduling conflict
    const conflicts = await this.checkSchedulingConflicts(
      assignment.userId,
      assignment.startDate,
      assignment.endDate,
      undefined // No assignment ID since it's a new assignment
    );

    if (conflicts.length > 0) {
      throw new Error(`Schedule conflict detected with ${conflicts.length} existing assignments`);
    }

    // Check if the polling station has capacity
    const existingAssignments = await this.getActiveAssignmentsForStation(
      assignment.stationId,
      assignment.startDate,
      assignment.endDate
    );

    const station = await this.getPollingStation(assignment.stationId);
    if (!station) {
      throw new Error('Polling station not found');
    }

    // Check if adding this assignment would exceed the station's capacity
    if (existingAssignments.length >= (station.capacity || 5)) {
      throw new Error(`Polling station capacity (${station.capacity}) exceeded`);
    }

    // Defaults for assignment
    const role = assignment.role || 'observer';
    const status = assignment.status || 'scheduled';
    const isPrimary = assignment.isPrimary || false;
    const checkInRequired = assignment.checkInRequired !== undefined ? assignment.checkInRequired : true;
    const priority = assignment.priority || 1;

    const result = await db.insert(assignments)
      .values({
        ...assignment,
        assignedAt: new Date(),
        role,
        status,
        isPrimary,
        checkInRequired,
        priority
      })
      .returning();
    return result[0];
  }

  async updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment | undefined> {
    // If dates are being updated, check for scheduling conflicts
    if (data.startDate || data.endDate) {
      const currentAssignment = await this.getAssignment(id);
      if (!currentAssignment) {
        throw new Error('Assignment not found');
      }

      const startDate = data.startDate || currentAssignment.startDate;
      const endDate = data.endDate || currentAssignment.endDate;

      const conflicts = await this.checkSchedulingConflicts(
        currentAssignment.userId,
        startDate,
        endDate,
        id // Exclude the current assignment from conflict checks
      );

      if (conflicts.length > 0) {
        throw new Error(`Schedule conflict detected with ${conflicts.length} existing assignments`);
      }
    }

    const result = await db.update(assignments)
      .set(data)
      .where(eq(assignments.id, id))
      .returning();
    return result[0];
  }

  // Check if an assignment would conflict with existing assignments
  async checkSchedulingConflicts(
    userId: number,
    startDate: Date,
    endDate: Date,
    excludeAssignmentId?: number
  ): Promise<Assignment[]> {
    let query = db.select()
      .from(assignments)
      .where(
        and(
          eq(assignments.userId, userId),
          or(
            // Case 1: Start date falls within existing assignment
            between(startDate, assignments.startDate, assignments.endDate),
            // Case 2: End date falls within existing assignment
            between(endDate, assignments.startDate, assignments.endDate),
            // Case 3: Assignment encompasses an existing assignment
            and(
              lt(startDate, assignments.startDate),
              gt(endDate, assignments.endDate)
            )
          ),
          // Only consider active or scheduled assignments
          or(
            eq(assignments.status, 'active'),
            eq(assignments.status, 'scheduled')
          )
        )
      );

    // Exclude the current assignment if we're checking for conflicts during an update
    if (excludeAssignmentId) {
      query = query.where(sql`${assignments.id} != ${excludeAssignmentId}`);
    }

    return query;
  }

  // Get active assignments for a polling station during a specified time period
  async getActiveAssignmentsForStation(
    stationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Assignment[]> {
    return db.select()
      .from(assignments)
      .where(
        and(
          eq(assignments.stationId, stationId),
          or(
            eq(assignments.status, 'active'),
            eq(assignments.status, 'scheduled')
          ),
          or(
            // Assignments that overlap with the requested period
            between(startDate, assignments.startDate, assignments.endDate),
            between(endDate, assignments.startDate, assignments.endDate),
            and(
              lt(startDate, assignments.startDate),
              gt(endDate, assignments.endDate)
            )
          )
        )
      );
  }

  // Check in an observer at a polling station
  async checkInObserver(assignmentId: number): Promise<Assignment | undefined> {
    const now = new Date();
    const result = await db.update(assignments)
      .set({
        lastCheckIn: now,
        status: 'active'
      })
      .where(eq(assignments.id, assignmentId))
      .returning();
    return result[0];
  }

  // Check out an observer from a polling station
  async checkOutObserver(assignmentId: number): Promise<Assignment | undefined> {
    const now = new Date();
    const result = await db.update(assignments)
      .set({
        lastCheckOut: now,
        status: 'completed'
      })
      .where(eq(assignments.id, assignmentId))
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
  
  // Registration form operations
  async getRegistrationForm(id: number): Promise<RegistrationForm | undefined> {
    const result = await db.select().from(registrationForms).where(eq(registrationForms.id, id));
    return result[0];
  }
  
  async getActiveRegistrationForm(): Promise<RegistrationForm | undefined> {
    const result = await db.select()
      .from(registrationForms)
      .where(eq(registrationForms.isActive, true))
      .orderBy(desc(registrationForms.version))
      .limit(1);
    return result[0];
  }
  
  async getAllRegistrationForms(): Promise<RegistrationForm[]> {
    return db.select()
      .from(registrationForms)
      .orderBy(desc(registrationForms.createdAt));
  }
  
  async createRegistrationForm(form: InsertRegistrationForm): Promise<RegistrationForm> {
    const now = new Date();
    
    // Get the latest version of the form with the same name
    const existingForms = await db.select()
      .from(registrationForms)
      .where(eq(registrationForms.name, form.name))
      .orderBy(desc(registrationForms.version));
    
    // Increment version if form with same name exists
    const version = existingForms.length > 0 ? existingForms[0].version + 1 : 1;
    
    // Ensure at least one field maps to a required user field
    const requiredUserFields = ['username', 'email', 'password', 'firstName', 'lastName'];
    const hasMappedRequiredFields = form.fields.some(field => 
      requiredUserFields.includes(field.mapToUserField || ''));
    
    if (!hasMappedRequiredFields) {
      throw new Error('Registration form must map to required user fields (username, email, password, firstName, lastName)');
    }
    
    const result = await db.insert(registrationForms)
      .values({
        ...form,
        createdAt: now,
        updatedAt: now,
        version
      })
      .returning();
    return result[0];
  }
  
  async updateRegistrationForm(id: number, data: Partial<RegistrationForm>): Promise<RegistrationForm | undefined> {
    const now = new Date();
    const result = await db.update(registrationForms)
      .set({
        ...data,
        updatedAt: now
      })
      .where(eq(registrationForms.id, id))
      .returning();
    return result[0];
  }
  
  async activateRegistrationForm(id: number): Promise<RegistrationForm | undefined> {
    // Deactivate all other forms first
    await db.update(registrationForms)
      .set({ isActive: false })
      .where(eq(registrationForms.isActive, true));
    
    // Then activate the requested form
    const result = await db.update(registrationForms)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(registrationForms.id, id))
      .returning();
    return result[0];
  }
  
  // User import operations
  async createUserImportLog(log: InsertUserImportLog): Promise<UserImportLog> {
    const result = await db.insert(userImportLogs)
      .values({
        ...log,
        importedAt: new Date()
      })
      .returning();
    return result[0];
  }
  
  async getUserImportLog(id: number): Promise<UserImportLog | undefined> {
    const result = await db.select().from(userImportLogs).where(eq(userImportLogs.id, id));
    return result[0];
  }
  
  async getAllUserImportLogs(): Promise<UserImportLog[]> {
    return db.select()
      .from(userImportLogs)
      .orderBy(desc(userImportLogs.importedAt));
  }
  
  async updateUserImportLog(id: number, data: Partial<UserImportLog>): Promise<UserImportLog | undefined> {
    const result = await db.update(userImportLogs)
      .set(data)
      .where(eq(userImportLogs.id, id))
      .returning();
    return result[0];
  }
  
  async bulkCreateUsers(userData: any[], options: {
    verificationStatus?: string;
    defaultRole?: string;
    passwordHash?: (password: string) => string;
  } = {}): Promise<{ success: User[], failures: any[] }> {
    const success: User[] = [];
    const failures: any[] = [];
    
    const verificationStatus = options.verificationStatus || 'pending';
    const defaultRole = options.defaultRole || 'observer';
    const passwordHash = options.passwordHash || ((pwd: string) => crypto.createHash('sha256').update(pwd).digest('hex'));
    
    for (const data of userData) {
      try {
        // Generate a temporary password if not provided
        if (!data.password) {
          data.password = Math.random().toString(36).slice(-8);
        }
        
        // Hash the password
        const hashedPassword = passwordHash(data.password);
        
        // Create user
        const user = await this.createUser({
          ...data,
          password: hashedPassword,
          role: data.role || defaultRole,
          verificationStatus: data.verificationStatus || verificationStatus
        });
        
        success.push(user);
      } catch (error) {
        failures.push({
          data,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return { success, failures };
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
        // Use gt() from drizzle-orm for proper comparison
        gt(events.startTime, now)
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
  
  // Statistics operations for admin dashboard
  async getTotalUserCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    return result[0].count;
  }
  
  async getActiveObserverCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.role, 'observer'),
          eq(users.verificationStatus, 'verified'),
          eq(users.trainingStatus, 'completed')
        )
      );
    return result[0].count;
  }
  
  async getUserCountByRole(): Promise<Record<string, number>> {
    const result = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.role);
    
    const roleMap: Record<string, number> = {};
    result.forEach(r => {
      const role = r.role || 'unassigned';
      roleMap[role] = r.count;
    });
    
    return roleMap;
  }
  
  async getReportCountByType(): Promise<Record<string, number>> {
    const result = await db
      .select({
        type: reports.reportType,
        count: sql<number>`count(*)`
      })
      .from(reports)
      .groupBy(reports.reportType);
    
    const typeMap: Record<string, number> = {};
    result.forEach(r => {
      typeMap[r.type] = r.count;
    });
    
    return typeMap;
  }
  
  async getReportCountByStatus(): Promise<Record<string, number>> {
    const result = await db
      .select({
        status: reports.status,
        count: sql<number>`count(*)`
      })
      .from(reports)
      .groupBy(reports.status);
    
    const statusMap: Record<string, number> = {};
    result.forEach(r => {
      statusMap[r.status] = r.count;
    });
    
    return statusMap;
  }
  
  async getActiveAssignmentsCount(): Promise<number> {
    const now = new Date();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(
        and(
          or(
            eq(assignments.status, 'active'),
            eq(assignments.status, 'scheduled')
          ),
          gt(assignments.endDate, now)
        )
      );
    return result[0].count;
  }
  
  async getStationsWithIssueReports(): Promise<{id: number, name: string, issueCount: number}[]> {
    // Get counts of issue reports by station
    const reportCounts = await db
      .select({
        stationId: reports.stationId,
        count: sql<number>`count(*)`
      })
      .from(reports)
      .where(
        or(
          eq(reports.reportType, 'issue'),
          eq(reports.reportType, 'incident')
        )
      )
      .groupBy(reports.stationId);
    
    // Get station details for stations with issues
    const stationIds = reportCounts.map(r => r.stationId);
    
    if (stationIds.length === 0) {
      return [];
    }
    
    const stationDetails = await db
      .select({
        id: pollingStations.id,
        name: pollingStations.name
      })
      .from(pollingStations)
      .where(
        sql`${pollingStations.id} IN (${stationIds.join(', ')})`
      );
    
    // Map station details with issue counts
    const stationsWithIssues = stationDetails.map(station => {
      const reportData = reportCounts.find(r => r.stationId === station.id);
      return {
        id: station.id,
        name: station.name,
        issueCount: reportData?.count || 0
      };
    });
    
    // Sort by issue count (highest first)
    return stationsWithIssues.sort((a, b) => b.issueCount - a.issueCount);
  }

  // ID Card Template Methods
  async getAllIdCardTemplates(): Promise<IdCardTemplate[]> {
    try {
      return await db.select().from(idCardTemplates);
    } catch (error) {
      console.error('Error fetching all ID card templates:', error);
      return [];
    }
  }

  async getActiveIdCardTemplate(): Promise<IdCardTemplate | undefined> {
    try {
      const [template] = await db
        .select()
        .from(idCardTemplates)
        .where(eq(idCardTemplates.isActive, true))
        .limit(1);
      return template;
    } catch (error) {
      console.error('Error fetching active ID card template:', error);
      return undefined;
    }
  }

  async getIdCardTemplate(id: number): Promise<IdCardTemplate | undefined> {
    try {
      const [template] = await db
        .select()
        .from(idCardTemplates)
        .where(eq(idCardTemplates.id, id));
      return template;
    } catch (error) {
      console.error('Error fetching ID card template:', error);
      return undefined;
    }
  }

  async createIdCardTemplate(template: InsertIdCardTemplate): Promise<IdCardTemplate> {
    try {
      // If this template is set as active, deactivate all others
      if (template.isActive) {
        await db
          .update(idCardTemplates)
          .set({ isActive: false })
          .where(eq(idCardTemplates.isActive, true));
      }

      const [newTemplate] = await db
        .insert(idCardTemplates)
        .values(template)
        .returning();
      return newTemplate;
    } catch (error) {
      console.error('Error creating ID card template:', error);
      throw new Error('Failed to create ID card template');
    }
  }

  async updateIdCardTemplate(id: number, data: Partial<IdCardTemplate>): Promise<IdCardTemplate | undefined> {
    try {
      // If this template is set as active, deactivate all others
      if (data.isActive) {
        await db
          .update(idCardTemplates)
          .set({ isActive: false })
          .where(eq(idCardTemplates.isActive, true));
      }

      const [updated] = await db
        .update(idCardTemplates)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(idCardTemplates.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating ID card template:', error);
      return undefined;
    }
  }

  async deleteIdCardTemplate(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(idCardTemplates)
        .where(eq(idCardTemplates.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting ID card template:', error);
      return false;
    }
  }

  // Photo approval operations
  async getPhotoApproval(id: number): Promise<PhotoApproval | undefined> {
    try {
      const [approval] = await db
        .select()
        .from(photoApprovals)
        .where(eq(photoApprovals.id, id));
      return approval;
    } catch (error) {
      console.error('Error fetching photo approval:', error);
      return undefined;
    }
  }

  async getPendingPhotoApprovals(): Promise<PhotoApproval[]> {
    try {
      const approvals = await db
        .select()
        .from(photoApprovals)
        .where(eq(photoApprovals.status, "pending"))
        .orderBy(desc(photoApprovals.createdAt));
      return approvals;
    } catch (error) {
      console.error('Error fetching pending photo approvals:', error);
      return [];
    }
  }

  async getPhotoApprovalsByUserId(userId: number): Promise<PhotoApproval[]> {
    try {
      const approvals = await db
        .select()
        .from(photoApprovals)
        .where(eq(photoApprovals.userId, userId))
        .orderBy(desc(photoApprovals.createdAt));
      return approvals;
    } catch (error) {
      console.error('Error fetching photo approvals by user ID:', error);
      return [];
    }
  }

  async createPhotoApproval(approval: InsertPhotoApproval): Promise<PhotoApproval> {
    try {
      const [newApproval] = await db
        .insert(photoApprovals)
        .values(approval)
        .returning();
      return newApproval;
    } catch (error) {
      console.error('Error creating photo approval:', error);
      throw new Error('Failed to create photo approval');
    }
  }

  async updatePhotoApproval(id: number, data: Partial<PhotoApproval>): Promise<PhotoApproval | undefined> {
    try {
      const [updated] = await db
        .update(photoApprovals)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(photoApprovals.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating photo approval:', error);
      return undefined;
    }
  }

  async approvePhotoApproval(id: number, approvedBy: number): Promise<PhotoApproval | undefined> {
    try {
      // Get the approval to update the user profile
      const [approval] = await db
        .select()
        .from(photoApprovals)
        .where(eq(photoApprovals.id, id));
      
      if (!approval) {
        return undefined;
      }
      
      // Update the user's profile with the approved photo
      await db
        .update(userProfiles)
        .set({
          profilePhotoUrl: approval.photoUrl,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, approval.userId));
      
      // Update the approval status
      const [updated] = await db
        .update(photoApprovals)
        .set({
          status: "approved",
          reviewedBy: approvedBy,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(photoApprovals.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error approving photo:', error);
      return undefined;
    }
  }

  async rejectPhotoApproval(id: number, reviewedBy: number, notes?: string): Promise<PhotoApproval | undefined> {
    try {
      const [updated] = await db
        .update(photoApprovals)
        .set({
          status: "rejected",
          reviewedBy,
          reviewedAt: new Date(),
          notes: notes || null,
          updatedAt: new Date()
        })
        .where(eq(photoApprovals.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error rejecting photo:', error);
      return undefined;
    }
  }

  // Error log operations
  async getErrorLog(id: number): Promise<ErrorLog | undefined> {
    try {
      const result = await db
        .select()
        .from(errorLogs)
        .where(eq(errorLogs.id, id));
      return result[0];
    } catch (error) {
      console.error('Error fetching error log:', error);
      return undefined;
    }
  }
  
  async getErrorLogs(options?: ErrorLogQueryOptions): Promise<{logs: ErrorLog[], total: number}> {
    try {
      // First, build the query for counting total records
      let countQuery = db.select({ count: sql`count(*)` }).from(errorLogs);
      
      // Next, build the query for fetching the actual logs
      let logsQuery = db.select().from(errorLogs);
      
      // Apply filters if options are provided
      if (options) {
        const conditions = [];
        
        if (options.status) {
          conditions.push(eq(errorLogs.resolved, options.status === 'resolved'));
        }
        
        if (options.level) {
          conditions.push(eq(errorLogs.level, options.level));
        }
        
        if (options.source) {
          conditions.push(eq(errorLogs.source, options.source));
        }
        
        if (options.search) {
          conditions.push(
            or(
              sql`${errorLogs.message} ILIKE ${'%' + options.search + '%'}`,
              sql`${errorLogs.stack} ILIKE ${'%' + options.search + '%'}`,
              sql`${errorLogs.context}::text ILIKE ${'%' + options.search + '%'}`
            )
          );
        }
        
        if (options.startDate && options.endDate) {
          conditions.push(
            between(
              errorLogs.createdAt,
              new Date(options.startDate),
              new Date(options.endDate)
            )
          );
        }
        
        if (options.userId) {
          conditions.push(eq(errorLogs.userId, options.userId));
        }
        
        // Apply all conditions if any exist
        if (conditions.length > 0) {
          countQuery = countQuery.where(and(...conditions));
          logsQuery = logsQuery.where(and(...conditions));
        }
        
        // Sort by creation date descending (newest first) by default
        logsQuery = logsQuery.orderBy(desc(errorLogs.createdAt));
        
        // Apply pagination
        if (options.page !== undefined && options.limit !== undefined) {
          const offset = (options.page - 1) * options.limit;
          logsQuery = logsQuery.limit(options.limit).offset(offset);
        }
      } else {
        // Default ordering if no options provided
        logsQuery = logsQuery.orderBy(desc(errorLogs.createdAt));
      }
      
      // Execute both queries
      const [countResult, logs] = await Promise.all([
        countQuery,
        logsQuery
      ]);
      
      // Extract count from result
      const total = Number(countResult[0]?.count || 0);
      
      return { logs, total };
    } catch (error) {
      console.error('Error fetching error logs:', error);
      return { logs: [], total: 0 };
    }
  }
  
  async createErrorLog(errorLog: InsertErrorLog): Promise<ErrorLog> {
    try {
      const [result] = await db
        .insert(errorLogs)
        .values({
          ...errorLog,
          resolved: false
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating error log:', error);
      throw new Error('Failed to create error log');
    }
  }
  
  async updateErrorLog(id: number, data: Partial<ErrorLog>): Promise<ErrorLog | undefined> {
    try {
      const [updated] = await db
        .update(errorLogs)
        .set(data)
        .where(eq(errorLogs.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating error log:', error);
      return undefined;
    }
  }
  
  async deleteErrorLog(id: number): Promise<boolean> {
    try {
      await db
        .delete(errorLogs)
        .where(eq(errorLogs.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting error log:', error);
      return false;
    }
  }
  
  async markErrorLogAsResolved(id: number, resolvedBy?: number): Promise<ErrorLog | undefined> {
    try {
      const [updated] = await db
        .update(errorLogs)
        .set({
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: resolvedBy || null
        })
        .where(eq(errorLogs.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error marking error log as resolved:', error);
      return undefined;
    }
  }
  
  async resolveErrorLog(id: number, resolvedBy: number, notes?: string): Promise<ErrorLog | undefined> {
    try {
      const [updated] = await db
        .update(errorLogs)
        .set({
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: resolvedBy,
          resolutionNotes: notes || null
        })
        .where(eq(errorLogs.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error resolving error log:', error);
      return undefined;
    }
  }
  
  async deleteErrorLogs(criteria: ErrorLogDeleteCriteria): Promise<number> {
    try {
      let query = db.delete(errorLogs);
      const conditions = [];
      
      if (criteria.ids && criteria.ids.length > 0) {
        conditions.push(sql`${errorLogs.id} IN (${criteria.ids.join(',')})`);
      }
      
      if (criteria.status) {
        conditions.push(eq(errorLogs.resolved, criteria.status === 'resolved'));
      }
      
      if (criteria.level) {
        conditions.push(eq(errorLogs.level, criteria.level));
      }
      
      if (criteria.source) {
        conditions.push(eq(errorLogs.source, criteria.source));
      }
      
      if (criteria.olderThan) {
        conditions.push(lt(errorLogs.createdAt, new Date(criteria.olderThan)));
      }
      
      // Apply all conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const result = await query.returning({ id: errorLogs.id });
      return result.length;
    } catch (error) {
      console.error('Error bulk deleting error logs:', error);
      return 0;
    }
  }
}