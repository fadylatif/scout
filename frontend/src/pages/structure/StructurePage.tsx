import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronLeft, Users, Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  GroupFormModal,
  StageFormModal,
  TeamFormModal,
} from '../../components/structure/StructureFormModals';
import { structureApi } from '../../api/structure';
import { useAuth } from '../../store/authStore';
import api from '../../lib/api';
import type { GroupTree, StageWithTeams, Group, Stage, Team } from '../../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const groupTypeLabel: Record<string, string> = { SCOUT: 'كشفية', GUIDE: 'إرشادية', NAVAL: 'بحرية' };
const groupTypeBadge: Record<string, 'gold' | 'info' | 'success'> = { SCOUT: 'gold', GUIDE: 'info', NAVAL: 'success' };

// ─── TeamRow ─────────────────────────────────────────────────────────────────

function TeamRow({
  team, canEdit, canDelete, onEdit, onDelete,
}: {
  team: GroupTree['stages'][0]['teams'][0];
  canEdit: boolean; canDelete: boolean;
  onEdit: (t: GroupTree['stages'][0]['teams'][0]) => void;
  onDelete: (t: GroupTree['stages'][0]['teams'][0]) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-surface-3 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-gold-400/60 shrink-0" />
        <span className="text-sm font-medium text-text-primary">{team.name}</span>
        {team.leader_name && <span className="text-xs text-text-muted">({team.leader_name})</span>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="default"><Users className="w-3 h-3 ml-1" />{team.member_count} فرد</Badge>
        {canEdit && (
          <button onClick={() => onEdit(team)}
            className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-gold-400 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="تعديل الفريق">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {canDelete && (
          <button onClick={() => onDelete(team)}
            className="p-1 rounded hover:bg-brand-red/10 text-text-muted hover:text-brand-red transition-colors opacity-0 group-hover:opacity-100"
            aria-label="حذف الفريق">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── StageSection ────────────────────────────────────────────────────────────

function StageSection({
  stage, canEdit, canDelete, canAdd,
  onEditStage, onDeleteStage,
  onAddTeam, onEditTeam, onDeleteTeam,
}: {
  stage: StageWithTeams;
  canEdit: boolean; canDelete: boolean; canAdd: boolean;
  onEditStage: (s: StageWithTeams) => void;
  onDeleteStage: (s: StageWithTeams) => void;
  onAddTeam: (stageId: string) => void;
  onEditTeam: (t: GroupTree['stages'][0]['teams'][0]) => void;
  onDeleteTeam: (t: GroupTree['stages'][0]['teams'][0]) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="w-full flex items-center justify-between px-4 py-3 bg-surface-2">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 flex-1 text-right"
          aria-expanded={open}>
          <Building2 className="w-4 h-4 text-gold-400" />
          <span className="font-semibold text-text-primary text-sm">{stage.name}</span>
          <Badge variant="gold">{stage.teams.length} فريق</Badge>
          {open ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronLeft className="w-4 h-4 text-text-muted icon-directional" />}
        </button>
        <div className="flex items-center gap-1 mr-2">
          {canAdd && (
            <button onClick={() => onAddTeam(stage.id)}
              className="p-1 rounded hover:bg-surface-3 text-text-muted hover:text-gold-400 transition-colors"
              aria-label="إضافة فريق">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {canEdit && (
            <button onClick={() => onEditStage(stage)}
              className="p-1 rounded hover:bg-surface-3 text-text-muted hover:text-gold-400 transition-colors"
              aria-label="تعديل المرحلة">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDeleteStage(stage)}
              className="p-1 rounded hover:bg-brand-red/10 text-text-muted hover:text-brand-red transition-colors"
              aria-label="حذف المرحلة">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="p-2 space-y-1">
          {stage.teams.map(t => (
            <TeamRow key={t.id} team={t} canEdit={canEdit} canDelete={canDelete}
              onEdit={onEditTeam} onDelete={onDeleteTeam} />
          ))}
          {stage.teams.length === 0 && (
            <p className="text-center text-text-muted text-xs py-4">لا توجد فرق — اضغط + لإضافة فريق</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function StructurePage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupTree[]>([]);
  const [loading, setLoading] = useState(true);

  const perms = user?.permission?.permissions as Record<string, Record<string, boolean>> | undefined;
  const isAdmin = user?.role === 'ADMIN';
  const canAdd = isAdmin || perms?.structure?.add;
  const canEdit = isAdmin || perms?.structure?.edit;
  const canDelete = isAdmin || perms?.structure?.delete;

  // Modal states
  const [groupModal, setGroupModal] = useState<{ open: boolean; item: Group | null }>({ open: false, item: null });
  const [stageModal, setStageModal] = useState<{ open: boolean; item: Stage | null }>({ open: false, item: null });
  const [teamModal, setTeamModal] = useState<{ open: boolean; item: Team | null; defaultStage?: string }>({ open: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await structureApi.groupTree();
      setGroups(res.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const urlMap: Record<string, string> = {
        Group: '/groups/', Stage: '/stages/', Team: '/teams/', Patrol: '/patrols/',
      };
      await api.delete(`${urlMap[deleteTarget.type]}${deleteTarget.id}/`);
      setDeleteTarget(null);
      loadGroups();
    } finally { setDeleting(false); }
  };

  // Cast handlers — StageWithTeams has same shape as Stage for our modals
  const handleEditStage = (s: StageWithTeams) => setStageModal({ open: true, item: s as unknown as Stage });
  const handleDeleteStage = (s: StageWithTeams) => setDeleteTarget({ type: 'Stage', id: s.id, name: s.name });
  const handleAddTeam = (stageId: string) => setTeamModal({ open: true, item: null, defaultStage: stageId });
  const handleEditTeam = (t: GroupTree['stages'][0]['teams'][0]) => setTeamModal({ open: true, item: t as unknown as Team });
  const handleDeleteTeam = (t: GroupTree['stages'][0]['teams'][0]) => setDeleteTarget({ type: 'Team', id: t.id, name: t.name });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">الهيكل التنظيمي</h1>
          <p className="text-text-muted text-sm mt-0.5">شجرة المجموعات والمراحل والفرق</p>
        </div>
        {canAdd && (
          <Button size="sm" onClick={() => setGroupModal({ open: true, item: null })}>
            <Plus className="w-4 h-4" />
            مجموعة جديدة
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-text-muted py-8">لا توجد مجموعات مسجلة بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <Card key={group.id} hover>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-text-primary">{group.name}</h2>
                    <Badge variant={groupTypeBadge[group.type] ?? 'default'}>{groupTypeLabel[group.type]}</Badge>
                    <Badge variant="default">{group.stages.length} مرحلة</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {canAdd && (
                      <Button size="sm" variant="ghost"
                        onClick={() => setStageModal({ open: true, item: null })}
                        aria-label="إضافة مرحلة">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">مرحلة</span>
                      </Button>
                    )}
                    {canEdit && (
                      <button onClick={() => setGroupModal({ open: true, item: group as unknown as Group })}
                        className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted hover:text-gold-400 transition-colors"
                        aria-label="تعديل المجموعة">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget({ type: 'Group', id: group.id, name: group.name })}
                        className="p-1.5 rounded-lg hover:bg-brand-red/10 text-text-muted hover:text-brand-red transition-colors"
                        aria-label="حذف المجموعة">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.stages.map(stage => (
                    <StageSection key={stage.id} stage={stage}
                      canEdit={canEdit ?? false} canDelete={canDelete ?? false} canAdd={canAdd ?? false}
                      onEditStage={handleEditStage} onDeleteStage={handleDeleteStage}
                      onAddTeam={handleAddTeam} onEditTeam={handleEditTeam} onDeleteTeam={handleDeleteTeam}
                    />
                  ))}
                  {group.stages.length === 0 && (
                    <p className="text-center text-text-muted text-sm py-4">لا توجد مراحل — اضغط "مرحلة" لإضافة</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <GroupFormModal open={groupModal.open} onClose={() => setGroupModal({ open: false, item: null })}
        onSuccess={loadGroups} group={groupModal.item} />
      <StageFormModal open={stageModal.open} onClose={() => setStageModal({ open: false, item: null })}
        onSuccess={loadGroups} stage={stageModal.item} />
      <TeamFormModal open={teamModal.open} onClose={() => setTeamModal({ open: false, item: null })}
        onSuccess={loadGroups} team={teamModal.item} />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title={`حذف ${deleteTarget?.type === 'Group' ? 'المجموعة' : deleteTarget?.type === 'Stage' ? 'المرحلة' : 'الفريق'}`}
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟`}
        confirmLabel="حذف"
      />
    </div>
  );
}
