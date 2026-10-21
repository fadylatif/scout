import api from '../lib/api';
import type { Activity, ActivityInstance, ActivityLocation, CalendarEvent } from '../types/modules';

export const activitiesApi = {
  // Locations
  listLocations: () =>
    api.get<ActivityLocation[]>('/activities/locations/'),

  createLocation: (data: Partial<ActivityLocation>) =>
    api.post<ActivityLocation>('/activities/locations/', data),

  // Activities
  list: (params?: { activity_type?: string; search?: string }) =>
    api.get<Activity[]>('/activities/activities/', { params }),

  get: (id: string) =>
    api.get<Activity>(`/activities/activities/${id}/`),

  create: (data: Partial<Activity>) =>
    api.post<Activity>('/activities/activities/', data),

  update: (id: string, data: Partial<Activity>) =>
    api.patch<Activity>(`/activities/activities/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/activities/activities/${id}/`),

  generateInstances: (id: string) =>
    api.post<{ message: string; created: number }>(
      `/activities/activities/${id}/generate_instances/`
    ),

  // Calendar view
  calendar: (params: { start: string; end: string }) =>
    api.get<CalendarEvent[]>('/activities/activities/calendar/', { params }),

  // Instances
  listInstances: (params?: { activity?: string; is_cancelled?: boolean }) =>
    api.get<ActivityInstance[]>('/activities/instances/', { params }),

  cancelInstance: (id: string, reason?: string) =>
    api.post<{ message: string }>(`/activities/instances/${id}/cancel/`, { reason }),
};
