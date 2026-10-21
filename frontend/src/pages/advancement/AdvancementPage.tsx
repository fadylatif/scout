import { useState, useEffect, useCallback } from 'react';
import { Award, CheckCircle2, Circle, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import api from '../../lib/api';
import type { Badge as BadgeType, AdvancementRecord } from '../../types/modules';

// ─── API ──────────────────────────────────────────────────────────────────────

const advancementApi = {
  badges: () => api.get<BadgeType[]>('/advancement/badges/'),
  memberProgress: (memberId: string) =>
    api.get<AdvancementRecord[]>(`/advancement/records/member/${memberId}/`),
  allRecords: (params?: { member?: string }) =>
    api.get<AdvancementRecord[]>('/advancement/records/', { params }),
  markComplete: (recordId: string) =>
    api.post('/advancement/records/mark-complete/', { record_id: recordId }),
};

// ─── Badge Card ───────────────────────────────────────────────────────────────

interface BadgeCardProps {
  badge: BadgeType;
  records: AdvancementRecord[];
  onMarkComplete: (recordId: string) => void;
}

function BadgeCard({ badge, records, onMarkComplete }: BadgeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const requirements = badge.requirements ?? [];
  const completed = records.filter((r) => r.is_completed).length;
  const total = requirements.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="!p-0">
      <CardContent>
        <div
          className="flex items-center gap-3 pt-4 pb-3 cursor-pointer select-none"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center shrink-0">
            {badge.icon ? (
              <img src={badge.icon} alt={badge.name} className="w-8 h-8 object-cover rounded-lg" />
            ) : (
              <Award className="w-5 h-5 text-gold-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-text-primary">{badge.name}</p>
              {badge.is_rank && (
                <Badge variant="gold">
                  <Star className="w-3 h-3" />
                  رتبة
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: pct === 100 ? '#22c55e' : '#f5b800',
                  }}
                />
              </div>
              <span className="text-xs text-text-muted font-semibold shrink-0">
                {completed}/{total}
              </span>
            </div>
          </div>
          <div className="text-text-muted">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {expanded && requirements.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2 pb-2">
            {requirements.map((req) => {
              const rec = records.find((r) => r.requirement === req.id);
              const done = rec?.is_completed ?? false;
              return (
                <div key={req.id} className="flex items-start gap-2.5 group">
                  <button
                    onClick={() => !done && rec && onMarkComplete(rec.id)}
                    disabled={done || !rec}
                    className={`mt-0.5 shrink-0 transition-colors ${
                      done ? 'text-green-400' : 'text-text-muted hover:text-gold-400'
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {req.title}
                      {req.is_mandatory && (
                        <span className="mr-1 text-[9px] font-bold text-red-400/70 bg-red-400/10 px-1 rounded">إلزامي</span>
                      )}
                    </p>
                    {req.description && (
                      <p className="text-xs text-text-muted mt-0.5">{req.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AdvancementPage() {
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [records, setRecords] = useState<AdvancementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'RANK' | 'BADGE'>('ALL');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [badgesRes, recordsRes] = await Promise.all([
        advancementApi.badges(),
        advancementApi.allRecords(),
      ]);
      setBadges(badgesRes.data);
      setRecords(recordsRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleMarkComplete = async (recordId: string) => {
    try {
      await advancementApi.markComplete(recordId);
      setRecords((prev) =>
        prev.map((r) => r.id === recordId ? { ...r, is_completed: true } : r)
      );
    } catch {
      // silent
    }
  };

  const totalCompleted = records.filter((r) => r.is_completed).length;
  const totalRequirements = records.length;

  const filtered = badges.filter((b) =>
    filter === 'ALL' ? true : filter === 'RANK' ? b.is_rank : !b.is_rank
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
          <Award className="w-6 h-6 text-gold-400" />
          التقدم والشارات
        </h1>
        <p className="text-text-muted text-sm mt-1">متابعة إنجازات الأفراد في الشارات والرتب</p>
      </div>

      {/* Overall progress */}
      {!loading && totalRequirements > 0 && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2 pt-3">
              <p className="text-sm font-bold text-text-primary">الإنجاز الإجمالي</p>
              <span className="text-sm font-black text-gold-400">
                {Math.round((totalCompleted / totalRequirements) * 100)}%
              </span>
            </div>
            <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-l from-amber-400 to-yellow-300 transition-all duration-700"
                style={{ width: `${Math.round((totalCompleted / totalRequirements) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">{totalCompleted} من {totalRequirements} متطلب مكتمل</p>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        {([['ALL', 'الكل'], ['RANK', 'الرتب'], ['BADGE', 'الشارات']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filter === val
                ? 'bg-gold-400/15 text-gold-400 border-gold-400/30'
                : 'bg-surface text-text-muted border-border hover:bg-surface-3'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Badges list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد شارات بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              records={records.filter((r) =>
                badge.requirements?.some((req) => req.id === r.requirement)
              )}
              onMarkComplete={handleMarkComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
