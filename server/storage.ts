import {
  users, userProfiles, documents, pollingStations, assignments, reports,
  events, eventParticipation, faqEntries, newsEntries, messages,
  type User, type InsertUser, type UserProfile, type InsertUserProfile,
  type Document, type InsertDocument, type PollingStation, type InsertPollingStation,
  type Assignment, type InsertAssignment, type Report, type InsertReport,
  type Event, type InsertEvent, type EventParticipation, type InsertEventParticipation,
  type Faq, type InsertFaq, type News, type InsertNews, type Message, type InsertMessage
} from "@shared/schema";

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
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  
  // Report operations
  getReport(id: number): Promise<Report | undefined>;
  getReportsByUserId(userId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, data: Partial<Report>): Promise<Report | undefined>;
  
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

// Generate a unique 6-digit observer ID
function generateObserverId(): string {
  const min = 100000; // Minimum 6-digit number
  const max = 999999; // Maximum 6-digit number
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private userProfiles: Map<number, UserProfile>;
  private documents: Map<number, Document>;
  private pollingStations: Map<number, PollingStation>;
  private assignments: Map<number, Assignment>;
  private reports: Map<number, Report>;
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
  private reportIdCounter: number;
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
    this.reports = new Map();
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
    this.reportIdCounter = 1;
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

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const id = this.assignmentIdCounter++;
    const now = new Date();
    const newAssignment: Assignment = { ...assignment, id, assignedAt: now };
    this.assignments.set(id, newAssignment);
    return newAssignment;
  }

  // Report operations
  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async getReportsByUserId(userId: number): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter((report) => report.userId === userId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async createReport(report: InsertReport): Promise<Report> {
    const id = this.reportIdCounter++;
    const now = new Date();
    const newReport: Report = { 
      ...report, 
      id, 
      status: "submitted",
      submittedAt: now,
      reviewedAt: null
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

export const storage = new MemStorage();
