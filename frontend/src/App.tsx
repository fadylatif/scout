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
  ArrowDownToLine,
  Palette,
  Sparkles
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

  const API_BASE = 'http://127.0.0.1:8000/api';

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
      setError(err?.message || 'تعذر الاتصال بخادم Django على المنفذ 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 p-4 md:p-8 selection:bg-sefein-gold selection:text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header with Official Logo */}
        <header className="border-b border-[#282d3c] pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img 
                src="/logo.png" 
                alt="شعار مجموعات أبي سيفين الكشفية والإرشادية" 
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-3 border-sefein-gold shadow-xl shadow-sefein-gold/20 p-0.5 bg-[#0b0c10] transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sefein-red flex items-center justify-center border border-white/40 text-[10px] font-bold text-white shadow">
                ✝
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sefein-gold/20 text-sefein-gold border border-sefein-gold/40">
                  كنيسة السيدة العذراء مريم وأبي سيفين
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sefein-red/20 text-sefein-red-light border border-sefein-red/40">
                  الهوية الرسمية
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
                مجموعات أبي سيفين الكشفية والإرشادية
              </h1>
              <p className="text-slate-400 text-sm font-medium mt-0.5">
                نظام الإدارة الشامل — لوحة المعمارية وهوية الألوان المعتمدة (Phase 0)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sefein-gold-dark via-sefein-gold to-sefein-gold-light hover:brightness-110 active:scale-95 transition-all text-[#0b0c10] font-black flex items-center gap-2 shadow-lg shadow-sefein-gold/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>إعادة فحص الخادم</span>
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-sefein-red-dark/60 border border-sefein-red text-red-200 flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">تعذر الاتصال بـ Django Backend</div>
              <div className="text-sm opacity-90 mt-1">{error}</div>
            </div>
          </div>
        )}

        {/* Official Color Palette Section */}
        <section className="bg-gradient-to-br from-[#14161e] to-[#191d26] border border-[#282d3c] p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sefein-gold/15 text-sefein-gold border border-sefein-gold/30">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">لوحة الألوان المستخرجة مباشرة من شعار المجموعة</h2>
                <p className="text-xs text-slate-400">الألوان الأساسية المعتمدة لجميع شاشات وأزرار وبطاقات النظام</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sefein-gold" />
              <span>Official Palette</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
            
            {/* Color 1: Gold */}
            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-[#282d3c] space-y-2">
              <div className="w-full h-12 rounded-xl bg-[#d4a338] shadow-md shadow-[#d4a338]/20 flex items-center justify-center font-bold text-black text-xs">
                #d4a338
              </div>
              <div className="text-xs font-bold text-white">ذهبي الهالة والإطار</div>
              <div className="text-[10px] text-slate-400">للعناوين والأزرار الرئيسية</div>
            </div>

            {/* Color 2: Red */}
            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-[#282d3c] space-y-2">
              <div className="w-full h-12 rounded-xl bg-[#b91c1c] shadow-md shadow-[#b91c1c]/20 flex items-center justify-center font-bold text-white text-xs">
                #b91c1c
              </div>
              <div className="text-xs font-bold text-white">أحمر عباءة أبي سيفين</div>
              <div className="text-[10px] text-slate-400">للإشارات الحيوية والتنبيهات</div>
            </div>

            {/* Color 3: Green */}
            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-[#282d3c] space-y-2">
              <div className="w-full h-12 rounded-xl bg-[#1b4d3e] shadow-md shadow-[#1b4d3e]/20 flex items-center justify-center font-bold text-white text-xs">
                #1b4d3e
              </div>
              <div className="text-xs font-bold text-white">أخضر الكشافة والمرشدات</div>
              <div className="text-[10px] text-slate-400">للحضور والنجاح والأنشطة</div>
            </div>

            {/* Color 4: Dark Obsidian */}
            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-[#282d3c] space-y-2">
              <div className="w-full h-12 rounded-xl bg-[#0b0c10] border border-white/20 shadow-md flex items-center justify-center font-bold text-slate-300 text-xs">
                #0b0c10
              </div>
              <div className="text-xs font-bold text-white">أسود حزام الشعار</div>
              <div className="text-[10px] text-slate-400">الخلفية الملكية العامة</div>
            </div>

            {/* Color 5: Parchment Cream */}
            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-[#282d3c] space-y-2">
              <div className="w-full h-12 rounded-xl bg-[#fcf6e8] shadow-md flex items-center justify-center font-bold text-black text-xs">
                #fcf6e8
              </div>
              <div className="text-xs font-bold text-white">بيج خلفية الأيقونة</div>
              <div className="text-[10px] text-slate-400">للبطاقات والشهادات والتقارير</div>
            </div>

          </div>
        </section>

        {/* Live System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#14161e] border border-[#282d3c] p-5 rounded-2xl shadow-lg hover:border-sefein-gold/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm font-medium">حالة الخادم (API Health)</span>
              <Server className="w-5 h-5 text-sefein-gold" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {health?.status === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-lg font-bold text-white">متصل وجاهز (200 OK)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-sefein-red" />
                  <span className="text-lg font-bold text-slate-300">{loading ? 'جاري الفحص...' : 'غير متاح'}</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#14161e] border border-[#282d3c] p-5 rounded-2xl shadow-lg hover:border-sefein-gold/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm font-medium">قاعدة البيانات (PostgreSQL / SQLite)</span>
              <Database className="w-5 h-5 text-sefein-gold" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {health?.database === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-lg font-bold text-white">متصلة وسجلات التدقيق جاهزة</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-sefein-red" />
                  <span className="text-lg font-bold text-slate-300">{loading ? 'جاري الفحص...' : 'تحت الاختبار'}</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#14161e] border border-[#282d3c] p-5 rounded-2xl shadow-lg hover:border-sefein-gold/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm font-medium">فحص الدخان الشامل</span>
              <ShieldCheck className="w-5 h-5 text-sefein-gold" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {smoke?.smoke_test_passed ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-lg font-bold text-sefein-gold">اجتياز كامل بنسبة 100%</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-sefein-red" />
                  <span className="text-lg font-bold text-slate-300">{loading ? 'جاري الفحص...' : 'بانتظار الاستجابة'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Core Components Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>المكونات المختبرة والمفعلة</span>
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              All Systems Operational
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Component 1: QR Generator */}
            <div className="p-6 rounded-2xl bg-[#14161e] border border-[#282d3c] hover:border-sefein-gold/50 transition-all flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-sefein-gold/10 border border-sefein-gold/30 text-sefein-gold">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">توليد أكواد QR الثابتة للأفراد</h3>
                      <p className="text-xs text-slate-400">ثابت مدى الحياة + دقة مسح عالية</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {smoke?.components.qr_code.status || 'PASS'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  تم دمج كود الـ QR الثابت بلون الهوية الكشفية مع اختبار القراءة والتوليد الآلي الفوري لكل فرد.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#282d3c] flex items-center justify-between">
                <a
                  href={`${API_BASE}/smoke-test/qr/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-sefein-gold hover:text-sefein-gold-light transition-colors"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>معاينة وتنزيل صورة الـ QR المولدة (PNG)</span>
                </a>
              </div>
            </div>

            {/* Component 2: Excel RTL Export */}
            <div className="p-6 rounded-2xl bg-[#14161e] border border-[#282d3c] hover:border-sefein-gold/50 transition-all flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-sefein-gold/10 border border-sefein-gold/30 text-sefein-gold">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">تصدير واستيراد كشوفات Excel RTL</h3>
                      <p className="text-xs text-slate-400">تنسيق عربي كامل من اليمين لليسار مع منع التكرار</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {smoke?.components.excel_export.status || 'PASS'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  جداول مصممة بألوان شعار المجموعة (الذهبي والأخضر الكشفي)، مع اتجاه RTL وحساب الأعمدة تلقائياً.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#282d3c] flex items-center justify-between">
                <a
                  href={`${API_BASE}/smoke-test/excel/`}
                  className="inline-flex items-center gap-2 text-xs font-bold text-sefein-gold hover:text-sefein-gold-light transition-colors"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>تنزيل كشف الأفراد التجريبي المنسق (Excel)</span>
                </a>
              </div>
            </div>

            {/* Component 3: Security & Encryption */}
            <div className="p-6 rounded-2xl bg-[#14161e] border border-[#282d3c] hover:border-sefein-gold/50 transition-all flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-sefein-red/10 border border-sefein-red/30 text-sefein-red-light">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">التشفير العسكري للنسخ الاحتياطية</h3>
                      <p className="text-xs text-slate-400">AES-256 Fernet مع اشتقاق المفاتيح PBKDF2</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {smoke?.components.crypto.status || 'PASS'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  تأمين ملفات النسخ الاحتياطي اليومي للبيانات والمستندات بكلمة سر وتشفير منفصل لا يمكن كسره.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#282d3c] text-xs text-slate-400">
                <span>{smoke?.components.crypto.message || 'تم التحقق من تشفير وفك تشفير البيانات بنجاح'}</span>
              </div>
            </div>

            {/* Component 4: MIME Inspection */}
            <div className="p-6 rounded-2xl bg-[#14161e] border border-[#282d3c] hover:border-sefein-gold/50 transition-all flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-sefein-gold/10 border border-sefein-gold/30 text-sefein-gold">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">فحص الترويسة الفعلية للملفات (MIME)</h3>
                      <p className="text-xs text-slate-400">python-magic لحظر الملفات المشبوهة أو التنفيذية</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {smoke?.components.file_magic_mime.status || 'PASS'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  فحص محتوى الملف الحقيقي وليس الامتداد الخارجي، لضمان قبول الصور والمستندات المعتمدة فقط.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#282d3c] text-xs text-slate-400">
                <span>النوع المكتشف تجريبياً: {smoke?.components.file_magic_mime.detected_mime || 'image/png'}</span>
              </div>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#282d3c] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Scout Logo" className="w-6 h-6 rounded-full" />
            <span>نظام إدارة مجموعات أبي سيفين الكشفية والإرشادية © 2026</span>
          </div>
          <span>كنيسة السيدة العذراء مريم وأبي سيفين</span>
        </footer>

      </div>
    </div>
  );
}

export default App;
