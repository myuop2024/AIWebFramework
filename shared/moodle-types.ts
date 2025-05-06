// Types for Moodle API responses and requests

export interface MoodleCredentials {
  token: string;
  baseUrl: string;
}

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname: string;
  summary: string;
  summaryformat: number;
  startdate: number;
  enddate: number;
  visible: boolean;
  showgrades: boolean;
  newsitems: number;
  enrollmentmethods: string[];
  progress?: number;
  completed?: boolean;
}

export interface MoodleSection {
  id: number;
  name: string;
  visible: boolean;
  summary: string;
  summaryformat: number;
  section: number;
  sequence: number[];
  modules: MoodleModule[];
}

export interface MoodleModule {
  id: number;
  url: string;
  name: string;
  description: string;
  visible: boolean;
  modname: string;
  modicon: string;
  modplural: string;
  contents?: MoodleContent[];
  completion?: number; // 0: incomplete, 1: complete, 2: complete - pass, 3: complete - fail
  completiondata?: {
    state: number;
    timecompleted: number;
    overrideby: number | null;
  };
}

export interface MoodleContent {
  type: string;
  filename: string;
  filepath: string;
  filesize: number;
  fileurl: string;
  timecreated: number;
  timemodified: number;
  sortorder: number;
  mimetype: string;
  isexternalfile: boolean;
  userid: number;
  author: string;
  license: string;
}

export interface MoodleUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
  idnumber: string;
  roles?: {
    roleid: number;
    name: string;
    shortname: string;
    sortorder: number;
  }[];
}

export interface MoodleEnrollment {
  id: number;
  courseid: number;
  userid: number;
  status: string;
  timestart: number;
  timeend: number;
}

export interface MoodleGrade {
  id: number;
  itemname: string;
  itemtype: string;
  itemmodule: string;
  iteminstance: number;
  graderaw: number;
  grademax: number;
  grademin: number;
  gradepercent: number;
  feedback: string;
}

export interface MoodleGradeReport {
  courseid: number;
  userid: number;
  userfullname: string;
  maxdepth: number;
  outcomes: number;
  gradeitems: {
    id: number;
    itemname: string;
    itemtype: string;
    itemmodule: string;
    itemnumber: number;
    grades: {
      userid: number;
      grade: string;
      locked: boolean;
      gradeformatted: string;
      gradedategraded: number;
      gradehiddenbydate: boolean;
      gradeneedsupdate: boolean;
      gradeishidden: boolean;
      feedback: string;
    }[];
  }[];
}

export interface MoodleCompletionStatus {
  completed: boolean;
  aggregation: number; // 1: all, 2: any
  completions: {
    type: number;
    title: string;
    status: "complete" | "incomplete";
    timecompleted: number;
    details: {
      type: string;
      criteria: string;
      requirement: string;
      status: string;
    };
  }[];
}

// Moodle API function names - these are used in API requests
export enum MoodleFunction {
  // Core functions
  GET_SITE_INFO = "core_webservice_get_site_info",
  
  // Course functions
  GET_COURSES = "core_course_get_courses",
  GET_COURSE_CONTENTS = "core_course_get_contents",
  GET_USERS_COURSES = "core_enrol_get_users_courses",
  
  // User functions
  GET_USERS = "core_user_get_users",
  CREATE_USER = "core_user_create_user",
  
  // Enrollment functions
  ENROL_USER = "enrol_manual_enrol_users",
  
  // Completion functions
  GET_COURSE_COMPLETION_STATUS = "core_completion_get_course_completion_status",
  GET_ACTIVITIES_COMPLETION_STATUS = "core_completion_get_activities_completion_status",
  UPDATE_ACTIVITY_COMPLETION_STATUS = "core_completion_update_activity_completion_status_manually",
  
  // Grade functions
  GET_GRADE_ITEMS = "gradereport_user_get_grade_items",
}

// Represents integration with a specific training system
export interface TrainingSystemConfig {
  type: "moodle" | "zoom";
  baseUrl: string;
  requiresAuth: boolean;
  authToken?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  verifySSL: boolean;
}