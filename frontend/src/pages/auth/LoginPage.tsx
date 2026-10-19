import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../store/authStore';
import { authApi } from '../../api/auth';

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(username.trim(), password);
      setUser(res.data);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string; code?: string } } };
      const code = axiosErr.response?.data?.code;

      if (code === 'session_limit_exceeded') {
        setError('وصلت للحد الأقصى من الجلسات النشطة (2). أنهِ إحدى جلساتك الحالية أولاً.');
      } else if (axiosErr.response?.status === 403) {
        setError('الحساب محظور بسبب محاولات دخول متعددة. حاول مجدداً بعد ساعة.');
      } else {
        setError(axiosErr.response?.data?.detail ?? 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4" dir="rtl">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-gold-400/40 mb-4 shadow-gold overflow-hidden bg-surface">
            <img src="/logo.png" alt="شعار أبي سيفين" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black text-text-primary">مجموعات أبي سيفين</h1>
          <p className="text-text-muted text-sm mt-1">الكشفية والإرشادية</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-text-primary mb-6 text-center">تسجيل الدخول</h2>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="اسم المستخدم"
              type="text"
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              rightIcon={<User className="w-4 h-4" />}
              required
              disabled={loading}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-text-secondary">
                كلمة المرور <span className="text-brand-red">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-surface-2 border border-border rounded-lg text-text-primary placeholder:text-text-muted px-3 py-2.5 pr-10 pl-10 text-base transition-colors focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 hover:border-border-subtle disabled:opacity-50"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              دخول
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          كنيسة السيدة العذراء مريم وأبي سيفين © 2026
        </p>
      </div>
    </div>
  );
}
