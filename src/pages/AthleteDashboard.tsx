import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentWeekMonday, formatWeekLabel, getScoreBg } from '@/lib/weekUtils';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, TrendingUp, CheckCircle2, 
  ChevronRight, Calendar, Flame, Award, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Response, Question } from '@/types/database';

interface WeekSummary {
  week_of: string;
  avgScore: number;
  count: number;
}

export function AthleteDashboard() {
  const { profile, user } = useAuth();
  const weekOf = getCurrentWeekMonday();
  const [thisWeekResponses, setThisWeekResponses] = useState<Response[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [weekHistory, setWeekHistory] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: qs }, { data: rs }, { data: history }] = await Promise.all([
        supabase.from('questions').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('responses').select('*').eq('athlete_id', user!.id).eq('week_of', weekOf),
        supabase.from('responses').select('week_of, score').eq('athlete_id', user!.id).order('week_of', { ascending: false }).limit(80),
      ]);
      if (qs) setQuestions(qs);
      if (rs) setThisWeekResponses(rs);
      if (history) {
        // Group by week
        const byWeek: Record<string, number[]> = {};
        history.forEach(r => {
          if (!byWeek[r.week_of]) byWeek[r.week_of] = [];
          byWeek[r.week_of].push(r.score);
        });
        const summaries = Object.entries(byWeek).map(([w, scores]) => ({
          week_of: w,
          avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
          count: scores.length,
        })).sort((a, b) => b.week_of.localeCompare(a.week_of)).slice(0, 8);
        setWeekHistory(summaries);
      }
      setLoading(false);
    };
    load();
  }, [user, weekOf]);

  const checkedIn = thisWeekResponses.length >= questions.length && questions.length > 0;
  const thisWeekAvg = thisWeekResponses.length > 0
    ? thisWeekResponses.reduce((a, b) => a + b.score, 0) / thisWeekResponses.length
    : null;

  const getStreakCount = () => {
    let streak = 0;
    for (const w of weekHistory) {
      if (w.count >= questions.length) streak++;
      else break;
    }
    return streak;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const streak = getStreakCount();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="font-inter text-gray-500 text-sm">{greeting} 👋</p>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">
          {profile?.full_name?.split(' ')[0] ?? 'Athlete'}
        </h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Check-in status */}
        <div className={cn(
          'rounded-2xl p-5 border',
          checkedIn ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
        )}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-xs font-inter font-semibold uppercase tracking-wide', checkedIn ? 'text-green-600' : 'text-amber-600')}>
              This Week
            </span>
            {checkedIn
              ? <CheckCircle2 className="w-5 h-5 text-green-500" />
              : <ClipboardList className="w-5 h-5 text-amber-500" />
            }
          </div>
          <p className="font-outfit text-xl font-bold text-gray-900">
            {checkedIn ? 'Completed' : 'Not yet done'}
          </p>
          <p className="font-inter text-xs text-gray-500 mt-1">{formatWeekLabel(weekOf)}</p>
        </div>

        {/* This week avg */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">
              Week Score
            </span>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="font-outfit text-3xl font-bold text-blue-700">
            {thisWeekAvg != null ? thisWeekAvg.toFixed(1) : '—'}
          </p>
          <p className="font-inter text-xs text-gray-400 mt-1">out of 5.0</p>
        </div>

        {/* Streak */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">
              Check-In Streak
            </span>
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <p className="font-outfit text-3xl font-bold text-gray-900">{streak}</p>
          <p className="font-inter text-xs text-gray-400 mt-1">consecutive weeks</p>
        </div>
      </div>

      {/* CTA if not checked in */}
      {!checkedIn && (
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-300" />
                <span className="font-inter text-blue-200 text-sm">{formatWeekLabel(weekOf)}</span>
              </div>
              <h2 className="font-outfit text-xl font-bold mb-1">Time for your weekly check-in</h2>
              <p className="font-inter text-blue-200 text-sm">14 questions · Takes about 3 minutes</p>
            </div>
            <Link to="/checkin">
              <Button className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-inter font-semibold rounded-xl shadow-sm whitespace-nowrap">
                Start Check-In
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Recent history */}
      {weekHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-outfit text-lg font-bold text-gray-900">Recent History</h2>
            <Link to="/progress" className="text-blue-700 text-sm font-inter font-medium hover:text-blue-800 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {weekHistory.map(w => (
              <div key={w.week_of} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-inter text-sm font-medium text-gray-700">
                    Week of {formatWeekLabel(w.week_of)}
                  </p>
                  <p className="font-inter text-xs text-gray-400">{w.count} responses</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Bar */}
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-700 rounded-full transition-all"
                      style={{ width: `${(w.avgScore / 5) * 100}%` }}
                    />
                  </div>
                  <span className={cn('text-sm font-outfit font-bold px-2 py-0.5 rounded-lg min-w-[52px] text-center', getScoreBg(w.avgScore))}>
                    {w.avgScore.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {weekHistory.length === 0 && checkedIn === false && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-outfit text-lg font-bold text-gray-700 mb-2">Start your journey</h3>
          <p className="font-inter text-gray-400 text-sm max-w-xs mx-auto mb-4">
            Complete your first weekly check-in to start tracking your mindset progress.
          </p>
          <Link to="/checkin">
            <Button className="bg-blue-700 hover:bg-blue-800 text-white font-inter">
              Begin Check-In
            </Button>
          </Link>
        </div>
      )}

      {/* Link to full progress */}
      {weekHistory.length > 0 && (
        <Link to="/progress" className="flex items-center justify-center gap-2 text-blue-700 hover:text-blue-800 font-inter font-medium text-sm">
          <TrendingUp className="w-4 h-4" />
          View Full Progress Report
        </Link>
      )}
    </div>
  );
}
