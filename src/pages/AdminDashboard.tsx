import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getCurrentWeekMonday, formatWeekLabel } from '@/lib/weekUtils';
import { cn } from '@/lib/utils';
import { Users, BarChart3, ClipboardList, Star, Shield, ChevronRight } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalAthletes: number;
  totalCoaches: number;
  totalParents: number;
  totalTeams: number;
  totalResponses: number;
  thisWeekResponses: number;
}

export function AdminDashboard() {
  const weekOf = getCurrentWeekMonday();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalUsers },
        { count: totalAthletes },
        { count: totalCoaches },
        { count: totalParents },
        { count: totalTeams },
        { count: totalResponses },
        { count: thisWeekResponses },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'athlete'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'coach'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('responses').select('id', { count: 'exact', head: true }),
        supabase.from('responses').select('id', { count: 'exact', head: true }).eq('week_of', weekOf),
      ]);
      setStats({
        totalUsers: totalUsers ?? 0,
        totalAthletes: totalAthletes ?? 0,
        totalCoaches: totalCoaches ?? 0,
        totalParents: totalParents ?? 0,
        totalTeams: totalTeams ?? 0,
        totalResponses: totalResponses ?? 0,
        thisWeekResponses: thisWeekResponses ?? 0,
      });
      setLoading(false);
    };
    load();
  }, [weekOf]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-red-500" />
          <span className="font-inter text-sm text-red-500 font-medium">Admin</span>
        </div>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="font-inter text-gray-500 mt-1">Week of {formatWeekLabel(weekOf)}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Total Users</span>
          </div>
          <p className="font-outfit text-3xl font-bold text-gray-900">{stats?.totalUsers}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Athletes</span>
          </div>
          <p className="font-outfit text-3xl font-bold text-blue-700">{stats?.totalAthletes}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Coaches</span>
          </div>
          <p className="font-outfit text-3xl font-bold text-amber-600">{stats?.totalCoaches}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Parents</span>
          </div>
          <p className="font-outfit text-3xl font-bold text-purple-600">{stats?.totalParents}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-green-500" />
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Teams</span>
          </div>
          <p className="font-outfit text-3xl font-bold text-gray-900">{stats?.totalTeams}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">All Responses</span>
          </div>
          <p className="font-outfit text-3xl font-bold text-gray-900">{stats?.totalResponses}</p>
        </div>

        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-blue-500">This Week</span>
          </div>
          <p className="font-outfit text-3xl font-bold text-blue-700">{stats?.thisWeekResponses}</p>
          <p className="font-inter text-xs text-blue-500 mt-1">responses so far</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin#invites" className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all">
          <Star className="w-8 h-8 text-amber-500 mb-3" />
          <h3 className="font-outfit font-bold text-gray-900 mb-1">Invite Codes</h3>
          <p className="font-inter text-xs text-gray-400 mb-3">Generate and manage access codes</p>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-700 transition-colors" />
        </Link>

        <Link to="/admin#users" className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all">
          <Users className="w-8 h-8 text-blue-700 mb-3" />
          <h3 className="font-outfit font-bold text-gray-900 mb-1">Manage Users</h3>
          <p className="font-inter text-xs text-gray-400 mb-3">View and manage all platform users</p>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-700 transition-colors" />
        </Link>

        <Link to="/admin/responses" className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all">
          <BarChart3 className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-outfit font-bold text-gray-900 mb-1">All Responses</h3>
          <p className="font-inter text-xs text-gray-400 mb-3">Browse check-in data across all athletes</p>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-700 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
