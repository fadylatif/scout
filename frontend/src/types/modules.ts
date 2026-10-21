// ─── Activities ─────────────────────────────────────────────────────────────

export type ActivityType = 'MEETING' | 'CAMP' | 'TRIP' | 'EVENT' | 'TRAINING';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface ActivityLocation {
  id: string;
  name: string;
  address?: string | null;
  coordinates?: string | null;
  is_default: boolean;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  activity_type: ActivityType;
  location?: string | null;
  location_name?: string | null;
  teams: string[];
  teams_data?: { id: string; name: string }[];
  is_recurring: boolean;
  frequency?: RecurrenceFrequency | null;
  recurrence_day?: number | null;
  start_date: string;
  end_date?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  instances_count?: number;
  next_instance?: { id: string; start_time: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityInstance {
  id: string;
  activity: string;
  activity_title?: string;
  activity_type?: string;
  start_time: string;
  end_time: string;
  is_cancelled: boolean;
  cancel_reason: string;
  notes: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: ActivityType;
  type_display: string;
  location: string;
  is_cancelled: boolean;
  cancel_reason?: string;
  activity_id: string;
}

// ─── Advancement ────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: string | null;
  category?: string | null;
  is_rank: boolean;
  requirements?: Requirement[];
}

export interface Requirement {
  id: string;
  badge: string;
  title: string;
  description: string;
  order: number;
  is_mandatory: boolean;
}

export interface AdvancementRecord {
  id: string;
  member: string;
  requirement: string;
  requirement_title?: string;
  badge_name?: string;
  is_completed: boolean;
  completion_date?: string | null;
  evaluated_by?: string | null;
  notes: string;
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  assignments?: TaskAssignment[];
  comments?: TaskComment[];
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  task: string;
  user: string;
  user_name?: string;
  is_primary: boolean;
}

export interface TaskComment {
  id: string;
  task: string;
  user: string;
  user_name?: string;
  text: string;
  created_at: string;
}

// ─── Media Center ────────────────────────────────────────────────────────────

export interface MediaAlbum {
  id: string;
  title: string;
  description: string;
  cover_image?: string | null;
  created_by?: string | null;
  activity_id?: string | null;
  files_count?: number;
  created_at: string;
}

export interface MediaFile {
  id: string;
  album: string;
  file: string;
  file_type: 'IMAGE' | 'VIDEO' | 'DOC';
  file_size?: number | null;
  original_name: string;
  is_complete: boolean;
  created_at: string;
}
