// ─── Auth & Users ──────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'LEADER' | 'ASSISTANT';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  permission?: UserPermission;
  scope_accesses?: UserScopeAccess[];
}

export interface UserPermission {
  id: string;
  permissions: Record<string, unknown>;
  copied_from?: string | null;
}

export interface UserScopeAccess {
  id: string;
  scope_type: 'GROUP' | 'STAGE' | 'TEAM' | 'PATROL';
  scope_id: string;
}

export interface UserSession {
  id: string;
  session_key: string;
  device_info: string;
  ip_address: string | null;
  created_at: string;
  last_activity: string;
  is_active: boolean;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Structure ─────────────────────────────────────────────────────────────

export interface ScoutYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Group {
  id: string;
  name: string;
  type: 'SCOUT' | 'GUIDE' | 'NAVAL';
  description: string;
}

export interface Sector {
  id: string;
  name: string;
  group: string;
  group_name: string;
}

export interface Stage {
  id: string;
  name: string;
  group: string;
  group_name: string;
  order: number;
}

export interface Patrol {
  id: string;
  name: string;
  team: string;
  team_name: string;
  leader?: string | null;
  leader_name?: string | null;
}

export interface Team {
  id: string;
  name: string;
  stage: string;
  stage_name: string;
  sector?: string | null;
  sector_name?: string | null;
  leader?: string | null;
  leader_name?: string | null;
  description: string;
  patrols?: Patrol[];
  member_count: number;
}

export interface GroupTree {
  id: string;
  name: string;
  type: 'SCOUT' | 'GUIDE' | 'NAVAL';
  stages: StageWithTeams[];
}

export interface StageWithTeams {
  id: string;
  name: string;
  order: number;
  teams: Team[];
}

// ─── Members ───────────────────────────────────────────────────────────────

export type Gender = 'M' | 'F';

export interface Member {
  id: string;
  full_name: string;
  date_of_birth?: string | null;
  gender: Gender;
  phone: string;
  guardian_phone: string;
  address: string;
  photo?: string | null;
  qr_image?: string | null;
  stage_code?: string | null;
  group?: string | null;
  group_name?: string | null;
  stage?: string | null;
  stage_name?: string | null;
  team?: string | null;
  team_name?: string | null;
  patrol?: string | null;
  patrol_name?: string | null;
  scout_year?: string | null;
  is_active: boolean;
  code_history?: MemberCodeHistory[];
  transfer_logs?: MemberTransferLog[];
  created_at: string;
  updated_at: string;
}

export interface MemberCodeHistory {
  id: string;
  old_code: string;
  stage?: string | null;
  changed_at: string;
  reason: string;
}

export interface MemberTransferLog {
  id: string;
  from_team_name?: string | null;
  to_team_name?: string | null;
  from_stage_name?: string | null;
  to_stage_name?: string | null;
  transferred_at: string;
  reason: string;
  transferred_by_name?: string | null;
}

// ─── API Pagination ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
