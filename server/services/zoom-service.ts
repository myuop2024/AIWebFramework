import axios from 'axios';
import { 
  ZoomCredentials, 
  ZoomAuthToken, 
  ZoomUser, 
  ZoomMeeting,
  ZoomWebinar,
  ZoomRecording,
  ZoomParticipant,
  ZoomPoll,
  ZoomCreateMeetingRequest,
  ZoomPaginatedResponse,
  ZoomTrainingSession
} from '../../shared/zoom-types';

/**
 * Service for interacting with Zoom API
 */
export class ZoomService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshToken: string | null = null;
  private baseUrl = 'https://api.zoom.us/v2';
  
  constructor(credentials: ZoomCredentials) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    
    // If token is provided, use it
    if (credentials.token) {
      this.accessToken = credentials.token;
      // Set expiry to 1 hour from now (default Zoom token lifetime)
      this.tokenExpiry = new Date(Date.now() + 3600 * 1000);
    }
  }
  
  /**
   * Get OAuth access token using client credentials flow
   */
  private async getAccessToken(): Promise<ZoomAuthToken> {
    try {
      const tokenUrl = 'https://zoom.us/oauth/token';
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post<ZoomAuthToken>(
        tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Zoom OAuth Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<string> {
    // If no token or token is expired, get a new one
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      const tokenData = await this.getAccessToken();
      return tokenData.access_token;
    }
    
    return this.accessToken;
  }
  
  /**
   * Make a request to the Zoom API
   */
  private async makeRequest<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string, 
    data?: any, 
    params?: Record<string, any>
  ): Promise<T> {
    try {
      const token = await this.ensureValidToken();
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await axios({
        method,
        url,
        data,
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Zoom API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<ZoomUser> {
    return this.makeRequest<ZoomUser>('get', '/users/me');
  }
  
  /**
   * Get all meetings for a user
   */
  async getUserMeetings(userId: string = 'me', type: string = 'scheduled'): Promise<ZoomMeeting[]> {
    const response = await this.makeRequest<ZoomPaginatedResponse<ZoomMeeting>>(
      'get', 
      `/users/${userId}/meetings`,
      undefined,
      { type }
    );
    
    return response.meetings || [];
  }
  
  /**
   * Get details for a specific meeting
   */
  async getMeeting(meetingId: number): Promise<ZoomMeeting> {
    return this.makeRequest<ZoomMeeting>('get', `/meetings/${meetingId}`);
  }
  
  /**
   * Create a new meeting
   */
  async createMeeting(userId: string = 'me', meeting: ZoomCreateMeetingRequest): Promise<ZoomMeeting> {
    return this.makeRequest<ZoomMeeting>('post', `/users/${userId}/meetings`, meeting);
  }
  
  /**
   * Update an existing meeting
   */
  async updateMeeting(meetingId: number, meeting: Partial<ZoomCreateMeetingRequest>): Promise<void> {
    await this.makeRequest('patch', `/meetings/${meetingId}`, meeting);
  }
  
  /**
   * Delete a meeting
   */
  async deleteMeeting(meetingId: number, scheduleForReminder: boolean = false): Promise<void> {
    await this.makeRequest(
      'delete', 
      `/meetings/${meetingId}`, 
      undefined,
      { schedule_for_reminder: scheduleForReminder }
    );
  }
  
  /**
   * Get meeting participants
   */
  async getMeetingParticipants(meetingId: number): Promise<ZoomParticipant[]> {
    const response = await this.makeRequest<ZoomPaginatedResponse<ZoomParticipant>>(
      'get',
      `/report/meetings/${meetingId}/participants`
    );
    
    return response.participants || [];
  }
  
  /**
   * Get meeting polls
   */
  async getMeetingPolls(meetingId: number): Promise<ZoomPoll[]> {
    const response = await this.makeRequest<{ polls: ZoomPoll[] }>(
      'get',
      `/meetings/${meetingId}/polls`
    );
    
    return response.polls;
  }
  
  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(meetingId: number): Promise<ZoomRecording[]> {
    const response = await this.makeRequest<{ recording_files: ZoomRecording[] }>(
      'get',
      `/meetings/${meetingId}/recordings`
    );
    
    return response.recording_files;
  }
  
  /**
   * Get all webinars for a user
   */
  async getUserWebinars(userId: string = 'me'): Promise<ZoomWebinar[]> {
    const response = await this.makeRequest<ZoomPaginatedResponse<ZoomWebinar>>(
      'get',
      `/users/${userId}/webinars`
    );
    
    return response.webinars || [];
  }
  
  /**
   * Get webinar participants (attendees who joined)
   */
  async getWebinarParticipants(webinarId: number): Promise<ZoomParticipant[]> {
    const response = await this.makeRequest<ZoomPaginatedResponse<ZoomParticipant>>(
      'get',
      `/report/webinars/${webinarId}/participants`
    );
    
    return response.participants || [];
  }
  
  /**
   * Utility: Convert a Zoom meeting to a training session format
   */
  convertMeetingToTrainingSession(meeting: ZoomMeeting, attendance?: Partial<ZoomTrainingSession['attendance']>): ZoomTrainingSession {
    return {
      id: meeting.id,
      topic: meeting.topic,
      description: meeting.agenda || '',
      startTime: meeting.start_time,
      endTime: new Date(new Date(meeting.start_time).getTime() + meeting.duration * 60 * 1000).toISOString(),
      duration: meeting.duration,
      timezone: meeting.timezone,
      joinUrl: meeting.join_url,
      hostUrl: meeting.start_url,
      status: meeting.status,
      type: 'meeting',
      trainer: {
        id: meeting.host_id,
        name: '', // Requires additional API call to get host details
        email: ''
      },
      attendance: attendance || {
        present: false
      }
    };
  }
  
  /**
   * Utility: Convert a Zoom webinar to a training session format
   */
  convertWebinarToTrainingSession(webinar: ZoomWebinar, attendance?: Partial<ZoomTrainingSession['attendance']>): ZoomTrainingSession {
    return {
      id: webinar.id,
      topic: webinar.topic,
      description: webinar.agenda || '',
      startTime: webinar.start_time,
      endTime: new Date(new Date(webinar.start_time).getTime() + webinar.duration * 60 * 1000).toISOString(),
      duration: webinar.duration,
      timezone: webinar.timezone,
      joinUrl: webinar.join_url,
      hostUrl: webinar.start_url,
      status: '', // Webinars don't have status field like meetings
      type: 'webinar',
      trainer: {
        id: webinar.host_id,
        name: '', // Requires additional API call to get host details
        email: ''
      },
      attendance: attendance || {
        present: false
      }
    };
  }
  
  /**
   * Get training sessions (meetings + webinars) for a user with attendance info
   */
  async getTrainingSessions(userId: string = 'me'): Promise<ZoomTrainingSession[]> {
    try {
      // Get all meetings
      const meetings = await this.getUserMeetings(userId);
      
      // Get all webinars
      const webinars = await this.getUserWebinars(userId);
      
      // Convert to training sessions
      const meetingSessions = await Promise.all(
        meetings.map(async (meeting) => {
          try {
            // Try to get participant info for completed meetings
            let attendance: Partial<ZoomTrainingSession['attendance']> = { present: false };
            
            if (meeting.status === 'ended') {
              const participants = await this.getMeetingParticipants(meeting.id);
              const userParticipant = participants.find(p => p.user_id === userId || p.id === userId);
              
              if (userParticipant) {
                attendance = {
                  present: true,
                  joinTime: userParticipant.join_time,
                  leaveTime: userParticipant.leave_time,
                  durationMinutes: userParticipant.duration / 60, // Convert seconds to minutes
                  attentiveness: parseFloat(userParticipant.attentiveness_score)
                };
              }
            }
            
            // Check for recordings
            let recording = undefined;
            try {
              const recordings = await this.getMeetingRecordings(meeting.id);
              if (recordings && recordings.length > 0) {
                recording = {
                  available: true,
                  url: recordings[0].play_url,
                  processingStatus: recordings[0].status
                };
              }
            } catch (e) {
              recording = { available: false };
            }
            
            return this.convertMeetingToTrainingSession(meeting, attendance);
          } catch (error) {
            console.error(`Error processing meeting ${meeting.id}:`, error);
            return this.convertMeetingToTrainingSession(meeting);
          }
        })
      );
      
      // Convert webinars to training sessions
      const webinarSessions = webinars.map(webinar => {
        return this.convertWebinarToTrainingSession(webinar);
      });
      
      // Combine both types of sessions
      return [...meetingSessions, ...webinarSessions].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    } catch (error) {
      console.error('Error fetching training sessions:', error);
      throw error;
    }
  }
}

// Factory function to create a Zoom service instance
export function createZoomService(clientId: string, clientSecret: string, token?: string): ZoomService {
  return new ZoomService({ clientId, clientSecret, token });
}