import { useState } from 'react';
import {
  BarChart3,
  FileDown,
  Users,
  ClipboardCheck,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { structureApi } from '../../api/structure';
import { useEffect } from 'react';
import type { Stage, Team } from '../../types';
import api from '../../lib/api';

// ─── Report Runner ────────────────────────────────────────────────────────────

interface ReportConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  filename: string;
  color: string;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'members',
    label: 'تقرير الأفراد',
    description: 'قائمة كاملة بجميع الأفراد مع بياناتهم الأساسية',
    icon: <Users className="w-6 h-6" />,
    endpoint: '/reports/reports/generate-members',
    filename: 'members_report.xlsx',
    color: 'text-blue-400 bg-blue-400/10',
  },
  {
    id: 'attendance',
    label: 'تقرير الحضور',
    description: 'إحصائيات الحضور والغياب والأعذار',
    icon: <ClipboardCheck className="w-6 h-6" />,
    endpoint: '/reports/reports/generate-members',
    filename: 'attendance_report.xlsx',
    color: 'text-green-400 bg-green-400/10',
  },
  {
    id: 'advancement',
    label: 'تقرير التقدم والشارات',
    description: 'إنجازات الأفراد في الشارات والرتب',
    icon: <TrendingUp className="w-6 h-6" />,
    endpoint: '/reports/reports/generate-members',
    filename: 'advancement_report.xlsx',
    color: 'text-amber-400 bg-amber-400/10',
  },
];

async function downloadReport(endpoint: string, filename: string, params?: Record<string, string>) {
  const res = await api.get(endpoint, { params, responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    structureApi.stages().then((r) => setStages(r.data));
    structureApi.teams().then((r) => setTeams(r.data));
  }, []);

  const handleDownload = async (report: ReportConfig) => {
    setDownloading(report.id);
    try {
      const params: Record<string, string> = {};
      if (selectedStage) params.stage = selectedStage;
      if (selectedTeam) params.team = selectedTeam;
      await downloadReport(report.endpoint, report.filename, params);
    } catch {
      // silent
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-gold-400" />
          التقارير
        </h1>
        <p className="text-text-muted text-sm mt-1">توليد وتصدير التقارير بصيغة Excel</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Filter className="w-4 h-4 text-gold-400" />
            فلاتر التقرير
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">المرحلة</label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400"
              >
                <option value="">كل المراحل</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">الفريق</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400"
              >
                <option value="">كل الفرق</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <Card key={report.id} hover className="!p-0">
            <CardContent>
              <div className={`inline-flex p-3 rounded-xl mt-4 mb-3 ${report.color}`}>
                {report.icon}
              </div>
              <h3 className="text-base font-bold text-text-primary">{report.label}</h3>
              <p className="text-sm text-text-muted mt-1 mb-4">{report.description}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                loading={downloading === report.id}
                onClick={() => handleDownload(report)}
              >
                <FileDown className="w-4 h-4" />
                تنزيل Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <div className="p-4 bg-surface-3 rounded-2xl border border-border text-sm text-text-muted">
        <p className="font-semibold text-text-secondary mb-1">ملاحظة:</p>
        <ul className="space-y-1 list-disc list-inside text-xs">
          <li>التقارير تُولَّد لحظياً وتتضمن أحدث البيانات</li>
          <li>يمكن تخصيص التقارير باختيار مرحلة أو فريق محدد</li>
          <li>كل عملية تنزيل تُسجَّل في سجل التدقيق</li>
        </ul>
      </div>
    </div>
  );
}
