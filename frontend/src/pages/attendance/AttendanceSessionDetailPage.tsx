import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  QrCode,
  Users,
  CheckCircle2,
  FileText,
  Search,
  RefreshCw,
} from 'lucide-react';
import { attendanceApi } from '../../api/attendance';
import type {
  AttendanceSession,
  AttendanceRecord,
  AttendanceStatus,
} from '../../types/attendance';
import { QRScannerModal } from '../../components/attendance/QRScannerModal';
import { ExcuseModal } from '../../components/attendance/ExcuseModal';

export function AttendanceSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedRecordForExcuse, setSelectedRecordForExcuse] = useState<AttendanceRecord | null>(null);
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [populating, setPopulating] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sessionRes, recordsRes] = await Promise.all([
        attendanceApi.getSession(id),
        attendanceApi.listRecords({ session: id }),
      ]);
      setSession(sessionRes.data);
      setRecords(recordsRes.data);
    } catch {
      // error handled in UI
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateMembers = async () => {
    if (!id) return;
    setPopulating(true);
    try {
      await attendanceApi.populateMembers(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'تعذر تعبئة الأفراد.');
    } finally {
      setPopulating(false);
    }
  };

  const handleStatusChange = async (recordId: string, newStatus: AttendanceStatus) => {
    // Optimistic update
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: newStatus,
              check_in_time: newStatus === 'PRESENT' ? new Date().toISOString() : r.check_in_time,
            }
          : r
      )
    );

    try {
      await attendanceApi.updateRecord(recordId, { status: newStatus });
      // Refresh session counts
      if (id) {
        const sessionRes = await attendanceApi.getSession(id);
        setSession(sessionRes.data);
      }
    } catch {
      // Revert if error
      loadData();
    }
  };

  const handleOpenExcuseModal = (record: AttendanceRecord) => {
    setSelectedRecordForExcuse(record);
    setIsExcuseModalOpen(true);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.member_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.stage_code && r.stage_code.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PRESENT') return r.status === 'PRESENT';
    if (statusFilter === 'ABSENT') return r.status === 'ABSENT';
    if (statusFilter === 'EXCUSED') return r.status === 'EXCUSED';
    return true;
  });

  if (loading && !session) {
    return <div className="text-center py-20 text-text-muted">جاري تحميل بيانات الجلسة...</div>;
  }

  if (!session) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-base font-semibold text-brand-red">لم يتم العثور على الجلسة المطلوبة</p>
        <button onClick={() => navigate('/attendance')} className="btn-secondary px-4 py-2 rounded-xl text-sm">
          العودة لقائمة الجلسات
        </button>
      </div>
    );
  }

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
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/attendance')}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text-primary transition"
            title="رجوع للجلسات"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <span className="bg-surface-3 px-2 py-0.5 rounded font-medium text-text-secondary">
                {session.unit_name || 'عام'}
              </span>
              <span>•</span>
              <span>{formattedDate} - {formattedTime}</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{session.title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {session.total_records === 0 && (
            <button
              onClick={handlePopulateMembers}
              disabled={populating}
              className="btn-secondary px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 text-gold-400 ${populating ? 'animate-spin' : ''}`} />
              <span>{populating ? 'جاري التعبئة...' : 'تعبئة أفراد الوحدة'}</span>
            </button>
          )}

          <button
            onClick={() => setIsScannerOpen(true)}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-gold-400/10 font-bold"
          >
            <QrCode className="w-5 h-5" />
            <span>مسح كود QR</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 flex flex-col justify-between">
          <span className="text-xs text-text-muted">إجمالي الأفراد</span>
          <p className="text-2xl font-bold text-text-primary mt-2">{session.total_records}</p>
        </div>
        <div className="card p-4 flex flex-col justify-between border-emerald-500/20 bg-emerald-500/5">
          <span className="text-xs text-emerald-400 font-medium">حاضر</span>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{session.present_count}</p>
        </div>
        <div className="card p-4 flex flex-col justify-between border-amber-500/20 bg-amber-500/5">
          <span className="text-xs text-amber-400 font-medium">بعذر</span>
          <p className="text-2xl font-bold text-amber-400 mt-2">{session.excused_count}</p>
        </div>
        <div className="card p-4 flex flex-col justify-between border-brand-red/20 bg-brand-red/5">
          <span className="text-xs text-brand-red font-medium">غائب</span>
          <p className="text-2xl font-bold text-brand-red mt-2">{session.absent_count}</p>
        </div>
        <div className="card p-4 flex flex-col justify-between border-gold-400/20 bg-gold-400/5 col-span-2 sm:col-span-1">
          <span className="text-xs text-gold-400 font-medium">نسبة الحضور</span>
          <p className="text-2xl font-bold text-gold-400 mt-2">{session.attendance_rate}%</p>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border p-3 rounded-2xl">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl">
          {[
            { key: 'ALL', label: `الكل (${records.length})` },
            { key: 'PRESENT', label: `حاضر (${session.present_count})` },
            { key: 'EXCUSED', label: `بعذر (${session.excused_count})` },
            { key: 'ABSENT', label: `غائب (${session.absent_count})` },
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

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث بالاسم أو كود الفرد..."
            className="w-full bg-surface-2 border border-border rounded-xl pr-9 pl-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-400 transition"
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="card overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16 text-text-muted space-y-3">
            <Users className="w-10 h-10 text-gold-400/40 mx-auto" />
            <p className="text-sm font-semibold text-text-primary">لا توجد سجلات مطابقة</p>
            {records.length === 0 && (
              <button
                onClick={handlePopulateMembers}
                className="btn-primary px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 mt-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تعبئة أفراد الوحدة الآن</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-2 border-b border-border text-text-muted font-medium">
                <tr>
                  <th className="py-3 px-4">الفرد</th>
                  <th className="py-3 px-4">الكود</th>
                  <th className="py-3 px-4">الفريق</th>
                  <th className="py-3 px-4">وقت التسجيل</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">العذر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((record) => {
                  return (
                    <tr key={record.id} className="hover:bg-surface-2/60 transition">
                      {/* Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {record.member_photo ? (
                            <img
                              src={record.member_photo}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center font-bold text-text-muted text-[11px] shrink-0 border border-border">
                              {record.member_name.slice(0, 2)}
                            </div>
                          )}
                          <span className="font-semibold text-text-primary text-sm">
                            {record.member_name}
                          </span>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4 text-text-muted font-mono font-medium">
                        {record.stage_code || '---'}
                      </td>

                      {/* Team / Patrol */}
                      <td className="py-3 px-4 text-text-secondary">
                        {record.team_name || 'عام'} {record.patrol_name ? `• ${record.patrol_name}` : ''}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 text-text-muted">
                        {record.check_in_time ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {new Date(record.check_in_time).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                        ) : (
                          '---'
                        )}
                      </td>

                      {/* Interactive Status Selector */}
                      <td className="py-3 px-4">
                        <div className="inline-flex rounded-xl p-0.5 bg-surface-3 border border-border">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(record.id, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                              record.status === 'PRESENT'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-text-muted hover:text-emerald-400'
                            }`}
                          >
                            حاضر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(record.id, 'EXCUSED')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                              record.status === 'EXCUSED'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-text-muted hover:text-amber-400'
                            }`}
                          >
                            بعذر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(record.id, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                              record.status === 'ABSENT'
                                ? 'bg-brand-red text-white shadow-sm'
                                : 'text-text-muted hover:text-brand-red'
                            }`}
                          >
                            غائب
                          </button>
                        </div>
                      </td>

                      {/* Excuse Action / Status */}
                      <td className="py-3 px-4">
                        {record.has_excuse ? (
                          <button
                            onClick={() => handleOpenExcuseModal(record)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition ${
                              record.excuse_status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : record.excuse_status === 'REJECTED'
                                ? 'bg-brand-red/10 text-brand-red border-brand-red/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            <span>
                              {record.excuse_status === 'APPROVED'
                                ? 'عذر معتمد'
                                : record.excuse_status === 'REJECTED'
                                ? 'عذر مرفوض'
                                : 'عذر معلق'}
                            </span>
                          </button>
                        ) : record.status === 'ABSENT' || record.status === 'EXCUSED' ? (
                          <button
                            onClick={() => handleOpenExcuseModal(record)}
                            className="text-text-muted hover:text-gold-400 text-[11px] font-medium flex items-center gap-1 transition"
                          >
                            <FileText className="w-3 h-3" />
                            <span>تقديم عذر</span>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {session && (
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            loadData();
          }}
          sessionId={session.id}
          sessionTitle={session.title}
          onScanSuccess={() => {
            // Live update the list and counts
            loadData();
          }}
        />
      )}

      {/* Excuse Modal */}
      <ExcuseModal
        isOpen={isExcuseModalOpen}
        onClose={() => {
          setIsExcuseModalOpen(false);
          setSelectedRecordForExcuse(null);
        }}
        record={selectedRecordForExcuse}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
