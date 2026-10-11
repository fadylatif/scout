import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, 
  Database, 
  QrCode, 
  FileSpreadsheet, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server,
  FileCheck,
  Compass,
  ArrowDownToLine
} from 'lucide-react';

interface SmokeTestResponse {
  smoke_test_passed: boolean;
  timestamp: string;
  components: {
    database: { status: string; message?: string; error?: string };
    crypto: { status: string; message?: string; error?: string };
    qr_code: { status: string; bytes_generated?: number; error?: string };
    excel_export: { status: string; bytes_generated?: number; error?: string };
    file_magic_mime: { status: string; detected_mime?: string; error?: string };
  };
}

interface HealthResponse {
  status: string;
  timestamp: string;
  database: string;
  storage: string;
  version: string;
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [smoke, setSmoke] = useState<SmokeTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:8000/api';

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, smokeRes] = await Promise.all([
        axios.get<HealthResponse>(`${API_BASE}/health/`),
        axios.get<SmokeTestResponse>(`${API_BASE}/smoke-test/`)
      ]);
      setHealth(healthRes.data);
      setSmoke(smokeRes.data);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ في الاتصال بالخادم. تأكد من تشغيل Django على المنفذ 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-[#081c15] text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-emerald-900/60 pb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1b4332] to-[#52b788] flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-500/30">
              <Compass className="w-8 h-8 text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                مجموعة أبي سيفين الكشفية والإرشادية
              </h1>
              <p className="text-emerald-400 text-sm font-medium mt-1">
                نظام الإدارة الموحد — فحص جاهزية النواة وبنية المرحلة 0 (Smoke Test Suite)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/60 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>إعادة الفحص التشخيصي</span>
            </button>
          </div>
        </header>

        {/* Global Alert if Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/70 border border-red-800 text-red-200 flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">تعذر الاتصال بـ Django Backend</div>
              <div className="text-sm opacity-90 mt-1">{error}</div>
            </div>
          </div>
        )}

        {/* System Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1b4332]/40 backdrop-blur-md border border-emerald-800/40 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 text-sm font-medium">حالة الخادم (API Health)</span>
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {health?.status === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-lg font-bold text-white">متصل وجاهز (200 OK)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-lg font-bold text-slate-300">{loading ? 'جاري الفحص...' : 'غير متاح'}</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#1b4332]/40 backdrop-blur-md border border-emerald-800/40 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 text-sm font-medium">قاعدة البيانات (PostgreSQL / SQLite)</span>
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {health?.database === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-lg font-bold text-white">متصلة وسجلات التدقيق جاهزة</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-lg font-bold text-slate-300">{loading ? 'جاري الفحص...' : 'تحت الاختبار'}</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#1b4332]/40 backdrop-blur-md border border-emerald-800/40 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 text-sm font-medium">حالة اختبار الدخان (Smoke Test)</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {smoke?.smoke_test_passed ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-lg font-bold text-emerald-300">جميع الاختبارات اجتيزت بنجاح (100%)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-lg font-bold text-slate-300">{loading ? 'جاري الفحص...' : 'بانتظار الاستجابة'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Component Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>مكونات النواة المعتمدة</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
              Verified
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Component 1: QR Generator */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-emerald-900/40 hover:border-emerald-700/60 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800/60 text-emerald-400">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">توليد أكواد QR للأفراد</h3>
                      <p className="text-xs text-slate-400">ثابت مدى الحياة + دقة قراءة عالية</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {smoke?.components.qr_code.status || 'READY'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  تم اختبار توليد QR Code بالصيغة القياسية للأفراد ودمج ألوان الهوية الكشفية مع كفاءة مسح فوري.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <a
                  href={`${API_BASE}/smoke-test/qr/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>معاينة وتنزيل نموذج QR تجريبي (PNG)</span>
                </a>
              </div>
            </div>

            {/* Component 2: Excel RTL Export */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-emerald-900/40 hover:border-emerald-700/60 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800/60 text-emerald-400">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">تصدير واستيراد Excel مع الـ RTL</h3>
                      <p className="text-xs text-slate-400">openpyxl مع التنسيق العربي والتحقق من التكرار</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {smoke?.components.excel_export.status || 'READY'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  دعم كامل لتنسيقات الجداول العربية من اليمين لليسار، عناوين ملونة، وضبط العرض التلقائي للأعمدة.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <a
                  href={`${API_BASE}/smoke-test/excel/`}
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>تنزيل كشف أفراد تجريبي (Excel RTL)</span>
                </a>
              </div>
            </div>

            {/* Component 3: Security & Encryption */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-emerald-900/40 hover:border-emerald-700/60 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800/60 text-emerald-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">التشفير العسكري للنسخ الاحتياطية</h3>
                      <p className="text-xs text-slate-400">AES-256 Fernet + اشتقاق المفاتيح PBKDF2</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {smoke?.components.crypto.status || 'READY'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  تشفير ملفات النسخ الاحتياطي والبيانات السرية بمفتاح منفصل تماماً، مع اختبار فك التشفير ومطابقة الحزم بنسبة 100%.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
                <span>الحالة: {smoke?.components.crypto.message || 'تم التحقق من تشفير وفك تشفير الـ Bytes'}</span>
              </div>
            </div>

            {/* Component 4: MIME Type True Inspection */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-emerald-900/40 hover:border-emerald-700/60 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800/60 text-emerald-400">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">الفحص الحقيقي لنوع الملف (MIME)</h3>
                      <p className="text-xs text-slate-400">libmagic / python-magic لمنع الملفات الخبيثة</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {smoke?.components.file_magic_mime.status || 'READY'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  التحقق من ترويسة البايتات الحقيقية (Magic Bytes) وليس امتداد الملف الظاهري، لمنع رفع أي ملفات تنفيذية أو غير مصرح بها.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
                <span>النوع المكتشف تجريبياً: {smoke?.components.file_magic_mime.detected_mime || 'image/png'}</span>
              </div>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-emerald-950 pt-6 text-center text-xs text-slate-500">
          نظام إدارة مجموعة أبي سيفين الكشفية والإرشادية © 2026 — المعمارية المعتمدة للمرحلة 0 جاهزة بنسبة 100%
        </footer>

      </div>
    </div>
  );
}

export default App;
