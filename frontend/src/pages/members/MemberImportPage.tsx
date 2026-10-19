import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { membersApi } from '../../api/members';

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'CONFIRM' | 'RESULT';

interface ImportRow {
  row_number: number;
  full_name: string;
  stage_code: string | null;
  action: 'CREATE' | 'UPDATE' | 'CONFLICT' | 'ERROR';
  errors: string[];
  warnings: string[];
  data: any;
}

export function MemberImportPage() {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teamNameInput, setTeamNameInput] = useState('فريق النسور');

  const handleDownloadTemplate = async () => {
    try {
      const res = await membersApi.importTemplate(teamNameInput);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `import_template_${teamNameInput}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setLoading(true);
    try {
      const res = await membersApi.importPreview(uploadedFile);
      setRows(res.data.rows);
      setSummary(res.data.summary);
      setStep('PREVIEW');
    } catch (e: any) {
      alert(e.response?.data?.detail || 'حدث خطأ أثناء قراءة الملف');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    try {
      const res = await membersApi.importConfirm(rows, skipErrors);
      setImportResult(res.data);
      setStep('RESULT');
    } catch (e: any) {
      alert(e.response?.data?.detail || 'حدث خطأ أثناء الاستيراد');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrors = async () => {
    const errorRows = rows.filter(r => r.action === 'ERROR');
    try {
      const res = await membersApi.importErrorsDownload(errorRows);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'import_errors.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-2xl font-black text-text-primary">استيراد الأفراد</h1>
          <p className="text-text-muted text-sm">استيراد بيانات الأفراد من ملف Excel</p>
        </div>
        <Link to="/members">
          <Button variant="outline" size="sm"><ArrowRight className="w-4 h-4 ml-2" /> العودة للقائمة</Button>
        </Link>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 py-4" dir="rtl">
        {(['UPLOAD', 'PREVIEW', 'CONFIRM', 'RESULT'] as ImportStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s ? 'bg-gold-500 text-white' : 'bg-surface-3 text-text-muted'}`}>
              {i + 1}
            </div>
            {i < 3 && <div className={`w-12 h-px ${step === s || (['UPLOAD', 'PREVIEW', 'CONFIRM', 'RESULT'] as ImportStep[])[i+1] === step ? 'bg-gold-500' : 'bg-surface-3'}`} />}
          </div>
        ))}
      </div>

      {step === 'UPLOAD' && (
        <Card className="p-12 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
            <Upload className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">رفع ملف البيانات</h3>
            <p className="text-text-muted max-w-md">يرجى رفع ملف Excel يحتوي على بيانات الأفراد. يمكنك استخدام القالب المعتمد لضمان صحة البيانات.</p>
          </div>
          <div className="space-y-4 w-full max-w-md">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1 text-right">اسم الفريق لتخصيص القالب:</label>
              <input
                type="text"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-text-primary text-right"
                placeholder="أدخل اسم الفريق..."
              />
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleDownloadTemplate} variant="outline">
                <Download className="w-4 h-4 ml-2" /> تحميل القالب المخصص
              </Button>
              <Button
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                {loading ? <Spinner className="w-4 h-4 ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
                {loading ? 'جاري التحليل...' : 'اختيار الملف'}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </Card>
      )}

      {step === 'PREVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" dir="rtl">
            <div className="p-4 rounded-xl bg-surface-2 border border-border">
              <p className="text-xs text-text-muted">إجمالي الصفوف</p>
              <p className="text-xl font-bold">{summary?.total || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-success/10 border border-success/20">
              <p className="text-xs text-success">إضافة جديدة</p>
              <p className="text-xl font-bold text-success">{summary?.create || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-500">تحديث بيانات</p>
              <p className="text-xl font-bold text-blue-500">{summary?.update || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-error/10 border border-error/20">
              <p className="text-xs text-error">أخطاء</p>
              <p className="text-xl font-bold text-error">{summary?.error || 0}</p>
            </div>
          </div>

          <Card>
            <div className="table-responsive">
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-surface-2">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-right text-text-muted">الصف</th>
                    <th className="px-4 py-3 text-right text-text-muted">الاسم</th>
                    <th className="px-4 py-3 text-right text-text-muted">الحالة</th>
                    <th className="px-4 py-3 text-right text-text-muted">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="text-right">
                  {rows.map((row) => (
                    <tr key={row.row_number} className="border-b border-border hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3 text-text-muted">{row.row_number}</td>
                      <td className="px-4 py-3 font-medium">{row.full_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.action === 'CREATE' ? 'success' : row.action === 'UPDATE' ? 'info' : row.action === 'ERROR' ? 'error' : 'warning'}>
                          {row.action === 'CREATE' ? 'إضافة' : row.action === 'UPDATE' ? 'تحديث' : row.action === 'ERROR' ? 'خطأ' : 'تكرار'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {row.errors.length > 0 ? (
                          <div className="text-error text-xs">{row.errors.join(' | ')}</div>
                        ) : row.warnings.length > 0 ? (
                          <div className="text-yellow-600 text-xs">{row.warnings.join(' | ')}</div>
                        ) : (
                          <div className="text-success text-xs">صحيح</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setStep('UPLOAD')}><ArrowLeft className="w-4 h-4 ml-2" /> العودة للملف</Button>
            <Button onClick={() => setStep('CONFIRM')} disabled={summary?.error === 0 && summary?.total === 0}>
              تأكيد البيانات <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'CONFIRM' && (
        <Card className="p-8 space-y-6 max-w-2xl mx-auto" dir="rtl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold">تأكيد الاستيراد</h3>
              <p className="text-text-muted">سيتم الآن دمج البيانات في النظام.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-2 text-right">
              <p className="font-medium">ملخص العملية:</p>
              <ul className="text-sm space-y-1 text-text-secondary">
                <li>إضافة: {summary?.create} فرد</li>
                <li>تحديث: {summary?.update} فرد</li>
                <li>تجاهل: {summary?.error + (summary?.conflict || 0)} صفوف</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-surface-2 cursor-pointer text-right"
                 onClick={() => setSkipErrors(!skipErrors)}>
              <input type="checkbox" checked={skipErrors} readOnly className="w-4 h-4 accent-gold-500" />
              <span className="text-sm">تجاهل الصفوف التي تحتوي على أخطاء والمتابعة</span>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setStep('PREVIEW')}><ArrowLeft className="w-4 h-4 ml-2" /> العودة للمراجعة</Button>
            <Button onClick={handleConfirmImport} loading={loading}>
              {loading ? <Spinner className="w-4 h-4 ml-2" /> : 'بدء الاستيراد الآن'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'RESULT' && (
        <Card className="p-12 flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center text-success">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">اكتملت العملية بنجاح</h3>
            <p className="text-text-muted">تم تحديث قاعدة البيانات بنجاح.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full">
            <div className="p-4 rounded-xl bg-surface-2">
              <p className="text-xs text-text-muted">تمت إضافة</p>
              <p className="text-xl font-bold">{importResult?.created || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-2">
              <p className="text-xs text-text-muted">تم تحديث</p>
              <p className="text-xl font-bold">{importResult?.updated || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-2">
              <p className="text-xs text-text-muted">تجاهل</p>
              <p className="text-xl font-bold">{importResult?.skipped || 0}</p>
            </div>
          </div>

          {importResult?.total_errors > 0 && (
            <div className="w-full p-4 rounded-xl bg-error/10 border border-error/20 flex items-center justify-between" dir="rtl">
              <div className="flex items-center gap-2 text-error text-sm">
                <AlertCircle className="w-4 h-4" />
                <span className="text-right">توجد {importResult.total_errors} صفوف تحتوي على أخطاء لم يتم استيرادها.</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                <Download className="w-4 h-4 ml-2" /> تحميل ملف الأخطاء
              </Button>
            </div>
          )}

          <Button onClick={() => window.location.href = '/members'} className="w-full sm:w-auto">
            العودة إلى قائمة الأفراد
          </Button>
        </Card>
      )}
    </div>
  );
}
