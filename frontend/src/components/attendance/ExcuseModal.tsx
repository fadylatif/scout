import React, { useState } from 'react';
import { X, FileText, Check, Ban, Upload, AlertCircle } from 'lucide-react';
import { attendanceApi } from '../../api/attendance';
import type { AttendanceRecord } from '../../types/attendance';

interface ExcuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSuccess: () => void;
  canApprove?: boolean;
}

export function ExcuseModal({
  isOpen,
  onClose,
  record,
  onSuccess,
  canApprove = true,
}: ExcuseModalProps) {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleSubmitExcuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('يرجى كتابة سبب العذر.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('record', record.id);
      fd.append('reason', reason.trim());
      if (file) {
        fd.append('document', file);
      }
      await attendanceApi.submitExcuse(fd);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء حفظ العذر.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!record.excuse_id) return;
    setLoading(true);
    setError(null);
    try {
      await attendanceApi.approveExcuse(record.excuse_id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'تعذر اعتماد العذر.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!record.excuse_id || !rejectionReason.trim()) {
      setError('يجب تحديد سبب الرفض.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await attendanceApi.rejectExcuse(record.excuse_id, rejectionReason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'تعذر رفض العذر.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold-400" />
            <h2 className="text-base font-bold text-text-primary">
              {record.has_excuse ? 'مراجعة عذر الغياب' : 'تقديم عذر غياب'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member info */}
        <div className="p-4 bg-surface-3/50 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-text-primary">{record.member_name}</p>
            <p className="text-xs text-text-muted">كود: {record.stage_code || '---'}</p>
          </div>
          {record.has_excuse && record.excuse_status && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                record.excuse_status === 'APPROVED'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : record.excuse_status === 'REJECTED'
                  ? 'bg-brand-red/10 text-brand-red'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {record.excuse_status === 'APPROVED'
                ? 'معتمد'
                : record.excuse_status === 'REJECTED'
                ? 'مرفوض'
                : 'قيد الانتظار'}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl border bg-brand-red/10 border-brand-red/30 text-brand-red text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {record.has_excuse ? (
            /* Review Existing Excuse */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-muted">سبب العذر:</label>
                <div className="p-3 mt-1 bg-surface-2 rounded-xl text-sm text-text-primary border border-border">
                  {record.excuse_reason || 'لا يوجد نص محدد'}
                </div>
              </div>

              {showRejectInput && (
                <div className="pt-2 space-y-2">
                  <label className="text-xs font-medium text-brand-red">سبب الرفض:</label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="اكتب سبب رفض العذر هنا ليظهر للمسؤول..."
                    className="w-full bg-surface-2 border border-brand-red/40 rounded-xl p-2.5 text-sm text-text-primary focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={loading || !rejectionReason.trim()}
                      className="bg-brand-red text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      تأكيد الرفض
                    </button>
                  </div>
                </div>
              )}

              {canApprove && !showRejectInput && record.excuse_status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعتماد العذر</span>
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={loading}
                    className="flex-1 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/30 font-medium text-sm py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Ban className="w-4 h-4" />
                    <span>رفض العذر</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Submit New Excuse */
            <form onSubmit={handleSubmitExcuse} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  سبب الغياب / العذر:
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: سفر عائلي، ظروف مرضية..."
                  className="w-full bg-surface-2 border border-border rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-gold-400 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  مستند العذر (اختياري - تقرير طبي / إذن):
                </label>
                <div className="relative border border-dashed border-border rounded-xl p-3 text-center hover:bg-surface-2 transition cursor-pointer">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1 text-text-muted">
                    <Upload className="w-5 h-5 text-gold-400" />
                    <span className="text-xs">
                      {file ? file.name : 'اضغط لاختيار ملف أو اسحبه هنا'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary px-4 py-2 rounded-xl text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50"
                >
                  {loading ? 'جاري الحفظ...' : 'إرسال العذر'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
