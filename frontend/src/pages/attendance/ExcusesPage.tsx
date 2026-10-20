import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Search,
  Check,
  Ban,
} from 'lucide-react';
import { attendanceApi } from '../../api/attendance';
import type { AttendanceExcuse } from '../../types/attendance';

export function ExcusesPage() {
  const navigate = useNavigate();
  const [excuses, setExcuses] = useState<AttendanceExcuse[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal state
  const [rejectingExcuseId, setRejectingExcuseId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadExcuses();
  }, [statusFilter]);

  const loadExcuses = async () => {
    setLoading(true);
    try {
      const params = statusFilter === 'ALL' ? {} : { status: statusFilter };
      const res = await attendanceApi.listExcuses(params);
      setExcuses(res.data);
    } catch {
      // error handled in UI
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await attendanceApi.approveExcuse(id);
      await loadExcuses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'تعذر اعتماد العذر.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingExcuseId || !rejectionReason.trim()) return;
    setActionLoading(rejectingExcuseId);
    try {
      await attendanceApi.rejectExcuse(rejectingExcuseId, rejectionReason.trim());
      setRejectingExcuseId(null);
      setRejectionReason('');
      await loadExcuses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'تعذر رفض العذر.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredExcuses = excuses.filter((e) =>
    e.member_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.stage_code && e.stage_code.toLowerCase().includes(search.toLowerCase())) ||
    e.session_title.toLowerCase().includes(search.toLowerCase()) ||
    e.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/attendance')}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text-primary transition"
            title="رجوع لجلسات الحضور"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">إدارة أعذار الغياب</h1>
            <p className="text-sm text-text-muted mt-1">
              مراجعة طلبات وأسباب الأعذار واعتمادها أو رفضها مع حفظ سجل القرارات
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border p-3 rounded-2xl">
        <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl">
          {[
            { key: 'PENDING', label: 'قيد الانتظار' },
            { key: 'APPROVED', label: 'المعتمدة' },
            { key: 'REJECTED', label: 'المرفوضة' },
            { key: 'ALL', label: 'كافة الأعذار' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === tab.key
                  ? 'bg-surface text-gold-400 shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث باسم الفرد، الجلسة، أو السبب..."
            className="w-full bg-surface-2 border border-border rounded-xl pr-9 pl-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-400 transition"
          />
        </div>
      </div>

      {/* Excuses List */}
      {loading ? (
        <div className="text-center py-20 text-text-muted">جاري تحميل الأعذار...</div>
      ) : filteredExcuses.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-2xl p-8 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400/40 mx-auto" />
          <p className="text-base font-semibold text-text-primary">لا توجد أعذار مطابقة</p>
          <p className="text-sm text-text-muted">
            لا توجد أي طلبات أعذار تنتظر المراجعة في هذه الفئة حالياً.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExcuses.map((excuse) => {
            const dateObj = new Date(excuse.session_date);
            const formattedSessionDate = dateObj.toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={excuse.id}
                className="card p-5 border border-border hover:border-gold-400/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-text-primary">
                      {excuse.member_name}
                    </span>
                    <span className="text-xs text-text-muted font-mono bg-surface-3 px-2 py-0.5 rounded">
                      {excuse.stage_code || '---'}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        excuse.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : excuse.status === 'REJECTED'
                          ? 'bg-brand-red/10 text-brand-red border border-brand-red/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {excuse.status === 'APPROVED'
                        ? 'معتمد'
                        : excuse.status === 'REJECTED'
                        ? 'مرفوض'
                        : 'قيد الانتظار'}
                    </span>
                  </div>

                  <div className="text-xs text-text-muted flex items-center gap-2">
                    <span>الجلسة: <strong className="text-text-secondary">{excuse.session_title}</strong></span>
                    <span>•</span>
                    <span>{formattedSessionDate}</span>
                  </div>

                  <p className="text-sm text-text-secondary bg-surface-2 p-3 rounded-xl border border-border mt-2">
                    {excuse.reason}
                  </p>

                  {excuse.rejection_reason && (
                    <p className="text-xs text-brand-red bg-brand-red/5 p-2 rounded-lg border border-brand-red/20">
                      <strong>سبب الرفض: </strong>
                      {excuse.rejection_reason}
                    </p>
                  )}

                  {excuse.approved_by_name && (
                    <p className="text-[11px] text-text-muted pt-1">
                      تمت المراجعة بواسطة: {excuse.approved_by_name}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {excuse.document && (
                    <a
                      href={excuse.document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>المستند</span>
                    </a>
                  )}

                  {excuse.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(excuse.id)}
                        disabled={actionLoading === excuse.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>اعتماد</span>
                      </button>
                      <button
                        onClick={() => {
                          setRejectingExcuseId(excuse.id);
                          setRejectionReason('');
                        }}
                        disabled={actionLoading === excuse.id}
                        className="bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/30 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Ban className="w-4 h-4" />
                        <span>رفض</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal Prompt */}
      {rejectingExcuseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-text-primary">رفض عذر الغياب</h3>
            <p className="text-xs text-text-muted">
              يرجى كتابة سبب رفض العذر لحفظه في سجل القرارات وإعلام المسؤول:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="سبب الرفض..."
              className="w-full bg-surface-2 border border-border rounded-xl p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-red transition"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectingExcuseId(null)}
                className="btn-secondary px-3 py-1.5 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="bg-brand-red text-white text-xs px-4 py-1.5 rounded-xl font-semibold disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
