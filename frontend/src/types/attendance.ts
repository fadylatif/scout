export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
export type ExcuseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceSession {
  id: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
  unit_id?: string;
  unit_name?: string;
  created_by?: string;
  created_by_name?: string;
  total_records: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
  late_count: number;
  attendance_rate: number;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session: string;
  member: string;
  member_name: string;
  stage_code?: string;
  member_photo?: string | null;
  team_name?: string;
  patrol_name?: string;
  status: AttendanceStatus;
  status_display: string;
  check_in_time?: string | null;
  notes?: string;
  has_excuse: boolean;
  excuse_id?: string | null;
  excuse_status?: ExcuseStatus | null;
  excuse_reason?: string | null;
}

export interface AttendanceExcuse {
  id: string;
  record: string;
  member_name: string;
  stage_code?: string;
  session_title: string;
  session_date: string;
  reason: string;
  document?: string | null;
  status: ExcuseStatus;
  status_display: string;
  is_approved: boolean;
  rejection_reason?: string;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approval_date?: string | null;
  created_at: string;
}

export interface QRCheckInResponse {
  status: 'CHECKED_IN' | 'ALREADY_CHECKED_IN';
  message: string;
  check_in_time?: string;
  record_id: string;
  member: {
    id: string;
    full_name: string;
    stage_code?: string;
    team_name?: string;
    photo_url?: string | null;
  };
}
