import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { useAuth } from "@/contexts/AuthContext";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AthleteOnboarding } from "./pages/AthleteOnboarding";
import { DashboardRouter } from "./pages/DashboardRouter";
import { CheckInPage } from "./pages/CheckInPage";
import { ProgressPage } from "./pages/ProgressPage";
import { TeamPage } from "./pages/TeamPage";
import { TeamReportsPage } from "./pages/TeamReportsPage";
import { InviteCodesPage } from "./pages/InviteCodesPage";
import { ParentDashboard } from "./pages/ParentDashboard";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminResponsesPage } from "./pages/AdminResponsesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

function AuthRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        } />

        <Route path="/onboarding" element={
          <ProtectedRoute allowedRoles={['athlete']}>
            <AthleteOnboarding />
          </ProtectedRoute>
        } />

        <Route path="/checkin" element={
          <ProtectedRoute allowedRoles={['athlete']}>
            <AppLayout><CheckInPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/progress" element={
          <ProtectedRoute allowedRoles={['athlete']}>
            <AppLayout><ProgressPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/team" element={
          <ProtectedRoute allowedRoles={['coach', 'admin']}>
            <AppLayout><TeamPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['coach', 'admin']}>
            <AppLayout><TeamReportsPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/invites" element={
          <ProtectedRoute allowedRoles={['coach', 'admin']}>
            <AppLayout><InviteCodesPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/athletes" element={
          <ProtectedRoute allowedRoles={['parent']}>
            <AppLayout><ParentDashboard /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><AdminUsersPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/responses" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><AdminResponsesPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout><ProfilePage /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Root redirect */}
        <Route path="/" element={<AuthRedirect />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
