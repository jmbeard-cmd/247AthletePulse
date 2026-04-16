import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AthleteDashboard } from './AthleteDashboard';
import { CoachDashboard } from './CoachDashboard';
import { ParentDashboard } from './ParentDashboard';
import { AdminDashboard } from './AdminDashboard';
import { AppLayout } from '@/components/AppLayout';
import { Activity, RefreshCw, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Full-screen spinner (shown while loading === true) ───────────────────────
function LoadingScreen() {
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

// ─── Profile-not-found error state ───────────────────────────────────────────
// Shown when loading is false but profile is still null after all retries.
// Gives the user two clear recovery options rather than a dead end.
function ProfileErrorScreen() {
  const { refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await refreshProfile();
    setRetrying(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-5">
        {/* Icon */}
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h2 className="font-outfit text-xl font-bold text-gray-900">Profile not found</h2>
          <p className="font-inter text-sm text-gray-500 leading-relaxed">
            We couldn't load your profile. This can happen right after signup
            while your account is being set up. Try refreshing in a moment.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full h-10 bg-blue-700 hover:bg-blue-800 text-white font-inter font-semibold flex items-center justify-center gap-2"
          >
            {retrying ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Retrying…</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Try Refreshing</>
            )}
          </Button>

          <button
            onClick={handleSignOut}
            className="w-full h-10 flex items-center justify-center gap-2 font-inter text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out and try again
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main router ──────────────────────────────────────────────────────────────
export function DashboardRouter() {
  const { profile, loading } = useAuth();

  // 1. Still fetching (initial load or mid-retry)
  if (loading) {
    return <LoadingScreen />;
  }

  // 2. Loading finished but no profile row — give the user a way out
  if (!profile) {
    return <ProfileErrorScreen />;
  }

  // 3. Role-based onboarding gates — redirect before the dashboard renders
  if (profile.role === 'athlete' && !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }
  if (profile.role === 'coach' && !profile.onboarding_complete) {
    return <Navigate to="/coach-onboarding" replace />;
  }

  // 4. Render the role-specific dashboard
  const renderDashboard = () => {
    switch (profile.role) {
      case 'athlete': return <AthleteDashboard />;
      case 'coach':   return <CoachDashboard />;
      case 'parent':  return <ParentDashboard />;
      case 'admin':   return <AdminDashboard />;
      // Edge case: authenticated user with a profile but an unrecognised role
      default:        return <ProfileErrorScreen />;
    }
  };

  return (
    <AppLayout>
      {renderDashboard()}
    </AppLayout>
  );
}
