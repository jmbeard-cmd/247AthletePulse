import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentWeekMonday, formatWeekLabel, getScoreBg } from '@/lib/weekUtils';
import { Button } from '@/components/ui/button';
import { 
  Users, BarChart3, Star, ChevronRight, 
  AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Team, Profile, Question, Response } from '@/types/database';

interface AthleteStatus {
  profile: Profile;
  checkedIn: boolean;
  avgScore: number | null;
}

export function CoachDashboard() {
  const { profile, user } = useAuth();
  const weekOf = getCurrentWeekMonday();
  const [teams, setTeams] = useState<Team[]>([]);
  const [athleteStatuses, setAthleteStatuses] = useState<AthleteStatus[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: teamsData }, { data: qs }] = await Promise.all([
        supabase.from('teams').select('*').eq('coach_id', user!.id),
        supabase.from('questions').select('*').eq('is_active', true),
      ]);
      if (qs) setQuestions(qs);
      if (teamsData) {
        setTeams(teamsData);
        if (teamsData.length > 0) {
          const teamIds = teamsData.map(t => t.id);
          const { data: taData } = await supabase
            .from('team_athletes')
            .select('athlete_id')
            .in('team_id', teamIds);

          if (taData && taData.length > 0) {
            const athleteIds = [...new Set(taData.map(ta => ta.athlete_id))];
            const [{ data: profiles }, { data: responses }] = await Promise.all([
              supabase.from('profiles').select('*').in('id', athleteIds),
              supabase.from('responses').select('*').in('athlete_id', athleteIds).eq('week_of', weekOf),
            ]);
            if (profiles) {
              const statuses: AthleteStatus[] = profiles.map(p => {
                const pr = (responses || []).filter(r => r.athlete_id === p.id);
                return {
                  profile: p,
                  checkedIn: pr.length >= qs!.length,
                  avgScore: pr.length > 0 ? pr.reduce((a, b) => a + b.score, 0) / pr.length : null,
                };
              });
              setAthleteStatuses(statuses);
            }
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [user, weekOf]);

  const checkedInCount = athleteStatuses.filter(a => a.checkedIn).length;
  const totalAthletes = athleteStatuses.length;
  const avgTeamScore = athleteStatuses.filter(a => a.avgScore != null).length > 0
    ? athleteStatuses.filter(a => a.avgScore != null).reduce((a, b) => a + (b.avgScore ?? 0), 0) / athleteStatuses.filter(a => a.avgScore != null).length
    : null;
  const atRiskAthletes = athleteStatuses.filter(a => a.avgScore != null && a.avgScore < 2.5);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-5xl mx-auto">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="font-inter text-gray-500 text-sm">Coach Dashboard</p>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">
          Welcome, {profile?.full_name?.split(' ')[0] ?? 'Coach'} 👋
        </h1>
        <p className="font-inter text-gray-500 text-sm mt-1">Week of {formatWeekLabel(weekOf)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Athletes</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="font-outfit text-3xl font-bold text-gray-900">{totalAthletes}</p>
          <p className="font-inter text-xs text-gray-400 mt-0.5">on your teams</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Checked In</span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <p className="font-outfit text-3xl font-bold text-gray-900">{checkedInCount}/{totalAthletes}</p>
          <p className="font-inter text-xs text-gray-400 mt-0.5">this week</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Team Avg</span>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="font-outfit text-3xl font-bold text-blue-700">
            {avgTeamScore != null ? avgTeamScore.toFixed(1) : '—'}
          </p>
          <p className="font-inter text-xs text-gray-400 mt-0.5">out of 5.0</p>
        </div>

        <div className={cn(
          'rounded-2xl border p-5',
          atRiskAthletes.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn('text-xs font-inter font-semibold uppercase tracking-wide', atRiskAthletes.length > 0 ? 'text-red-500' : 'text-green-500')}>
              Needs Attention
            </span>
            <AlertTriangle className={cn('w-4 h-4', atRiskAthletes.length > 0 ? 'text-red-400' : 'text-green-400')} />
          </div>
          <p className={cn('font-outfit text-3xl font-bold', atRiskAthletes.length > 0 ? 'text-red-700' : 'text-green-700')}>
            {atRiskAthletes.length}
          </p>
          <p className="font-inter text-xs text-gray-400 mt-0.5">athletes below 2.5</p>
        </div>
      </div>

      {/* No teams */}
      {teams.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-outfit text-lg font-bold text-gray-700 mb-2">No teams yet</h3>
          <p className="font-inter text-gray-400 text-sm mb-4">Create a team and invite athletes to get started.</p>
          <Link to="/team">
            <Button className="bg-blue-700 hover:bg-blue-800 text-white font-inter">
              Create Team
            </Button>
          </Link>
        </div>
      )}

      {/* Athletes this week */}
      {athleteStatuses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-outfit text-lg font-bold text-gray-900">This Week's Check-Ins</h2>
            <Link to="/reports" className="text-blue-700 text-sm font-inter font-medium hover:text-blue-800 flex items-center gap-1">
              Full Report <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {athleteStatuses.map(as => (
              <div key={as.profile.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-blue-700 rounded-full flex items-center justify-center text-white font-semibold font-outfit text-sm flex-shrink-0">
                  {as.profile.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter font-semibold text-gray-900 text-sm truncate">{as.profile.full_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {as.checkedIn
                      ? <><CheckCircle2 className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600 font-inter">Checked in</span></>
                      : <><Clock className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-400 font-inter">Not yet</span></>
                    }
                  </div>
                </div>
                {as.avgScore != null && (
                  <span className={cn('font-outfit font-bold text-sm px-2.5 py-1 rounded-lg', getScoreBg(as.avgScore))}>
                    {as.avgScore.toFixed(1)}
                  </span>
                )}
                {!as.checkedIn && (
                  <span className="text-xs font-inter text-gray-300 px-2.5 py-1 bg-gray-50 rounded-lg">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/team" className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all">
          <Users className="w-8 h-8 text-blue-700 mb-3" />
          <h3 className="font-outfit font-bold text-gray-900 mb-1">Manage Team</h3>
          <p className="font-inter text-xs text-gray-400">Add athletes & create teams</p>
          <ChevronRight className="w-4 h-4 text-gray-300 mt-3 group-hover:text-blue-700 transition-colors" />
        </Link>
        <Link to="/reports" className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all">
          <BarChart3 className="w-8 h-8 text-blue-700 mb-3" />
          <h3 className="font-outfit font-bold text-gray-900 mb-1">Team Reports</h3>
          <p className="font-inter text-xs text-gray-400">View detailed analytics</p>
          <ChevronRight className="w-4 h-4 text-gray-300 mt-3 group-hover:text-blue-700 transition-colors" />
        </Link>
        <Link to="/invites" className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all">
          <Star className="w-8 h-8 text-amber-500 mb-3" />
          <h3 className="font-outfit font-bold text-gray-900 mb-1">Invite Codes</h3>
          <p className="font-inter text-xs text-gray-400">Generate codes for athletes & parents</p>
          <ChevronRight className="w-4 h-4 text-gray-300 mt-3 group-hover:text-blue-700 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
