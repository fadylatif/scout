import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthContext } from './store/authStore';
import { useAuthState } from './hooks/useAuth';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { MembersPage } from './pages/members/MembersPage';
import { MemberDetailPage } from './pages/members/MemberDetailPage';
import { MemberImportPage } from './pages/members/MemberImportPage';
import { StructurePage } from './pages/structure/StructurePage';
import { UsersPage } from './pages/users/UsersPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { AttendanceSessionDetailPage } from './pages/attendance/AttendanceSessionDetailPage';
import { ExcusesPage } from './pages/attendance/ExcusesPage';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { AdvancementPage } from './pages/advancement/AdvancementPage';
import { MediaCenterPage } from './pages/media/MediaCenterPage';
import { ReportsPage } from './pages/reports/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Members */}
        <Route path="/members" element={<MembersPage />} />
        <Route path="/members/import" element={<MemberImportPage />} />
        <Route path="/members/:id" element={<MemberDetailPage />} />

        {/* Attendance */}
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/attendance/sessions/:id" element={<AttendanceSessionDetailPage />} />
        <Route path="/attendance/excuses" element={<ExcusesPage />} />

        {/* Activities & Calendar */}
        <Route path="/activities" element={<ActivitiesPage />} />

        {/* Tasks */}
        <Route path="/tasks" element={<TasksPage />} />

        {/* Advancement */}
        <Route path="/advancement" element={<AdvancementPage />} />

        {/* Media Center */}
        <Route path="/media" element={<MediaCenterPage />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />

        {/* Structure & Users */}
        <Route path="/structure" element={<StructurePage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  const auth = useAuthState();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
