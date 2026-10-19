import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCog,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../store/authStore';
import { authApi } from '../../api/auth';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'لوحة التحكم', to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'الأفراد', to: '/members', icon: <Users className="w-5 h-5" /> },
  { label: 'الهيكل التنظيمي', to: '/structure', icon: <Building2 className="w-5 h-5" /> },
  { label: 'إدارة المستخدمين', to: '/users', icon: <UserCog className="w-5 h-5" />, adminOnly: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore errors
    } finally {
      logout();
      navigate('/login');
    }
  };

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN'
  );

  return (
    <aside
      className={clsx(
        'fixed top-0 right-0 h-full bg-surface border-l border-border z-drawer',
        'flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
      aria-label="القائمة الرئيسية"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/logo.png" alt="الشعار" className="w-9 h-9 rounded-full shrink-0 object-cover" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-text-primary truncate">أبي سيفين الكشفية</p>
              <p className="text-xs text-text-muted truncate">نظام الإدارة</p>
            </div>
          </div>
        )}
        {collapsed && (
          <img src="/logo.png" alt="الشعار" className="w-8 h-8 rounded-full object-cover mx-auto" />
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
          aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4 icon-directional" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="التنقل">
        <ul className="space-y-1 px-2">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                    'text-sm font-medium',
                    isActive
                      ? 'bg-gold-400/10 text-gold-400 border border-gold-400/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-3',
                    collapsed && 'justify-center px-2'
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-border p-3">
        {!collapsed && user && (
          <div className="px-2 pb-2">
            <p className="text-sm font-semibold text-text-primary truncate">{user.full_name}</p>
            <p className="text-xs text-text-muted truncate">{user.username}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl',
            'text-sm font-medium text-text-muted hover:text-brand-red hover:bg-brand-red/10 transition-all',
            collapsed && 'justify-center px-2'
          )}
          aria-label="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
}
