import api from '../lib/api';
import type { User, PaginatedResponse, PermissionTemplate, UserSession } from '../types';

export interface UsersFilter {
  page?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
}

export const usersApi = {
  // Users CRUD
  list: (params?: UsersFilter) =>
    api.get<PaginatedResponse<User>>('/users/', { params }),

  get: (id: string) =>
    api.get<User>(`/users/${id}/`),

  create: (data: any) =>
    api.post<User>('/users/', data),

  update: (id: string, data: any) =>
    api.patch<User>(`/users/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}/`),

  resetPassword: (id: string, newPassword?: string) =>
    api.post(`/users/${id}/reset-password/`, { password: newPassword }),

  toggleActive: (id: string, is_active: boolean) =>
    api.patch(`/users/${id}/`, { is_active }),

  // Permission Templates
  listTemplates: () =>
    api.get<PermissionTemplate[]>('/permission-templates/'),

  getTemplate: (id: string) =>
    api.get<PermissionTemplate>(`/permission-templates/${id}/`),

  createTemplate: (data: Partial<PermissionTemplate>) =>
    api.post<PermissionTemplate>('/permission-templates/', data),

  updateTemplate: (id: string, data: Partial<PermissionTemplate>) =>
    api.patch<PermissionTemplate>(`/permission-templates/${id}/`, data),

  deleteTemplate: (id: string) =>
    api.delete(`/permission-templates/${id}/`),

  // Sessions
  listAllSessions: () =>
    api.get<UserSession[]>('/admin/sessions/'),

  terminateSession: (sessionId: string) =>
    api.delete(`/auth/sessions/${sessionId}/delete/`),
};
