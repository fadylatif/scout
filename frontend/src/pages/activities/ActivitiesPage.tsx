import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  MapPin,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { activitiesApi } from '../../api/activities';
import { structureApi } from '../../api/structure';
import type { CalendarEvent, Activity } from '../../types/modules';
import type { Team } from '../../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<string, string> = {
  MEETING: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  CAMP: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  TRIP: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  EVENT: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  TRAINING: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  MEETING: 'اجتماع دوري',
  CAMP: 'مخيم',
  TRIP: 'رحلة',
  EVENT: 'حدث عام',
  TRAINING: 'تدريب',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-EG', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// ─── CreateActivityModal ─────────────────────────────────────────────────────

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateActivityModal({ open, onClose, onCreated }: CreateModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    activity_type: 'MEETING',
    start_date: '',
    end_date: '',
    is_recurring: false,
    frequency: 'WEEKLY',
    location_name: '',
    teams: [] as string[],
  });

  useEffect(() => {
    if (open) {
      structureApi.teams().then((r) => setTeams(r.data));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start_date) return;
    setLoading(true);
    try {
      const payload: Partial<Activity> = {
        title: form.title,
        description: form.description,
        activity_type: form.activity_type as Activity['activity_type'],
        start_date: new Date(form.start_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
        is_recurring: form.is_recurring,
        frequency: form.is_recurring ? (form.frequency as Activity['frequency']) : undefined,
        teams: form.teams,
      };
      await activitiesApi.create(payload);
      onCreated();
      onClose();
      setForm({
        title: '', description: '', activity_type: 'MEETING',
        start_date: '', end_date: '', is_recurring: false,
        frequency: 'WEEKLY', location_name: '', teams: [],
      });
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (id: string) => {
    setForm((f) => ({
      ...f,
      teams: f.teams.includes(id) ? f.teams.filter((t) => t !== id) : [...f.teams, id],
    }));
  };

  return (
    <Modal open={open} onClose={onClose} title="إضافة نشاط جديد" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="عنوان النشاط"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          placeholder="مثال: اجتماع الأشبال الأسبوعي"
        />
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">الوصف</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:border-gold-400"
            placeholder="تفاصيل النشاط..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">نوع النشاط</label>
            <select
              value={form.activity_type}
              onChange={(e) => setForm((f) => ({ ...f, activity_type: e.target.value }))}
              className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400"
            >
              {Object.entries(ACTIVITY_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">تاريخ البدء</label>
            <input
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              required
              className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400"
            />
          </div>
        </div>

        {/* Recurring */}
        <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-xl">
          <input
            type="checkbox"
            id="is_recurring"
            checked={form.is_recurring}
            onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))}
            className="w-4 h-4 accent-yellow-400"
          />
          <label htmlFor="is_recurring" className="text-sm text-text-primary font-medium">نشاط متكرر</label>
          {form.is_recurring && (
            <select
              value={form.frequency}
              onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
              className="mr-auto bg-surface border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-gold-400"
            >
              <option value="DAILY">يومي</option>
              <option value="WEEKLY">أسبوعي</option>
              <option value="MONTHLY">شهري</option>
            </select>
          )}
        </div>

        {/* Teams */}
        {teams.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">
              <Users className="inline w-3.5 h-3.5 ml-1" />
              الفرق المشاركة
            </label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-surface-3 rounded-xl border border-border">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    form.teams.includes(team.id)
                      ? 'bg-gold-400/20 text-gold-400 border-gold-400/40'
                      : 'bg-surface text-text-secondary border-border hover:border-gold-400/30'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">إلغاء</Button>
          <Button type="submit" variant="primary" loading={loading} className="flex-1">
            <Plus className="w-4 h-4" />
            حفظ النشاط
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ActivitiesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { start, end } = getMonthRange(year, month);
    try {
      const res = await activitiesApi.calendar({ start, end });
      setEvents(res.data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  const filtered = filter === 'ALL' ? events : events.filter((e) => e.type === filter);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const getEventsForDay = (day: number) =>
    filtered.filter((e) => {
      const d = new Date(e.start);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const DAY_NAMES = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <Calendar className="w-6 h-6 text-gold-400" />
            الأنشطة والاجتماعات
          </h1>
          <p className="text-text-muted text-sm mt-1">التقويم الموحد لجميع الأنشطة والفرق</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchEvents} className="p-2 rounded-xl border border-border hover:bg-surface-3 text-text-muted hover:text-text-primary transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            نشاط جديد
          </Button>
        </div>
      </div>

      {/* Filter + Month nav */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Month navigation */}
        <div className="flex items-center gap-2 bg-surface border border-border rounded-xl p-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-bold text-text-primary min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', ...Object.keys(ACTIVITY_TYPE_LABELS)].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filter === t
                  ? 'bg-gold-400/15 text-gold-400 border-gold-400/30'
                  : 'bg-surface text-text-muted border-border hover:bg-surface-3'
              }`}
            >
              {t === 'ALL' ? 'الكل' : ACTIVITY_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(ACTIVITY_TYPE_LABELS).map(([type, label]) => {
          const count = events.filter((e) => e.type === type).length;
          return (
            <Card key={type} className="!p-0">
              <CardContent>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border mt-3 ${ACTIVITY_COLORS[type]}`}>
                  {label}
                </div>
                <p className="text-2xl font-black text-text-primary mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : (
            <div className="pt-2">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-center text-xs font-bold text-text-muted py-2">{d}</div>
                ))}
              </div>
              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
                {calendarDays.map((day, idx) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                  return (
                    <div
                      key={idx}
                      className={`bg-surface min-h-[90px] p-1.5 ${day ? 'hover:bg-surface-3 transition-colors' : 'opacity-30'}`}
                    >
                      {day && (
                        <>
                          <span className={`text-xs font-bold inline-flex w-6 h-6 items-center justify-center rounded-full mb-1 ${
                            isToday ? 'bg-gold-400 text-black' : 'text-text-muted'
                          }`}>
                            {day}
                          </span>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 2).map((ev) => (
                              <button
                                key={ev.id}
                                onClick={() => setSelectedEvent(ev)}
                                className={`w-full text-right truncate text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                  ev.is_cancelled
                                    ? 'bg-surface-3 text-text-muted border-border line-through'
                                    : ACTIVITY_COLORS[ev.type]
                                }`}
                                title={ev.title}
                              >
                                {ev.title}
                              </button>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-[10px] text-text-muted px-1">+{dayEvents.length - 2} أخرى</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming events list */}
      {!loading && filtered.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-bold text-text-primary">أنشطة {monthLabel}</h2>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {filtered.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 py-3 cursor-pointer hover:bg-surface-3 rounded-xl px-2 transition-all -mx-2"
                  onClick={() => setSelectedEvent(ev)}
                >
                  <div className={`mt-0.5 px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${ACTIVITY_COLORS[ev.type]}`}>
                    {ACTIVITY_TYPE_LABELS[ev.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${ev.is_cancelled ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {ev.title}
                      {ev.is_cancelled && <span className="mr-2 text-xs text-brand-red">(ملغى)</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock className="w-3 h-3" />
                        {formatDate(ev.start)} · {formatTime(ev.start)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                          <MapPin className="w-3 h-3" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">لا توجد أنشطة في هذا الشهر</p>
          <p className="text-sm mt-1">أضف نشاطاً جديداً للبدء</p>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent.title}>
          <div className="space-y-4">
            <div className={`inline-flex px-3 py-1.5 rounded-xl text-sm font-bold border ${ACTIVITY_COLORS[selectedEvent.type]}`}>
              {selectedEvent.type_display}
            </div>
            {selectedEvent.is_cancelled && (
              <div className="flex items-center gap-2 p-3 bg-brand-red/10 rounded-xl border border-brand-red/20 text-brand-red text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>ملغى — {selectedEvent.cancel_reason || 'بدون سبب'}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted text-xs mb-0.5">البدء</p>
                <p className="font-semibold text-text-primary">{formatDate(selectedEvent.start)}</p>
                <p className="text-text-muted text-xs">{formatTime(selectedEvent.start)}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">الانتهاء</p>
                <p className="font-semibold text-text-primary">{formatDate(selectedEvent.end)}</p>
                <p className="text-text-muted text-xs">{formatTime(selectedEvent.end)}</p>
              </div>
            </div>
            {selectedEvent.location && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <MapPin className="w-4 h-4 text-gold-400" />
                {selectedEvent.location}
              </div>
            )}
            <Button variant="ghost" onClick={() => setSelectedEvent(null)} className="w-full">إغلاق</Button>
          </div>
        </Modal>
      )}

      <CreateActivityModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchEvents}
      />
    </div>
  );
}
