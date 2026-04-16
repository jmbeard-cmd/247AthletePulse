import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AthleteDashboard } from './AthleteDashboard';
import { CoachDashboard } from './CoachDashboard';
import { ParentDashboard } from './ParentDashboard';
import { AdminDashboard } from './AdminDashboard';
import { AppLayout } from '@/components/AppLayout';
import { Activity } from 'lucide-react';

export function DashboardRouter() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6 text-white animate-pulse" />
          </div>
          <p className="font-inter text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Role-based onboarding gates — redirect before dashboard renders
  if (profile?.role === 'athlete' && !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }
  if (profile?.role === 'coach' && !profile.onboarding_complete) {
    return <Navigate to="/coach-onboarding" replace />;
  }

  const renderDashboard = () => {
    switch (profile?.role) {
      case 'athlete': return <AthleteDashboard />;
      case 'coach':   return <CoachDashboard />;
      case 'parent':  return <ParentDashboard />;
      case 'admin':   return <AdminDashboard />;
      default:
        return (
          <div className="max-w-md mx-auto text-center py-20">
            <p className="font-inter text-gray-500">Your account is being set up…</p>
          </div>
        );
    }
  };

  return (
    <AppLayout>
      {renderDashboard()}
    </AppLayout>
  );
}
