import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Activity } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  // Always wait for the auth + profile load to complete before deciding anything.
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <p className="font-inter text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // No session → send to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Role-gated route: only redirect if we have a profile and the role doesn't match.
  // If profile is null here it means the fetch failed — let DashboardRouter handle
  // the recovery UI rather than bouncing the user back to /dashboard.
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
