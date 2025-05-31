import axios from 'axios';
import { 
  MoodleCredentials, 
  MoodleCourse, 
  MoodleSection, 
  MoodleUser, 
  MoodleEnrollment,
  MoodleFunction,
  MoodleCompletionStatus,
  MoodleGradeReport
} from '../../shared/moodle-types';
import logger from '../utils/logger';

/**
 * Service for interacting with Moodle LMS API
 */
export class MoodleService {
  private baseUrl: string;
  private token: string;
  
  constructor(credentials: MoodleCredentials) {
    this.baseUrl = credentials.baseUrl;
    this.token = credentials.token;
    
    if (!this.baseUrl.endsWith('/')) {
      this.baseUrl += '/';
    }
  }
  
  /**
   * Make a request to the Moodle API
   */
  private async makeRequest<T>(functionName: MoodleFunction, params: Record<string, any> = {}): Promise<T> {
    try {
      const url = `${this.baseUrl}webservice/rest/server.php`;
      
      const requestParams = {
        wstoken: this.token,
        wsfunction: functionName,
        moodlewsrestformat: 'json',
        ...params
      };
      
      const response = await axios.get<T>(url, { params: requestParams });
      
      // Check for Moodle error response
      if (response.data && typeof response.data === 'object' && 'exception' in response.data) {
        const errorData = response.data as any;
        throw new Error(`Moodle API Error: ${errorData.message || 'Unknown error'}`);
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Moodle API request failed: ${error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * Get basic information about the Moodle site
   */
  async getSiteInfo() {
    return this.makeRequest(MoodleFunction.GET_SITE_INFO);
  }
  
  /**
   * Get list of all courses on the Moodle site
   */
  async getAllCourses(): Promise<MoodleCourse[]> {
    return this.makeRequest<MoodleCourse[]>(MoodleFunction.GET_COURSES);
  }
  
  /**
   * Get courses a specific user is enrolled in
   */
  async getUserCourses(userId: number): Promise<MoodleCourse[]> {
    return this.makeRequest<MoodleCourse[]>(MoodleFunction.GET_USERS_COURSES, { userid: userId });
  }
  
  /**
   * Get detailed course content including sections and modules
   */
  async getCourseContents(courseId: number): Promise<MoodleSection[]> {
    return this.makeRequest<MoodleSection[]>(MoodleFunction.GET_COURSE_CONTENTS, { courseid: courseId });
  }
  
  /**
   * Get user by username or email
   */
  async getUser(username: string): Promise<MoodleUser | null> {
    const criteria = [
      {
        key: 'username',
        value: username
      }
    ];
    
    const response = await this.makeRequest<{ users: MoodleUser[] }>(
      MoodleFunction.GET_USERS, 
      { criteria: criteria }
    );
    
    return response.users.length > 0 ? response.users[0] : null;
  }
  
  /**
   * Create a new user in Moodle
   */
  async createUser(user: {
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    email: string;
    idnumber?: string;
  }): Promise<MoodleUser> {
    return this.makeRequest<MoodleUser>(MoodleFunction.CREATE_USER, { 
      users: [user] 
    });
  }
  
  /**
   * Enroll a user in a course
   */
  async enrollUserInCourse(
    userId: number, 
    courseId: number, 
    roleId: number = 5 // Default to student role
  ): Promise<void> {
    const enrollment = {
      userid: userId,
      courseid: courseId,
      roleid: roleId
    };
    
    await this.makeRequest(MoodleFunction.ENROL_USER, { 
      enrolments: [enrollment] 
    });
  }
  
  /**
   * Get course completion status for a user
   */
  async getCourseCompletionStatus(
    userId: number, 
    courseId: number
  ): Promise<MoodleCompletionStatus> {
    return this.makeRequest<MoodleCompletionStatus>(
      MoodleFunction.GET_COURSE_COMPLETION_STATUS, 
      { userid: userId, courseid: courseId }
    );
  }
  
  /**
   * Get activity completion status for a user in a course
   */
  async getActivitiesCompletionStatus(userId: number, courseId: number): Promise<{
    statuses: Array<{
      cmid: number;
      modname: string;
      state: number;
      timecompleted: number;
      tracking: number;
    }>
  }> {
    return this.makeRequest(
      MoodleFunction.GET_ACTIVITIES_COMPLETION_STATUS, 
      { userid: userId, courseid: courseId }
    );
  }
  
  /**
   * Update activity completion status for a user manually
   */
  async updateActivityCompletionStatus(
    userId: number, 
    courseModuleId: number, 
    completed: boolean
  ): Promise<void> {
    await this.makeRequest(
      MoodleFunction.UPDATE_ACTIVITY_COMPLETION_STATUS, 
      { 
        cmid: courseModuleId, 
        userid: userId, 
        completed: completed 
      }
    );
  }
  
  /**
   * Get grade items for a user in a course
   */
  async getUserGrades(userId: number, courseId: number): Promise<MoodleGradeReport> {
    return this.makeRequest<MoodleGradeReport>(
      MoodleFunction.GET_GRADE_ITEMS, 
      { 
        courseid: courseId, 
        userid: userId 
      }
    );
  }
  
  /**
   * Helper method to calculate progress percentage for a course
   */
  async calculateCourseProgress(userId: number, courseId: number): Promise<number> {
    try {
      // Get completion status for all activities in the course
      const activitiesStatus = await this.getActivitiesCompletionStatus(userId, courseId);
      
      if (!activitiesStatus || !Array.isArray(activitiesStatus.statuses)) {
        return 0;
      }
      
      // Count completed activities
      const totalActivities = activitiesStatus.statuses.length;
      if (totalActivities === 0) return 100; // No activities to complete
      
      const completedActivities = activitiesStatus.statuses.filter(
        (status: { state: number }) => status.state === 1 // 1 = completed
      ).length;
      
      return Math.round((completedActivities / totalActivities) * 100);
    } catch (error) {
      logger.error('Error calculating Moodle course progress', { userId, courseId, error: error instanceof Error ? error : new Error(String(error)) });
      return 0;
    }
  }
  
  /**
   * Get course information with progress data for a specific user
   */
  async getCourseWithProgress(userId: number, courseId: number): Promise<MoodleCourse & { progress: number }> {
    // Get basic course info
    const courses = await this.getUserCourses(userId);
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
      throw new Error(`Course with ID ${courseId} not found or user not enrolled`);
    }
    
    // Calculate progress
    const progress = await this.calculateCourseProgress(userId, courseId);
    
    return {
      ...course,
      progress
    };
  }
}

// Factory function to create a Moodle service instance
export function createMoodleService(baseUrl: string, token: string): MoodleService {
  return new MoodleService({ baseUrl, token });
}