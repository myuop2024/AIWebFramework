import { TrainingSystemConfig } from '../../shared/moodle-types';
import { MoodleService, createMoodleService } from './moodle-service';
import { ZoomService, createZoomService } from './zoom-service';
import logger from '../utils/logger';

// Type for training content from various sources (Moodle, Zoom, etc.)
export interface TrainingContent {
  id: string;
  title: string;
  description: string;
  type: 'course' | 'meeting' | 'webinar' | 'recording' | 'document';
  source: 'moodle' | 'zoom' | 'internal';
  url?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  progress?: number;
  completed?: boolean;
  instructor?: string;
  thumbnail?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Type for integration configuration - stored in database
export interface TrainingIntegrationConfig {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  systems: TrainingSystemConfig[];
  syncSchedule?: string; // cron format
  lastSyncTime?: Date;
  settings?: Record<string, any>;
}

/**
 * Integrated service for managing training content from various sources
 */
export class TrainingIntegrationService {
  private moodleService?: MoodleService;
  private zoomService?: ZoomService;
  private config: TrainingIntegrationConfig;
  
  constructor(config: TrainingIntegrationConfig) {
    this.config = config;
    
    // Initialize services based on configuration
    this.initializeServices();
  }
  
  /**
   * Initialize the integration services
   */
  private initializeServices() {
    for (const system of this.config.systems) {
      if (system.type === 'moodle' && system.baseUrl && system.authToken) {
        this.moodleService = createMoodleService(system.baseUrl, system.authToken);
      } else if (system.type === 'zoom' && system.clientId && system.clientSecret) {
        this.zoomService = createZoomService(system.clientId, system.clientSecret, system.authToken);
      }
    }
  }
  
  /**
   * Get all available training content from all sources
   */
  async getAllTrainingContent(userId?: number | string): Promise<TrainingContent[]> {
    const allContent: TrainingContent[] = [];
    
    // Get Moodle courses if service is available
    if (this.moodleService && userId) {
      try {
        const courses = await this.moodleService.getUserCourses(Number(userId));
        const courseContent = await Promise.all(
          courses.map(async (course) => {
            // Calculate progress for each course
            let progress = 0;
            try {
              progress = await this.moodleService!.calculateCourseProgress(Number(userId), course.id);
            } catch (error) {
              logger.error(`Error calculating Moodle progress for course in TrainingIntegrationService`, { userId, courseId: course.id, error: error instanceof Error ? error : new Error(String(error)) });
            }
            
            return {
              id: `moodle_course_${course.id}`,
              title: course.fullname || course.shortname,
              description: course.summary || '',
              type: 'course',
              source: 'moodle',
              url: `${this.config.systems.find(s => s.type === 'moodle')?.baseUrl}/course/view.php?id=${course.id}`,
              progress,
              completed: progress === 100,
              tags: [],
              metadata: {
                courseId: course.id,
                shortName: course.shortname,
                startDate: course.startdate ? new Date(course.startdate * 1000).toISOString() : undefined,
                endDate: course.enddate ? new Date(course.enddate * 1000).toISOString() : undefined,
              }
            } as TrainingContent;
          })
        );
        
        allContent.push(...courseContent);
      } catch (error) {
        logger.error('Error fetching Moodle courses in TrainingIntegrationService', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      }
    }
    
    // Get Zoom trainings if service is available
    if (this.zoomService) {
      try {
        const zoomUserId = userId?.toString() || 'me';
        const trainingSessions = await this.zoomService.getTrainingSessions(zoomUserId);
        
        const zoomContent = trainingSessions.map(session => {
          return {
            id: `zoom_${session.type}_${session.id}`,
            title: session.topic,
            description: session.description,
            type: session.type === 'meeting' ? 'meeting' : 'webinar',
            source: 'zoom',
            url: session.joinUrl,
            startDate: session.startTime,
            endDate: session.endTime,
            duration: session.duration,
            progress: session.attendance?.present ? 100 : 0,
            completed: session.attendance?.present || false,
            instructor: `${session.trainer.name || 'Instructor'}`,
            metadata: {
              sessionId: session.id,
              trainerId: session.trainer.id,
              timezone: session.timezone,
              status: session.status,
              recording: session.recording
            }
          } as TrainingContent;
        });
        
        allContent.push(...zoomContent);
      } catch (error) {
        logger.error('Error fetching Zoom training sessions in TrainingIntegrationService', { userId, error: error instanceof Error ? error : new Error(String(error)) });
      }
    }
    
    // Sort content by start date if available, otherwise by title
    return allContent.sort((a, b) => {
      if (a.startDate && b.startDate) {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
      return a.title.localeCompare(b.title);
    });
  }
  
  /**
   * Get specific training content by ID
   */
  async getTrainingContent(contentId: string): Promise<TrainingContent | null> {
    const allContent = await this.getAllTrainingContent();
    return allContent.find(content => content.id === contentId) || null;
  }
  
  /**
   * Get training content from a specific source
   */
  async getTrainingContentBySource(source: 'moodle' | 'zoom' | 'internal', userId?: number | string): Promise<TrainingContent[]> {
    const allContent = await this.getAllTrainingContent(userId);
    return allContent.filter(content => content.source === source);
  }
  
  /**
   * Get upcoming training sessions (Zoom meetings/webinars)
   */
  async getUpcomingTrainingSessions(userId?: number | string): Promise<TrainingContent[]> {
    const now = new Date();
    const allContent = await this.getAllTrainingContent(userId);
    
    return allContent
      .filter(content => 
        (content.type === 'meeting' || content.type === 'webinar') &&
        content.startDate && 
        new Date(content.startDate) > now
      )
      .sort((a, b) => {
        if (a.startDate && b.startDate) {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        return 0;
      });
  }
  
  /**
   * Get current user's training progress across all sources
   */
  async getUserProgress(userId: number | string): Promise<{
    totalContent: number;
    completedContent: number;
    progressPercentage: number;
    bySource: Record<string, { total: number; completed: number; percentage: number }>;
  }> {
    const allContent = await this.getAllTrainingContent(userId);
    
    // Count total and completed items
    const totalContent = allContent.length;
    const completedContent = allContent.filter(item => item.completed).length;
    
    // Calculate progress by source
    const sources = ['moodle', 'zoom', 'internal'] as const;
    const bySource: Record<string, { total: number; completed: number; percentage: number }> = {};
    
    for (const source of sources) {
      const sourceContent = allContent.filter(item => item.source === source);
      const sourceTotal = sourceContent.length;
      const sourceCompleted = sourceContent.filter(item => item.completed).length;
      
      bySource[source] = {
        total: sourceTotal,
        completed: sourceCompleted,
        percentage: sourceTotal > 0 ? Math.round((sourceCompleted / sourceTotal) * 100) : 0
      };
    }
    
    return {
      totalContent,
      completedContent,
      progressPercentage: totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0,
      bySource
    };
  }
  
  /**
   * Register a user in a course (Moodle) or for a meeting/webinar (Zoom)
   */
  async registerUserForTraining(
    userId: number | string, 
    contentId: string
  ): Promise<boolean> {
    if (!contentId) {
      throw new Error('Training content ID is required');
    }
    
    // Parse the content ID to determine the source and type
    const [source, type, id] = contentId.split('_');
    
    if (source === 'moodle' && type === 'course' && this.moodleService) {
      try {
        // Enroll the user in the Moodle course
        await this.moodleService.enrollUserInCourse(Number(userId), Number(id));
        return true;
      } catch (error) {
        logger.error(`Error enrolling user in Moodle course via TrainingIntegrationService`, { userId, courseId: id, error: error instanceof Error ? error : new Error(String(error)) });
        throw error;
      }
    } else if (source === 'zoom' && this.zoomService) {
      // Zoom registration would be handled here if supported
      // Currently, the Zoom API doesn't provide a direct way to register for meetings through the API
      throw new Error('Zoom meeting/webinar registration is not supported through the API');
    }
    
    throw new Error(`Unsupported training content: ${contentId}`);
  }
  
  /**
   * Sync user completion status between systems
   */
  async syncUserCompletionStatus(userId: number | string): Promise<void> {
    // Implementation depends on specific requirements for syncing between systems
    // For example, completion status from Moodle could be synchronized to internal system
    logger.info(`Syncing completion status for user ${userId} in TrainingIntegrationService`);
  }
  
  /**
   * Get the service configuration
   */
  getConfig(): TrainingIntegrationConfig {
    return this.config;
  }
  
  /**
   * Update the service configuration
   */
  updateConfig(config: Partial<TrainingIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Re-initialize services with new config
    this.initializeServices();
  }
}

// Factory function to create a training integration service instance
export function createTrainingIntegrationService(config: TrainingIntegrationConfig): TrainingIntegrationService {
  return new TrainingIntegrationService(config);
}