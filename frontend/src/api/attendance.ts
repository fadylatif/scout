import api from '../lib/api';
import type {
  AttendanceSession,
  AttendanceRecord,
  AttendanceExcuse,
  AttendanceStatus,
  QRCheckInResponse,
} from '../types/attendance';

export const attendanceApi = {
  // Sessions
  listSessions: (params?: { unit_id?: string }) =>
    api.get<AttendanceSession[]>('/attendance/sessions/', { params }),

  getSession: (id: string) =>
    api.get<AttendanceSession>(`/attendance/sessions/${id}/`),

  createSession: (data: {
    title: string;
    date: string;
    location?: string;
    description?: string;
    unit_id?: string;
  }) => api.post<AttendanceSession>('/attendance/sessions/', data),

  updateSession: (id: string, data: Partial<AttendanceSession>) =>
    api.patch<AttendanceSession>(`/attendance/sessions/${id}/`, data),

  deleteSession: (id: string) =>
    api.delete(`/attendance/sessions/${id}/`),

  populateMembers: (sessionId: string) =>
    api.post<{ message: string; populated_count: number; total_records: number }>(
      `/attendance/sessions/${sessionId}/populate/`
    ),

  // Records
  listRecords: (params: { session: string; status?: string; search?: string }) =>
    api.get<AttendanceRecord[]>('/attendance/records/', { params }),

  updateRecord: (id: string, data: { status?: AttendanceStatus; notes?: string }) =>
    api.patch<AttendanceRecord>(`/attendance/records/${id}/`, data),

  bulkUpdateRecords: (data: { record_ids: string[]; status: AttendanceStatus }) =>
    api.post<{ message: string; updated_count: number }>(
      '/attendance/records/bulk-update/',
      data
    ),

  // QR Check-in
  qrCheckIn: (sessionId: string, qrData: string) =>
    api.post<QRCheckInResponse>('/attendance/qr-checkin/', {
      session_id: sessionId,
      qr_data: qrData,
    }),

  // Excuses
  listExcuses: (params?: { status?: string; session?: string }) =>
    api.get<AttendanceExcuse[]>('/attendance/excuses/', { params }),

  submitExcuse: (data: FormData) =>
    api.post<AttendanceExcuse>('/attendance/excuses/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  approveExcuse: (id: string) =>
    api.post<{ message: string; excuse: AttendanceExcuse }>(
      `/attendance/excuses/${id}/approve/`
    ),

  rejectExcuse: (id: string, reason: string) =>
    api.post<{ message: string; excuse: AttendanceExcuse }>(
      `/attendance/excuses/${id}/reject/`,
      { reason }
    ),
};
