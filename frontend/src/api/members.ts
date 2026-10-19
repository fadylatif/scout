import api from '../lib/api';
import type { Member, PaginatedResponse } from '../types';

export interface MembersFilter {
  page?: number;
  search?: string;
  group?: string;
  stage?: string;
  team?: string;
  patrol?: string;
  gender?: string;
  is_active?: boolean;
}

export const membersApi = {
  list: (params?: MembersFilter) =>
    api.get<PaginatedResponse<Member>>('/members/', { params }),

  get: (id: string) =>
    api.get<Member>(`/members/${id}/`),

  create: (data: FormData) =>
    api.post<Member>('/members/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: FormData) =>
    api.patch<Member>(`/members/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    api.delete(`/members/${id}/`),

  transfer: (id: string, data: { to_team: string; to_stage?: string; reason?: string }) =>
    api.post<Member>(`/members/${id}/transfer/`, data),

  exportExcel: () =>
    api.get('/members/export/excel/', { responseType: 'blob' }),

  importTemplate: () =>
    api.get('/members/import/template/', { responseType: 'blob' }),

  importPreview: (file: File, mapping?: Record<string, string>) => {
    const fd = new FormData();
    fd.append('file', file);
    if (mapping) fd.append('mapping', JSON.stringify(mapping));
    return api.post('/members/import/preview/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importConfirm: (rows: any[], skipErrors: boolean = true) =>
    api.post('/members/import/confirm/', { rows, skip_errors: skipErrors }),

  importErrorsDownload: (rows: any[]) =>
    api.post('/members/import/errors/', { rows }, { responseType: 'blob' }),

};
