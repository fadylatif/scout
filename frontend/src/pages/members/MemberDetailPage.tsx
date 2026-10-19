import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Clock, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { membersApi } from '../../api/members';
import type { Member } from '../../types';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    membersApi
      .get(id)
      .then((res) => setMember(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p>الفرد غير موجود</p>
        <Button variant="ghost" className="mt-4">
            <Link to="/members">العودة للقائمة</Link>
          </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        to="/members"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowRight className="w-4 h-4 icon-directional" />
        العودة للأفراد
      </Link>

      {/* Header Card */}
      <Card gold>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-surface-3 border border-border overflow-hidden shrink-0">
              {member.photo ? (
                <img src={member.photo} alt={member.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gold-400">
                  {member.full_name[0]}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-text-primary">{member.full_name}</h1>
                {member.stage_code && <Badge variant="gold">{member.stage_code}</Badge>}
                <Badge variant={member.is_active ? 'success' : 'error'}>
                  {member.is_active ? 'نشط' : 'غير نشط'}
                </Badge>
                <Badge variant="default">{member.gender === 'M' ? 'ذكر' : 'أنثى'}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-text-muted mt-2">
                {member.group_name && <span>المجموعة: {member.group_name}</span>}
                {member.stage_name && <span>المرحلة: {member.stage_name}</span>}
                {member.team_name && <span>الفريق: {member.team_name}</span>}
                {member.patrol_name && <span>الطابور: {member.patrol_name}</span>}
              </div>
            </div>

            {/* QR */}
            {member.qr_image && (
              <div className="shrink-0">
                <img
                  src={member.qr_image}
                  alt="QR Code"
                  className="w-20 h-20 rounded-xl border border-border"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-bold text-text-primary">البيانات الشخصية</h2>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[
                { label: 'تاريخ الميلاد', value: member.date_of_birth },
                { label: 'رقم الهاتف', value: member.phone },
                { label: 'هاتف ولي الأمر', value: member.guardian_phone },
                { label: 'العنوان', value: member.address },
              ].map(
                ({ label, value }) =>
                  value && (
                    <div key={label} className="flex justify-between">
                      <dt className="text-text-muted">{label}</dt>
                      <dd className="text-text-primary font-medium">{value}</dd>
                    </div>
                  )
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Code History */}
        {member.code_history && member.code_history.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-400" />
                <h2 className="text-base font-bold text-text-primary">سجل الأكواد السابقة</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {member.code_history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
                  >
                    <Badge variant="default">{h.old_code}</Badge>
                    <span className="text-text-muted text-xs">{h.changed_at.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Log */}
        {member.transfer_logs && member.transfer_logs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-gold-400" />
                <h2 className="text-base font-bold text-text-primary">سجل الانتقالات</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {member.transfer_logs.map((t) => (
                  <div key={t.id} className="text-sm border-b border-border last:border-0 pb-2">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span>{t.from_team_name ?? '—'}</span>
                      <ArrowLeftRight className="w-3 h-3 shrink-0" />
                      <span className="font-semibold text-text-primary">{t.to_team_name ?? '—'}</span>
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">{t.transferred_at.slice(0, 10)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
