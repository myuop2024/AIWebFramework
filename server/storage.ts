import {
  users, userProfiles, documents, pollingStations, assignments, formTemplates, reports, reportAttachments,
  events, eventParticipation, faqEntries, newsEntries, messages,
  type User, type InsertUser, type UserProfile, type InsertUserProfile,
  type Document, type InsertDocument, type PollingStation, type InsertPollingStation,
  type Assignment, type InsertAssignment, type FormTemplate, type InsertFormTemplate,
  type Report, type InsertReport, type ReportAttachment, type InsertReportAttachment,
  type Event, type InsertEvent, type EventParticipation, type InsertEventParticipation,
  type Faq, type InsertFaq, type News, type InsertNews, type Message, type InsertMessage
} from "@shared/schema";
import crypto from 'crypto';

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByObserverId(observerId: string): Promise<User | undefined>;
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
}

// Generate a unique observer ID in the format "JM+6-digit-number"
function generateObserverId(): string {
  const min = 100000; // Minimum 6-digit number
  const max = 999999; // Maximum 6-digit number
  const randomDigits = Math.floor(min + Math.random() * (max - min + 1)).toString();
  return `JM${randomDigits}`;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private userProfiles: Map<number, UserProfile>;
  private documents: Map<number, Document>;
  private pollingStations: Map<number, PollingStation>;
  private assignments: Map<number, Assignment>;
  private formTemplates: Map<number, FormTemplate>;
  private reports: Map<number, Report>;
  private reportAttachments: Map<number, ReportAttachment>;
  private events: Map<number, Event>;
  private eventParticipations: Map<number, EventParticipation>;
  private faqs: Map<number, Faq>;
  private news: Map<number, News>;
  private messages: Map<number, Message>;
  
  private userIdCounter: number;
  private profileIdCounter: number;
  private documentIdCounter: number;
  private stationIdCounter: number;
  private assignmentIdCounter: number;
  private formTemplateIdCounter: number;
  private reportIdCounter: number;
  private reportAttachmentIdCounter: number;
  private eventIdCounter: number;
  private participationIdCounter: number;
  private faqIdCounter: number;
  private newsIdCounter: number;
  private messageIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.documents = new Map();
    this.pollingStations = new Map();
    this.assignments = new Map();
    this.formTemplates = new Map();
    this.reports = new Map();
    this.reportAttachments = new Map();
    this.events = new Map();
    this.eventParticipations = new Map();
    this.faqs = new Map();
    this.news = new Map();
    this.messages = new Map();
    
    this.userIdCounter = 1;
    this.profileIdCounter = 1;
    this.documentIdCounter = 1;
    this.stationIdCounter = 1;
    this.assignmentIdCounter = 1;
    this.formTemplateIdCounter = 1;
    this.reportIdCounter = 1;
    this.reportAttachmentIdCounter = 1;
    this.eventIdCounter = 1;
    this.participationIdCounter = 1;
    this.faqIdCounter = 1;
    this.newsIdCounter = 1;
    this.messageIdCounter = 1;
    
    // Initialize with sample data
    this.initializeData();
  }
  
  private initializeData(): void {
    // Sample polling stations
    const station1: InsertPollingStation = {
      name: "Kingston Central #24",
      address: "22 Hope Road",
      city: "Kingston",
      state: "St. Andrew",
      zipCode: "00000",
      stationCode: "KC-024",
      coordinates: JSON.stringify({ lat: 18.0179, lng: -76.8099 })
    };
    
    const station2: InsertPollingStation = {
      name: "St. Andrew Eastern #16",
      address: "45 Mountain View Road",
      city: "Kingston",
      state: "St. Andrew",
      zipCode: "00000",
      stationCode: "SAE-016",
      coordinates: JSON.stringify({ lat: 18.0278, lng: -76.7573 })
    };
    
    this.createPollingStation(station1);
    this.createPollingStation(station2);
    
    // Sample FAQs
    const faq1: InsertFaq = {
      question: "What is the role of an election observer?",
      answer: "Election observers monitor polling stations to ensure the voting process is conducted fairly and according to regulations. They report any irregularities to election officials.",
      category: "General",
      isPublished: true
    };
    
    const faq2: InsertFaq = {
      question: "What identification do I need to bring on election day?",
      answer: "You need to bring your CAFFE Observer ID card and a government-issued photo ID (passport, driver's license, or national ID card).",
      category: "Procedures",
      isPublished: true
    };
    
    this.createFaq(faq1);
    this.createFaq(faq2);
    
    // Sample news
    const news1: InsertNews = {
      title: "Updated Observer Guidelines Released",
      content: "New guidelines for the upcoming general election have been published. All observers are required to review and acknowledge the updated procedures.",
      category: "Announcement",
      isPublished: true
    };
    
    const news2: InsertNews = {
      title: "Additional Training Session Added",
      content: "A supplementary training session on conflict resolution has been added to the observer preparation curriculum. This session is mandatory for all observers.",
      category: "Training",
      isPublished: true
    };
    
    this.createNews(news1);
    this.createNews(news2);
    
    // Sample events
    const today = new Date();
    
    const event1: InsertEvent = {
      title: "Observer Training Session",
      description: "Advanced procedures for election day operations",
      eventType: "Training",
      location: "Online (Zoom)",
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 12, 0)
    };
    
    const event2: InsertEvent = {
      title: "Polling Station Visit",
      description: "Pre-election inspection of Kingston Central #24",
      eventType: "Field Visit",
      location: "22 Hope Road, Kingston",
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 9, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 11, 0)
    };
    
    this.createEvent(event1);
    this.createEvent(event2);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByObserverId(observerId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.observerId === observerId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    // Generate a unique 6-digit observer ID
    let observerId = generateObserverId();
    while (await this.getUserByObserverId(observerId)) {
      observerId = generateObserverId();
    }
    
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      observerId,
      verificationStatus: "pending",
      trainingStatus: "pending",
      createdAt: now
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // User profile operations
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    return Array.from(this.userProfiles.values()).find(
      (profile) => profile.userId === userId,
    );
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const id = this.profileIdCounter++;
    const userProfile: UserProfile = { ...profile, id };
    this.userProfiles.set(id, userProfile);
    return userProfile;
  }

  async updateUserProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return undefined;
    
    const updatedProfile = { ...profile, ...data };
    this.userProfiles.set(profile.id, updatedProfile);
    return updatedProfile;
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.userId === userId,
    );
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const now = new Date();
    const newDocument: Document = { 
      ...document, 
      id, 
      verificationStatus: "pending",
      uploadedAt: now,
      ocrText: "" 
    };
    this.documents.set(id, newDocument);
    return newDocument;
  }

  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    const document = await this.getDocument(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...data };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  // Polling station operations
  async getPollingStation(id: number): Promise<PollingStation | undefined> {
    return this.pollingStations.get(id);
  }

  async getAllPollingStations(): Promise<PollingStation[]> {
    return Array.from(this.pollingStations.values());
  }

  async createPollingStation(station: InsertPollingStation): Promise<PollingStation> {
    const id = this.stationIdCounter++;
    const pollingStation: PollingStation = { ...station, id };
    this.pollingStations.set(id, pollingStation);
    return pollingStation;
  }

  // Assignment operations
  async getAssignmentsByUserId(userId: number): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(
      (assignment) => assignment.userId === userId,
    );
  }

  async getAssignmentsByStationId(stationId: number): Promise<Assignment[]> {
    return Array.from(this.assignments.values())
      .filter(assignment => assignment.stationId === stationId)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async getActiveAssignments(userId: number): Promise<Assignment[]> {
    const now = new Date();
    return Array.from(this.assignments.values())
      .filter(assignment => 
        assignment.userId === userId && 
        (assignment.status === 'active' || assignment.status === 'scheduled') &&
        assignment.endDate > now
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    // Check for scheduling conflicts
    const conflicts = await this.checkSchedulingConflicts(
      assignment.userId,
      assignment.startDate,
      assignment.endDate
    );

    if (conflicts.length > 0) {
      throw new Error(`Schedule conflict detected with ${conflicts.length} existing assignments`);
    }

    // Check station capacity
    const existingAssignments = await this.getActiveAssignmentsForStation(
      assignment.stationId,
      assignment.startDate,
      assignment.endDate
    );

    const station = await this.getPollingStation(assignment.stationId);
    if (!station) {
      throw new Error('Polling station not found');
    }

    const stationCapacity = station.capacity || 5;
    if (existingAssignments.length >= stationCapacity) {
      throw new Error(`Polling station capacity (${stationCapacity}) exceeded`);
    }

    // Create the assignment with default values
    const id = this.assignmentIdCounter++;
    const now = new Date();
    const newAssignment: Assignment = { 
      ...assignment, 
      id, 
      assignedAt: now,
      role: assignment.role || 'observer',
      status: assignment.status || 'scheduled',
      isPrimary: assignment.isPrimary || false,
      checkInRequired: assignment.checkInRequired !== undefined ? assignment.checkInRequired : true,
      priority: assignment.priority || 1,
      notes: assignment.notes || null,
      lastCheckIn: null,
      lastCheckOut: null
    };

    this.assignments.set(id, newAssignment);
    return newAssignment;
  }

  async updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment | undefined> {
    const assignment = await this.getAssignment(id);
    if (!assignment) return undefined;

    // If dates are being updated, check for conflicts
    if (data.startDate || data.endDate) {
      const startDate = data.startDate || assignment.startDate;
      const endDate = data.endDate || assignment.endDate;

      const conflicts = await this.checkSchedulingConflicts(
        assignment.userId,
        startDate,
        endDate,
        id // Exclude current assignment
      );

      if (conflicts.length > 0) {
        throw new Error(`Schedule conflict detected with ${conflicts.length} existing assignments`);
      }
    }

    const updatedAssignment = { ...assignment, ...data };
    this.assignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async checkSchedulingConflicts(
    userId: number,
    startDate: Date,
    endDate: Date,
    excludeAssignmentId?: number
  ): Promise<Assignment[]> {
    return Array.from(this.assignments.values())
      .filter(assignment => {
        // Exclude the current assignment if updating
        if (excludeAssignmentId && assignment.id === excludeAssignmentId) {
          return false;
        }

        // Only check assignments for this user
        if (assignment.userId !== userId) {
          return false;
        }

        // Only consider active or scheduled assignments
        if (assignment.status !== 'active' && assignment.status !== 'scheduled') {
          return false;
        }

        // Check for time conflicts
        return (
          // Start date falls within existing assignment
          (startDate >= assignment.startDate && startDate <= assignment.endDate) ||
          // End date falls within existing assignment
          (endDate >= assignment.startDate && endDate <= assignment.endDate) ||
          // Assignment encompasses an existing assignment
          (startDate <= assignment.startDate && endDate >= assignment.endDate)
        );
      });
  }

  async getActiveAssignmentsForStation(
    stationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Assignment[]> {
    return Array.from(this.assignments.values())
      .filter(assignment => {
        // Only check assignments for this station
        if (assignment.stationId !== stationId) {
          return false;
        }

        // Only consider active or scheduled assignments
        if (assignment.status !== 'active' && assignment.status !== 'scheduled') {
          return false;
        }

        // Check for time overlap
        return (
          // Start date falls within existing assignment
          (startDate >= assignment.startDate && startDate <= assignment.endDate) ||
          // End date falls within existing assignment
          (endDate >= assignment.startDate && endDate <= assignment.endDate) ||
          // Assignment encompasses an existing assignment
          (startDate <= assignment.startDate && endDate >= assignment.endDate)
        );
      });
  }

  async checkInObserver(assignmentId: number): Promise<Assignment | undefined> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return undefined;
    
    const now = new Date();
    const updatedAssignment = { 
      ...assignment, 
      lastCheckIn: now,
      status: 'active'
    };
    
    this.assignments.set(assignmentId, updatedAssignment);
    return updatedAssignment;
  }

  async checkOutObserver(assignmentId: number): Promise<Assignment | undefined> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return undefined;
    
    const now = new Date();
    const updatedAssignment = { 
      ...assignment, 
      lastCheckOut: now,
      status: 'completed'
    };
    
    this.assignments.set(assignmentId, updatedAssignment);
    return updatedAssignment;
  }

  // Report operations
  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async getReportsByUserId(userId: number): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter((report) => report.userId === userId)
      .sort((a, b) => {
        // Handle null values in sorting
        if (!a.submittedAt) return 1;
        if (!b.submittedAt) return -1;
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      });
  }
  
  async getReportsByStationId(stationId: number): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter((report) => report.stationId === stationId)
      .sort((a, b) => {
        // Handle null values in sorting
        if (!a.submittedAt) return 1;
        if (!b.submittedAt) return -1;
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      });
  }
  
  async getReportsByStatus(status: string): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter((report) => report.status === status)
      .sort((a, b) => {
        // Handle null values in sorting
        if (!a.submittedAt) return 1;
        if (!b.submittedAt) return -1;
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      });
  }

  async createReport(report: InsertReport): Promise<Report> {
    const id = this.reportIdCounter++;
    const now = new Date();
    
    // Generate content hash for security verification
    const contentHash = this.generateContentHash(report.content);
    
    const newReport: Report = { 
      ...report, 
      id, 
      status: "submitted",
      submittedAt: now,
      reviewedAt: null,
      contentHash,
      reviewedBy: null,
      encryptedData: false,
      locationLat: null,
      locationLng: null,
      mileageTraveled: null,
      checkinTime: null,
      checkoutTime: null
    };
    this.reports.set(id, newReport);
    return newReport;
  }

  async updateReport(id: number, data: Partial<Report>): Promise<Report | undefined> {
    const report = await this.getReport(id);
    if (!report) return undefined;
    
    const updatedReport = { ...report, ...data };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }
  
  // Generate a content hash for a report
  generateContentHash(reportContent: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(reportContent)).digest('hex');
  }
  
  // Report attachment operations
  async getReportAttachment(id: number): Promise<ReportAttachment | undefined> {
    return this.reportAttachments.get(id);
  }
  
  async getAttachmentsByReportId(reportId: number): Promise<ReportAttachment[]> {
    return Array.from(this.reportAttachments.values()).filter(
      (attachment) => attachment.reportId === reportId
    );
  }
  
  async createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment> {
    const id = this.reportAttachmentIdCounter++;
    const now = new Date();
    const newAttachment: ReportAttachment = {
      ...attachment,
      id,
      uploadedAt: now,
      ocrText: null,
      ocrProcessed: false,
      encryptionIv: null
    };
    this.reportAttachments.set(id, newAttachment);
    return newAttachment;
  }
  
  async updateReportAttachment(id: number, data: Partial<ReportAttachment>): Promise<ReportAttachment | undefined> {
    const attachment = await this.getReportAttachment(id);
    if (!attachment) return undefined;
    
    const updatedAttachment = { ...attachment, ...data };
    this.reportAttachments.set(id, updatedAttachment);
    return updatedAttachment;
  }
  
  async deleteReportAttachment(id: number): Promise<boolean> {
    const exists = this.reportAttachments.has(id);
    if (exists) {
      this.reportAttachments.delete(id);
      return true;
    }
    return false;
  }
  
  // Form template operations
  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    return this.formTemplates.get(id);
  }
  
  async getAllFormTemplates(): Promise<FormTemplate[]> {
    return Array.from(this.formTemplates.values());
  }
  
  async getFormTemplatesByCategory(category: string): Promise<FormTemplate[]> {
    return Array.from(this.formTemplates.values()).filter(
      (template) => template.category === category
    );
  }
  
  async getActiveFormTemplates(): Promise<FormTemplate[]> {
    return Array.from(this.formTemplates.values()).filter(
      (template) => template.isActive === true
    );
  }
  
  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const id = this.formTemplateIdCounter++;
    const now = new Date();
    const newTemplate: FormTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
      isActive: true
    };
    this.formTemplates.set(id, newTemplate);
    return newTemplate;
  }
  
  async updateFormTemplate(id: number, data: Partial<FormTemplate>): Promise<FormTemplate | undefined> {
    const template = await this.getFormTemplate(id);
    if (!template) return undefined;
    
    const now = new Date();
    const updatedTemplate = { ...template, ...data, updatedAt: now };
    this.formTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteFormTemplate(id: number): Promise<boolean> {
    const exists = this.formTemplates.has(id);
    if (exists) {
      this.formTemplates.delete(id);
      return true;
    }
    return false;
  }

  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return Array.from(this.events.values())
      .filter((event) => event.startTime > now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventIdCounter++;
    const newEvent: Event = { ...event, id };
    this.events.set(id, newEvent);
    return newEvent;
  }

  // Event participation operations
  async getEventParticipation(userId: number, eventId: number): Promise<EventParticipation | undefined> {
    return Array.from(this.eventParticipations.values()).find(
      (participation) => participation.userId === userId && participation.eventId === eventId,
    );
  }

  async getEventParticipationsByUserId(userId: number): Promise<EventParticipation[]> {
    return Array.from(this.eventParticipations.values()).filter(
      (participation) => participation.userId === userId,
    );
  }

  async createEventParticipation(participation: InsertEventParticipation): Promise<EventParticipation> {
    const id = this.participationIdCounter++;
    const newParticipation: EventParticipation = { 
      ...participation, 
      id, 
      completionStatus: null,
      certificateUrl: null
    };
    this.eventParticipations.set(id, newParticipation);
    return newParticipation;
  }

  async updateEventParticipation(id: number, data: Partial<EventParticipation>): Promise<EventParticipation | undefined> {
    const participation = this.eventParticipations.get(id);
    if (!participation) return undefined;
    
    const updatedParticipation = { ...participation, ...data };
    this.eventParticipations.set(id, updatedParticipation);
    return updatedParticipation;
  }

  // FAQ operations
  async getFaq(id: number): Promise<Faq | undefined> {
    return this.faqs.get(id);
  }

  async getAllFaqs(): Promise<Faq[]> {
    return Array.from(this.faqs.values())
      .filter((faq) => faq.isPublished)
      .sort((a, b) => a.id - b.id);
  }

  async createFaq(faq: InsertFaq): Promise<Faq> {
    const id = this.faqIdCounter++;
    const now = new Date();
    const newFaq: Faq = { 
      ...faq, 
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.faqs.set(id, newFaq);
    return newFaq;
  }

  // News operations
  async getNews(id: number): Promise<News | undefined> {
    return this.news.get(id);
  }

  async getAllNews(): Promise<News[]> {
    return Array.from(this.news.values())
      .filter((news) => news.isPublished)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getLatestNews(limit = 5): Promise<News[]> {
    return (await this.getAllNews()).slice(0, limit);
  }

  async createNews(newsItem: InsertNews): Promise<News> {
    const id = this.newsIdCounter++;
    const now = new Date();
    const newNewsItem: News = { 
      ...newsItem, 
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.news.set(id, newNewsItem);
    return newNewsItem;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
      )
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const newMessage: Message = { 
      ...message, 
      id, 
      isRead: false,
      sentAt: now
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = await this.getMessage(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, isRead: true };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }
}

// Import and use DatabaseStorage
import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();
