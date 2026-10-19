import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { structureApi } from '../../api/structure';
import api from '../../lib/api';
import type { Group, Stage, Team, Patrol, ScoutYear } from '../../types';

// ─── Group Modal ─────────────────────────────────────────────────────────────

const groupSchema = z.object({
  name: z.string().min(2, 'اسم المجموعة مطلوب (2 أحرف على الأقل)'),
  type: z.enum(['SCOUT', 'GUIDE', 'NAVAL'], { required_error: 'النوع مطلوب' }),
  description: z.string().optional(),
});

type GroupForm = z.infer<typeof groupSchema>;

interface GroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: Group | null;
}

export function GroupFormModal({ open, onClose, onSuccess, group }: GroupModalProps) {
  const isEdit = !!group;
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: group?.name ?? '', type: group?.type ?? 'SCOUT', description: group?.description ?? '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: group?.name ?? '', type: group?.type ?? 'SCOUT', description: group?.description ?? '' });
      setServerError(null);
    }
  }, [open, group, reset]);

  const onSubmit = async (data: GroupForm) => {
    setSubmitting(true); setServerError(null);
    try {
      if (isEdit && group) await api.patch(`/groups/${group.id}/`, data);
      else await api.post('/groups/', data);
      onSuccess(); onClose();
    } catch (e: unknown) {
      setServerError('حدث خطأ. تحقق من البيانات وحاول مجدداً.');
    } finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل المجموعة' : 'مجموعة جديدة'} size="md" persistent={submitting}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">{serverError}</div>}
        <Input label="اسم المجموعة" required error={errors.name?.message} {...register('name')} />
        <Select label="النوع" required error={errors.type?.message} {...register('type')}>
          <option value="SCOUT">كشفية</option>
          <option value="GUIDE">إرشادية</option>
          <option value="NAVAL">بحرية</option>
        </Select>
        <Input label="الوصف" error={errors.description?.message} {...register('description')} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>إلغاء</Button>
          <Button type="submit" fullWidth loading={submitting}>{isEdit ? 'حفظ' : 'إضافة'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Stage Modal ─────────────────────────────────────────────────────────────

const stageSchema = z.object({
  name: z.string().min(2, 'اسم المرحلة مطلوب'),
  group: z.string().min(1, 'المجموعة مطلوبة'),
  order: z.coerce.number().int().min(0, 'الترتيب يجب أن يكون رقماً موجباً'),
});

type StageForm = z.infer<typeof stageSchema>;

interface StageModalProps {
  open: boolean; onClose: () => void; onSuccess: () => void; stage?: Stage | null;
}

export function StageFormModal({ open, onClose, onSuccess, stage }: StageModalProps) {
  const isEdit = !!stage;
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StageForm>({
    resolver: zodResolver(stageSchema),
    defaultValues: { name: stage?.name ?? '', group: stage?.group ?? '', order: stage?.order ?? 0 },
  });

  useEffect(() => {
    if (open) {
      structureApi.groups().then(r => setGroups(r.data));
      reset({ name: stage?.name ?? '', group: stage?.group ?? '', order: stage?.order ?? 0 });
      setServerError(null);
    }
  }, [open, stage, reset]);

  const onSubmit = async (data: StageForm) => {
    setSubmitting(true); setServerError(null);
    try {
      if (isEdit && stage) await api.patch(`/stages/${stage.id}/`, data);
      else await api.post('/stages/', data);
      onSuccess(); onClose();
    } catch { setServerError('حدث خطأ. تحقق من البيانات.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل المرحلة' : 'مرحلة جديدة'} size="md" persistent={submitting}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">{serverError}</div>}
        <Input label="اسم المرحلة" required error={errors.name?.message} {...register('name')} />
        <Select label="المجموعة" required error={errors.group?.message} placeholder="اختر المجموعة" {...register('group')}>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
        <Input label="الترتيب" type="number" min={0} error={errors.order?.message} {...register('order')} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>إلغاء</Button>
          <Button type="submit" fullWidth loading={submitting}>{isEdit ? 'حفظ' : 'إضافة'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Team Modal ──────────────────────────────────────────────────────────────

const teamSchema = z.object({
  name: z.string().min(2, 'اسم الفريق مطلوب'),
  stage: z.string().min(1, 'المرحلة مطلوبة'),
  description: z.string().optional(),
});

type TeamForm = z.infer<typeof teamSchema>;

interface TeamModalProps {
  open: boolean; onClose: () => void; onSuccess: () => void; team?: Team | null;
}

export function TeamFormModal({ open, onClose, onSuccess, team }: TeamModalProps) {
  const isEdit = !!team;
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: team?.name ?? '', stage: team?.stage ?? '', description: team?.description ?? '' },
  });

  useEffect(() => {
    if (open) {
      api.get<Stage[]>('/stages/').then(r => setStages(r.data));
      reset({ name: team?.name ?? '', stage: team?.stage ?? '', description: team?.description ?? '' });
      setServerError(null);
    }
  }, [open, team, reset]);

  const onSubmit = async (data: TeamForm) => {
    setSubmitting(true); setServerError(null);
    try {
      if (isEdit && team) await api.patch(`/teams/${team.id}/`, data);
      else await api.post('/teams/', data);
      onSuccess(); onClose();
    } catch { setServerError('حدث خطأ. تحقق من البيانات.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل الفريق' : 'فريق جديد'} size="md" persistent={submitting}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">{serverError}</div>}
        <Input label="اسم الفريق" required error={errors.name?.message} {...register('name')} />
        <Select label="المرحلة" required error={errors.stage?.message} placeholder="اختر المرحلة" {...register('stage')}>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input label="الوصف" error={errors.description?.message} {...register('description')} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>إلغاء</Button>
          <Button type="submit" fullWidth loading={submitting}>{isEdit ? 'حفظ' : 'إضافة'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Patrol Modal ────────────────────────────────────────────────────────────

const patrolSchema = z.object({
  name: z.string().min(2, 'اسم الطابور مطلوب'),
  team: z.string().min(1, 'الفريق مطلوب'),
});
type PatrolForm = z.infer<typeof patrolSchema>;

interface PatrolModalProps {
  open: boolean; onClose: () => void; onSuccess: () => void; patrol?: Patrol | null;
}

export function PatrolFormModal({ open, onClose, onSuccess, patrol }: PatrolModalProps) {
  const isEdit = !!patrol;
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PatrolForm>({
    resolver: zodResolver(patrolSchema),
    defaultValues: { name: patrol?.name ?? '', team: patrol?.team ?? '' },
  });

  useEffect(() => {
    if (open) {
      api.get<Team[]>('/teams/').then(r => setTeams(r.data));
      reset({ name: patrol?.name ?? '', team: patrol?.team ?? '' });
      setServerError(null);
    }
  }, [open, patrol, reset]);

  const onSubmit = async (data: PatrolForm) => {
    setSubmitting(true); setServerError(null);
    try {
      if (isEdit && patrol) await api.patch(`/patrols/${patrol.id}/`, data);
      else await api.post('/patrols/', data);
      onSuccess(); onClose();
    } catch { setServerError('حدث خطأ. تحقق من البيانات.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل الطابور' : 'طابور جديد'} size="md" persistent={submitting}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">{serverError}</div>}
        <Input label="اسم الطابور" required error={errors.name?.message} {...register('name')} />
        <Select label="الفريق" required error={errors.team?.message} placeholder="اختر الفريق" {...register('team')}>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>إلغاء</Button>
          <Button type="submit" fullWidth loading={submitting}>{isEdit ? 'حفظ' : 'إضافة'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Scout Year Modal ────────────────────────────────────────────────────────

const yearSchema = z.object({
  name: z.string().min(3, 'اسم السنة مطلوب'),
  start_date: z.string().min(1, 'تاريخ البداية مطلوب'),
  end_date: z.string().min(1, 'تاريخ النهاية مطلوب'),
  is_active: z.boolean().optional(),
});
type YearForm = z.infer<typeof yearSchema>;

interface YearModalProps {
  open: boolean; onClose: () => void; onSuccess: () => void; year?: ScoutYear | null;
}

export function ScoutYearFormModal({ open, onClose, onSuccess, year }: YearModalProps) {
  const isEdit = !!year;
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<YearForm>({
    resolver: zodResolver(yearSchema),
    defaultValues: {
      name: year?.name ?? '', start_date: year?.start_date ?? '',
      end_date: year?.end_date ?? '', is_active: year?.is_active ?? false,
    },
  });

  useEffect(() => {
    if (open) {
      reset({ name: year?.name ?? '', start_date: year?.start_date ?? '', end_date: year?.end_date ?? '', is_active: year?.is_active ?? false });
      setServerError(null);
    }
  }, [open, year, reset]);

  const onSubmit = async (data: YearForm) => {
    setSubmitting(true); setServerError(null);
    try {
      if (isEdit && year) await api.patch(`/scout-years/${year.id}/`, data);
      else await api.post('/scout-years/', data);
      onSuccess(); onClose();
    } catch { setServerError('حدث خطأ. تحقق من البيانات.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل السنة الكشفية' : 'سنة كشفية جديدة'} size="md" persistent={submitting}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">{serverError}</div>}
        <Input label="اسم السنة" placeholder="2026-2027" required error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="تاريخ البداية" type="date" required error={errors.start_date?.message} {...register('start_date')} />
          <Input label="تاريخ النهاية" type="date" required error={errors.end_date?.message} {...register('end_date')} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('is_active')} className="accent-[#d4a338] w-4 h-4" />
          <span className="text-sm text-text-primary">السنة النشطة حالياً</span>
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>إلغاء</Button>
          <Button type="submit" fullWidth loading={submitting}>{isEdit ? 'حفظ' : 'إضافة'}</Button>
        </div>
      </form>
    </Modal>
  );
}
