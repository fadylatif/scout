import { useEffect, useState } from 'react';
import { Users, Building2, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { membersApi } from '../../api/members';
import { structureApi } from '../../api/structure';
import { useAuth } from '../../store/authStore';
import type { Member } from '../../types';

interface Stats {
  totalMembers: number;
  activeTeams: number;
  totalGroups: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, activeTeams: 0, totalGroups: 0 });
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [membersRes, teamsRes, groupsRes] = await Promise.allSettled([
          membersApi.list({ page: 1 }),
          structureApi.teams(),
          structureApi.groups(),
        ]);

        if (membersRes.status === 'fulfilled') {
          setStats((s) => ({ ...s, totalMembers: membersRes.value.data.count }));
          setRecentMembers(membersRes.value.data.results.slice(0, 5));
        }
        if (teamsRes.status === 'fulfilled') {
          setStats((s) => ({ ...s, activeTeams: teamsRes.value.data.length }));
        }
        if (groupsRes.status === 'fulfilled') {
          setStats((s) => ({ ...s, totalGroups: groupsRes.value.data.length }));
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const statCards = [
    {
      label: 'إجمالي الأفراد',
      value: stats.totalMembers,
      icon: <Users className="w-6 h-6" />,
      color: 'text-gold-400',
      bg: 'bg-gold-400/10',
    },
    {
      label: 'الفرق النشطة',
      value: stats.activeTeams,
      icon: <Building2 className="w-6 h-6" />,
      color: 'text-brand-green',
      bg: 'bg-brand-green/10',
    },
    {
      label: 'المجموعات',
      value: stats.totalGroups,
      icon: <ShieldCheck className="w-6 h-6" />,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'نسبة الاكتمال',
      value: '—',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary">
          أهلاً، {user?.full_name ?? 'بك'}
        </h1>
        <p className="text-text-muted text-sm mt-1">لوحة التحكم الرئيسية — نظرة عامة على النظام</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label} hover>
                <CardContent>
                  <div className="flex items-start justify-between pt-4">
                    <div>
                      <p className="text-text-muted text-xs font-medium">{stat.label}</p>
                      <p className="text-3xl font-black text-text-primary mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Members */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-bold text-text-primary">آخر الأفراد المضافين</h2>
            </CardHeader>
            <CardContent>
              {recentMembers.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-6">لا توجد بيانات بعد</p>
              ) : (
                <div className="divide-y divide-border">
                  {recentMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center shrink-0 overflow-hidden">
                          {member.photo ? (
                            <img src={member.photo} alt={member.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-text-muted text-sm font-bold">
                              {member.full_name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{member.full_name}</p>
                          <p className="text-xs text-text-muted">{member.team_name ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.stage_code && (
                          <Badge variant="gold">{member.stage_code}</Badge>
                        )}
                        <Badge variant={member.is_active ? 'success' : 'error'}>
                          {member.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
