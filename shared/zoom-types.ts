// Types for Zoom API responses and requests

export interface ZoomCredentials {
  clientId: string;
  clientSecret: string;
  accountId?: string;
  token?: string;
  redirectUri?: string;
}

export interface ZoomAuthToken {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface ZoomUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: number; // 1: basic, 2: licensed, 3: on-prem
  status: string;
  created_at: string;
  language: string;
  last_login_time: string;
  role_name: string;
}

export interface ZoomMeeting {
  uuid: string;
  id: number;
  host_id: string;
  topic: string;
  type: number; // 1: instant, 2: scheduled, 3: recurring with no fixed time, 8: recurring with fixed time
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  agenda: string;
  created_at: string;
  start_url: string;
  join_url: string;
  password: string;
  pre_schedule: boolean;
  settings: ZoomMeetingSettings;
}

export interface ZoomMeetingSettings {
  host_video: boolean;
  participant_video: boolean;
  cn_meeting: boolean;
  in_meeting: boolean;
  join_before_host: boolean;
  mute_upon_entry: boolean;
  watermark: boolean;
  use_pmi: boolean;
  approval_type: number;
  registration_type: number;
  audio: string;
  auto_recording: string;
  enforce_login: boolean;
  enforce_login_domains: string;
  alternative_hosts: string;
  close_registration: boolean;
  show_share_button: boolean;
  allow_multiple_devices: boolean;
  registrants_confirmation_email: boolean;
  waiting_room: boolean;
  request_permission_to_unmute_participants: boolean;
  registrants_email_notification: boolean;
  meeting_authentication: boolean;
  encryption_type: string;
  approved_or_denied_countries_or_regions: {
    enable: boolean;
    approved_list: string[];
    denied_list: string[];
  };
  breakout_room: {
    enable: boolean;
  };
  alternative_hosts_email_notification: boolean;
  device_testing: boolean;
  focus_mode: boolean;
  private_meeting: boolean;
  email_notification: boolean;
  host_save_video_order: boolean;
}

export interface ZoomWebinar {
  uuid: string;
  id: number;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  agenda: string;
  created_at: string;
  start_url: string;
  join_url: string;
  registration_url?: string;
  settings: ZoomWebinarSettings;
}

export interface ZoomWebinarSettings {
  host_video: boolean;
  panelists_video: boolean;
  practice_session: boolean;
  hd_video: boolean;
  approval_type: number;
  audio: string;
  auto_recording: string;
  enforce_login: boolean;
  close_registration: boolean;
  show_share_button: boolean;
  allow_multiple_devices: boolean;
  on_demand: boolean;
  global_dial_in_countries: string[];
  contact_name: string;
  contact_email: string;
  registrants_restrict_number: number;
  post_webinar_survey: boolean;
  survey_url: string;
  registrants_email_notification: boolean;
  meeting_authentication: boolean;
  encryption_type: string;
  webinar_chat_setting: string;
  question_answer: {
    enable: boolean;
    allow_anonymous_questions: boolean;
    answer_questions: string;
    attendees_can_comment: boolean;
    attendees_can_upvote: boolean;
  };
}

export interface ZoomRecording {
  id: string;
  uuid: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  recording_type: string;
}

export interface ZoomParticipant {
  id: string;
  user_id: string;
  name: string;
  user_email: string;
  join_time: string;
  leave_time: string;
  duration: number;
  attentiveness_score: string;
}

export interface ZoomMeetingMetric {
  uuid: string;
  id: number;
  topic: string;
  host: string;
  email: string;
  user_type: string;
  start_time: string;
  end_time: string;
  duration: string;
  participants: number;
  has_pstn: boolean;
  has_voip: boolean;
  has_3rd_party_audio: boolean;
  has_video: boolean;
  has_screen_share: boolean;
  has_recording: boolean;
  has_sip: boolean;
  in_room_participants: number;
}

export interface ZoomPoll {
  id: string;
  status: string;
  anonymous: boolean;
  poll_type: number;
  questions: {
    name: string;
    type: string;
    answers: string[];
  }[];
}

export interface ZoomCreateMeetingRequest {
  topic: string;
  type: number;
  start_time?: string;
  duration?: number;
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: Partial<ZoomMeetingSettings>;
}

export interface ZoomCreateWebinarRequest {
  topic: string;
  type: number;
  start_time?: string;
  duration?: number;
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: Partial<ZoomWebinarSettings>;
}

export interface ZoomPaginatedResponse<T> {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  next_page_token: string;
  meetings?: T[];
  webinars?: T[];
  participants?: T[];
  registrants?: T[];
}

// For integration with training system
export interface ZoomTrainingSession {
  id: number;
  topic: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  timezone: string;
  joinUrl: string;
  hostUrl: string;
  status: string; // scheduled, started, finished, cancelled
  type: 'meeting' | 'webinar';
  trainer: {
    id: string;
    name: string;
    email: string;
  };
  recording?: {
    available: boolean;
    url?: string;
    processingStatus?: string;
  };
  attendance: {
    present: boolean;
    joinTime?: string;
    leaveTime?: string;
    durationMinutes?: number;
    attentiveness?: number;
  };
}