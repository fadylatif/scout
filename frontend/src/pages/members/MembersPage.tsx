import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Download, Upload, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { MemberFormModal } from '../../components/members/MemberFormModal';
import { membersApi } from '../../api/members';
import { useAuth } from '../../store/authStore';
import type { Member, PaginatedResponse } from '../../types';

const PAGE_SIZE = 20;

export function MembersPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<Member> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Permissions
  const perms = user?.permission?.permissions as Record<string, Record<string, boolean>> | undefined;
  const isAdmin = user?.role === 'ADMIN';
  const canAdd = isAdmin || perms?.members?.add;
  const canEdit = isAdmin || perms?.members?.edit;
  const canDelete = isAdmin || perms?.members?.delete;
  const canExport = isAdmin || perms?.members?.export;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await membersApi.list({ page, search: search || undefined });
      setData(res.data);
    } catch { /* handle */ }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(fetchMembers, 300);
    return () => clearTimeout(t);
  }, [fetchMembers]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await membersApi.exportExcel();
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'members_export.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await membersApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchMembers();
    } finally { setDeleting(false); }
  };

  const openEdit = (m: Member) => { setEditMember(m); setFormOpen(true); };
  const openNew = () => { setEditMember(null); setFormOpen(true); };

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary">الأفراد</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {data ? `${data.count} فرد مسجل` : 'جاري التحميل...'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canExport && (
            <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
              <Download className="w-4 h-4" />
              <span>تصدير Excel</span>
            </Button>
          )}
          {canAdd && (
            <Link to="/members/import">
              <Button variant="secondary" size="sm">
                <Upload className="w-4 h-4" />
                <span>استيراد</span>
              </Button>
            </Link>
          )}
          {canAdd && (
            <Button size="sm" onClick={openNew}>
              <Plus className="w-4 h-4" />
              <span>فرد جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="بحث بالاسم أو الكود أو الهاتف..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          rightIcon={<Search className="w-4 h-4" />}
          aria-label="بحث في الأفراد"
        />
      </div>

      {/* Table */}
      <Card>
        <div className="table-responsive">
          <table className="w-full text-sm" role="table" aria-label="جدول الأفراد">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-right text-text-muted font-semibold">الاسم</th>
                <th className="px-4 py-3 text-right text-text-muted font-semibold hidden md:table-cell">الكود</th>
                <th className="px-4 py-3 text-right text-text-muted font-semibold hidden lg:table-cell">الفريق</th>
                <th className="px-4 py-3 text-right text-text-muted font-semibold hidden lg:table-cell">المرحلة</th>
                <th className="px-4 py-3 text-right text-text-muted font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right text-text-muted font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Spinner className="mx-auto" /></td></tr>
              ) : data?.results.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-text-muted">لا توجد نتائج</td></tr>
              ) : (
                data?.results.map((member) => (
                  <tr key={member.id} className="border-b border-border hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center shrink-0 overflow-hidden">
                          {member.photo
                            ? <img src={member.photo} alt="" className="w-full h-full object-cover" />
                            : <span className="text-text-muted text-xs font-bold">{member.full_name[0]}</span>
                          }
                        </div>
                        <span className="font-medium text-text-primary">{member.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {member.stage_code ? <Badge variant="gold">{member.stage_code}</Badge> : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">{member.team_name ?? '—'}</td>
                    <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">{member.stage_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={member.is_active ? 'success' : 'error'}>
                        {member.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/members/${member.id}`}
                          className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted hover:text-gold-400 transition-colors"
                          aria-label={`عرض ${member.full_name}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canEdit && (
                          <button onClick={() => openEdit(member)}
                            className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted hover:text-gold-400 transition-colors"
                            aria-label={`تعديل ${member.full_name}`}>
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteTarget(member)}
                            className="p-1.5 rounded-lg hover:bg-brand-red/10 text-text-muted hover:text-brand-red transition-colors"
                            aria-label={`حذف ${member.full_name}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">صفحة {page} من {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Member Form Modal */}
      <MemberFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchMembers}
        member={editMember}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="حذف الفرد"
        message={`هل أنت متأكد من حذف "${deleteTarget?.full_name}"؟ سيتم الحذف المنطقي ويمكن استرجاعه لاحقاً.`}
        confirmLabel="حذف"
      />
    </div>
  );
}
