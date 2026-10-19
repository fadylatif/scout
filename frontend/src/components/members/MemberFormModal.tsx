import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { structureApi } from '../../api/structure';
import { membersApi } from '../../api/members';
import type { Group, Stage, Team, Patrol, ScoutYear, Member } from '../../types';

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const EGYPTIAN_PHONE = /^01[0-2,5]\d{8}$/;

const schema = z.object({
  full_name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  gender: z.enum(['M', 'F'], { required_error: 'يرجى اختيار الجنس' }),
  date_of_birth: z.string().optional(),
  phone: z
    .string()
    .regex(EGYPTIAN_PHONE, 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ 010/011/012/015)')
    .or(z.literal('')),
  guardian_phone: z
    .string()
    .regex(EGYPTIAN_PHONE, 'هاتف ولي الأمر غير صحيح')
    .or(z.literal('')),
  address: z.string().optional(),
  national_id: z
    .string()
    .regex(/^\d{14}$/, 'الرقم القومي يجب أن يتكون من 14 رقماً')
    .or(z.literal(''))
    .optional(),
  group: z.string().min(1, 'يرجى اختيار المجموعة'),
  stage: z.string().min(1, 'يرجى اختيار المرحلة'),
  team: z.string().min(1, 'يرجى اختيار الفريق'),
  patrol: z.string().optional(),
  scout_year: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

interface MemberFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member?: Member | null;
}

export function MemberFormModal({ open, onClose, onSuccess, member }: MemberFormModalProps) {
  const isEdit = !!member;

  const [groups, setGroups] = useState<Group[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [scoutYears, setScoutYears] = useState<ScoutYear[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(member?.photo ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: member?.full_name ?? '',
      gender: (member?.gender as 'M' | 'F') ?? undefined,
      date_of_birth: member?.date_of_birth ?? '',
      phone: member?.phone ?? '',
      guardian_phone: member?.guardian_phone ?? '',
      address: member?.address ?? '',
      group: member?.group ?? '',
      stage: member?.stage ?? '',
      team: member?.team ?? '',
      patrol: member?.patrol ?? '',
    },
  });

  const selectedGroup = watch('group');
  const selectedStage = watch('stage');
  const selectedTeam = watch('team');

  // Load groups + scout years once
  useEffect(() => {
    if (!open) return;
    Promise.all([structureApi.groups(), structureApi.scoutYears()]).then(([g, y]) => {
      setGroups(g.data);
      setScoutYears(y.data);
    });
  }, [open]);

  // Reset form when member changes
  useEffect(() => {
    if (open) {
      reset({
        full_name: member?.full_name ?? '',
        gender: (member?.gender as 'M' | 'F') ?? undefined,
        date_of_birth: member?.date_of_birth ?? '',
        phone: member?.phone ?? '',
        guardian_phone: member?.guardian_phone ?? '',
        address: member?.address ?? '',
        group: member?.group ?? '',
        stage: member?.stage ?? '',
        team: member?.team ?? '',
        patrol: member?.patrol ?? '',
      });
      setPhotoPreview(member?.photo ?? null);
      setPhotoFile(null);
      setServerError(null);
    }
  }, [open, member, reset]);

  // Cascading: group → stages
  useEffect(() => {
    if (!selectedGroup) { setStages([]); setValue('stage', ''); return; }
    structureApi.stages(selectedGroup).then((r) => setStages(r.data));
    setValue('stage', '');
    setValue('team', '');
    setValue('patrol', '');
  }, [selectedGroup, setValue]);

  // Cascading: stage → teams
  useEffect(() => {
    if (!selectedStage) { setTeams([]); setValue('team', ''); return; }
    structureApi.teams({ stage: selectedStage }).then((r) => setTeams(r.data));
    setValue('team', '');
    setValue('patrol', '');
  }, [selectedStage, setValue]);

  // Cascading: team → patrols
  useEffect(() => {
    if (!selectedTeam) { setPatrols([]); setValue('patrol', ''); return; }
    structureApi.patrols(selectedTeam).then((r) => setPatrols(r.data));
    setValue('patrol', '');
  }, [selectedTeam, setValue]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setServerError('حجم الصورة يتجاوز 10 ميجابايت');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v) fd.append(k, v as string); });
      if (photoFile) fd.append('photo', photoFile);

      if (isEdit && member) {
        await membersApi.update(member.id, fd);
      } else {
        await membersApi.create(fd);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      if (e.response?.data) {
        const msgs = Object.entries(e.response.data)
          .map(([f, errs]) => `${f}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
          .join('\n');
        setServerError(msgs);
      } else {
        setServerError('حدث خطأ غير متوقع. حاول مجدداً.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل بيانات الفرد' : 'إضافة فرد جديد'}
      size="lg"
      persistent={submitting}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && (
          <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm whitespace-pre-line">
            {serverError}
          </div>
        )}

        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-3 border border-border overflow-hidden shrink-0 flex items-center justify-center">
            {photoPreview ? (
              <img src={photoPreview} alt="صورة الفرد" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-text-muted" />
            )}
          </div>
          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-3 border border-border text-sm font-medium text-text-secondary hover:border-gold-400 hover:text-gold-400 transition-colors">
              <Camera className="w-4 h-4" />
              <span>{photoPreview ? 'تغيير الصورة' : 'رفع صورة'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            <p className="text-xs text-text-muted mt-1">JPG، PNG — حتى 10 ميجابايت</p>
          </div>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="الاسم الكامل"
            required
            error={errors.full_name?.message}
            {...register('full_name')}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              الجنس <span className="text-brand-red">*</span>
            </label>
            <div className="flex gap-3">
              {[{ v: 'M', l: 'ذكر' }, { v: 'F', l: 'أنثى' }].map(({ v, l }) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={v} {...register('gender')} className="accent-[#d4a338]" />
                  <span className="text-sm text-text-primary">{l}</span>
                </label>
              ))}
            </div>
            {errors.gender && <p className="text-sm text-brand-red">{errors.gender.message}</p>}
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="تاريخ الميلاد"
            type="date"
            error={errors.date_of_birth?.message}
            {...register('date_of_birth')}
          />
          <Input
            label="الرقم القومي"
            placeholder="14 رقم (اختياري)"
            error={errors.national_id?.message}
            {...register('national_id')}
          />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="رقم الهاتف"
            placeholder="01XXXXXXXXX"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="هاتف ولي الأمر"
            placeholder="01XXXXXXXXX"
            error={errors.guardian_phone?.message}
            {...register('guardian_phone')}
          />
        </div>

        {/* Address */}
        <Input
          label="العنوان"
          error={errors.address?.message}
          {...register('address')}
        />

        {/* Cascading selects */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">التصنيف الكشفي</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="المجموعة"
              required
              error={errors.group?.message}
              placeholder="اختر المجموعة"
              {...register('group')}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>

            <Select
              label="المرحلة"
              required
              error={errors.stage?.message}
              placeholder={selectedGroup ? 'اختر المرحلة' : 'اختر المجموعة أولاً'}
              disabled={!selectedGroup || stages.length === 0}
              {...register('stage')}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>

            <Select
              label="الفريق"
              required
              error={errors.team?.message}
              placeholder={selectedStage ? 'اختر الفريق' : 'اختر المرحلة أولاً'}
              disabled={!selectedStage || teams.length === 0}
              {...register('team')}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>

            <Select
              label="الطابور"
              placeholder={selectedTeam ? 'اختر الطابور (اختياري)' : 'اختر الفريق أولاً'}
              disabled={!selectedTeam}
              {...register('patrol')}
            >
              {patrols.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>

            <Select
              label="السنة الكشفية"
              placeholder="اختر السنة"
              {...register('scout_year')}
            >
              {scoutYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button type="submit" fullWidth loading={submitting}>
            {isEdit ? 'حفظ التعديلات' : 'إضافة الفرد'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
