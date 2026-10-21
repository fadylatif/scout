import api from '../lib/api';
import type { Task, TaskComment } from '../types/modules';

export const tasksApi = {
  list: (params?: { status?: string; priority?: string }) =>
    api.get<Task[]>('/tasks/tasks/', { params }),

  get: (id: string) =>
    api.get<Task>(`/tasks/tasks/${id}/`),

  create: (data: Partial<Task>) =>
    api.post<Task>('/tasks/tasks/', data),

  update: (id: string, data: Partial<Task>) =>
    api.patch<Task>(`/tasks/tasks/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/tasks/tasks/${id}/`),

  assign: (id: string, userId: string, isPrimary?: boolean) =>
    api.post<{ message: string }>(`/tasks/tasks/${id}/assign/`, {
      user_id: userId,
      is_primary: isPrimary ?? false,
    }),

  addComment: (id: string, text: string) =>
    api.post<TaskComment>(`/tasks/tasks/${id}/comment/`, { text }),
};
