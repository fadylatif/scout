import api from '../lib/api';
import type { User } from '../types';

export const authApi = {
  login: (username: string, password: string) =>
    api.post<User>('/auth/login/', { username, password }),

  logout: () =>
    api.post('/auth/logout/'),

  me: () =>
    api.get<User>('/auth/me/'),

  sessions: () =>
    api.get('/auth/sessions/'),

  deleteSession: (sessionId: string) =>
    api.delete(`/auth/sessions/${sessionId}/delete/`),
};
