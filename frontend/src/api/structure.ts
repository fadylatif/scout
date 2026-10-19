import api from '../lib/api';
import type { Group, GroupTree, Patrol, Sector, Stage, ScoutYear, Team } from '../types';

export const structureApi = {
  // Scout Years
  scoutYears: () => api.get<ScoutYear[]>('/scout-years/'),

  // Groups
  groups: () => api.get<Group[]>('/groups/'),
  groupTree: () => api.get<GroupTree[]>('/groups/tree/'),

  // Sectors
  sectors: (groupId?: string) => api.get<Sector[]>('/sectors/', { params: { group: groupId } }),

  // Stages
  stages: (groupId?: string) => api.get<Stage[]>('/stages/', { params: { group: groupId } }),

  // Teams
  teams: (params?: { stage?: string; sector?: string }) =>
    api.get<Team[]>('/teams/', { params }),
  getTeam: (id: string) => api.get<Team>(`/teams/${id}/`),
  createTeam: (data: Partial<Team>) => api.post<Team>('/teams/', data),
  updateTeam: (id: string, data: Partial<Team>) => api.patch<Team>(`/teams/${id}/`, data),
  deleteTeam: (id: string) => api.delete(`/teams/${id}/`),

  // Patrols
  patrols: (teamId?: string) => api.get<Patrol[]>('/patrols/', { params: { team: teamId } }),
};
