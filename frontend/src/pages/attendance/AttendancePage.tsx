import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Search,
  XCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { attendanceApi } from '../../api/attendance';
import { structureApi } from '../../api/structure';
import type { AttendanceSession } from '../../types/attendance';
import type { Stage, Team } from '../../types';

export function AttendancePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [newLocation, setNewLocation] = useState('مقر المجموعة الرئيسي');
  const [newDescription, setNewDescription] = useState('');
  const [newUnitId, setNewUnitId] = useState('');
  const [autoPopulate, setAutoPopulate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    loadStructure();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.listSessions();
      setSessions(res.data);
    } catch {
      // error handled in UI
    } finally {
      setLoading(false);
    }
  };

  const loadStructure = async () => {
    try {
      const [stagesRes, teamsRes] = await Promise.all([
        structureApi.stages(),
        structureApi.teams(),
      ]);
      setStages(stagesRes.data);
      setTeams(teamsRes.data);
    } catch {
      // ignore
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('يرجى تحديد عنوان الجلسة.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await attendanceApi.createSession({
        title: newTitle.trim(),
        date: new Date(newDate).toISOString(),
        location: newLocation.trim(),
        description: newDescription.trim(),
        unit_id: newUnitId || undefined,
      });

      const createdSession = res.data;

      if (autoPopulate) {
        try {
          await attendanceApi.populateMembers(createdSession.id);
        } catch {
          // ignore populate error
        }
      }

      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      loadSessions();
      navigate(`/attendance/sessions/${createdSession.id}`);
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'حدث خطأ أثناء إنشاء الجلسة.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.location && s.location.toLowerCase().includes(search.toLowerCase())) ||
    (s.unit_name && s.unit_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">جلسات الحضور والغياب</h1>
          <p className="text-sm text-text-muted mt-1">
            إدارة جلسات الأنشطة والاجتماعات، تسجيل الحضور عبر QR، واعتماد الأعذار
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/attendance/excuses')}
            className="btn-secondary px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-gold-400" />
            <span>أعذار الغياب</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-gold-400/10"
          >
            <Plus className="w-4 h-4" />
            <span>جلسة حضور جديدة</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-surface border border-border p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث باسم الجلسة، المكان، أو الوحدة التنظيمية..."
            className="w-full bg-surface-2 border border-border rounded-xl pr-9 pl-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-400 transition"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="text-center py-16 text-text-muted">جاري تحميل الجلسات...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-2xl p-8 space-y-3">
          <Calendar className="w-12 h-12 text-gold-400/40 mx-auto" />
          <p className="text-base font-semibold text-text-primary">لا توجد جلسات حضور مسجلة</p>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            قم بإنشاء جلسة جديدة الآن للبدء في مسح الأكواد وتسجيل حضور الأفراد.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary px-4 py-2 rounded-xl text-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء أول جلسة</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => {
            const dateObj = new Date(session.date);
            const formattedDate = dateObj.toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            const formattedTime = dateObj.toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={session.id}
                onClick={() => navigate(`/attendance/sessions/${session.id}`)}
                className="card p-5 cursor-pointer hover:border-gold-400/40 hover:shadow-lg transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Unit & Date */}
                  <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                    <span className="bg-surface-3 px-2 py-0.5 rounded-md font-medium text-text-secondary truncate max-w-[150px]">
                      {session.unit_name || 'عام'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formattedTime}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-text-primary group-hover:text-gold-400 transition mb-2">
                    {session.title}
                  </h3>

                  {/* Date & Location */}
                  <div className="space-y-1.5 text-xs text-text-muted mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold-400/70" />
                      <span>{formattedDate}</span>
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gold-400/70" />
                        <span className="truncate">{session.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics & Progress Bar */}
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">نسبة الحضور:</span>
                    <span className="font-bold text-gold-400">{session.attendance_rate}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-surface-3 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${(session.present_count / (session.total_records || 1)) * 100}%` }}
                      title={`حاضر: ${session.present_count}`}
                    />
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{ width: `${(session.excused_count / (session.total_records || 1)) * 100}%` }}
                      title={`بعذر: ${session.excused_count}`}
                    />
                    <div
                      className="bg-brand-red/60 h-full transition-all"
                      style={{ width: `${(session.absent_count / (session.total_records || 1)) * 100}%` }}
                      title={`غائب: ${session.absent_count}`}
                    />
                  </div>

                  {/* Breakdown badges */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-emerald-400 font-medium">حاضر: {session.present_count}</span>
                    <span className="text-amber-400 font-medium">بعذر: {session.excused_count}</span>
                    <span className="text-brand-red font-medium">غائب: {session.absent_count}</span>
                    <span className="text-text-muted font-medium">إجمالي: {session.total_records}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold-400" />
                <h2 className="text-lg font-bold text-text-primary">إنشاء جلسة حضور جديدة</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl border bg-brand-red/10 border-brand-red/30 text-brand-red text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  عنوان الجلسة / النشاط:
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: اجتماع الجمعة، طابور الصباح، مخيم الربيع..."
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">
                    التاريخ والوقت:
                  </label>
                  <input
                    type="datetime-local"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">
                    الموقع:
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="المقر الرئيسي، أرض المخيم..."
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  الوحدة المستهدفة (مرحلة أو فريق):
                </label>
                <select
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400 transition"
                >
                  <option value="">كافة المجموعات (عام)</option>
                  <optgroup label="المراحل الكشفية">
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        مرحلة: {st.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="الفرق">
                    {teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        فريق: {tm.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  الوصف أو الملاحظات:
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="ملاحظات اختيارية عن برنامج اليوم..."
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400 transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoPopulate"
                  checked={autoPopulate}
                  onChange={(e) => setAutoPopulate(e.target.checked)}
                  className="w-4 h-4 rounded text-gold-400 focus:ring-gold-400 bg-surface-2 border-border"
                />
                <label htmlFor="autoPopulate" className="text-xs text-text-secondary cursor-pointer">
                  تعبئة أفراد الوحدة تلقائياً كـ (غائب) لسهولة التحضير السريع
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-4 py-2 rounded-xl text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50"
                >
                  {submitting ? 'جاري الإنشاء...' : 'إنشاء الجلسة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
