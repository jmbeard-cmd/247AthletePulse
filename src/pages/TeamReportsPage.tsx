import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentWeekMonday, formatWeekLabel, getScoreBg, getScoreLabel } from '@/lib/weekUtils';
import { cn } from '@/lib/utils';
import { BarChart3, Calendar, ChevronDown } from 'lucide-react';
import type { Profile, Question, Response } from '@/types/database';

interface AthleteReport {
  profile: Profile;
  responses: Response[];
  avgScore: number | null;
  byCategory: Record<string, number>;
}

const CATEGORY_COLORS: Record<string, string> = {
  Mindset: 'bg-blue-400',
  Relationships: 'bg-purple-400',
  Growth: 'bg-green-400',
  Preparation: 'bg-indigo-400',
  Family: 'bg-pink-400',
  Competition: 'bg-amber-400',
  Goals: 'bg-orange-400',
  Wellness: 'bg-teal-400',
  Connection: 'bg-cyan-400',
};

export function TeamReportsPage() {
  const { user } = useAuth();
  const [weekOf, setWeekOf] = useState(getCurrentWeekMonday());
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [reports, setReports] = useState<AthleteReport[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: teamsData }, { data: qs }] = await Promise.all([
        supabase.from('teams').select('id').eq('coach_id', user!.id),
        supabase.from('questions').select('*').eq('is_active', true).order('sort_order'),
      ]);
      if (qs) setQuestions(qs);

      if (teamsData && teamsData.length > 0) {
        const teamIds = teamsData.map(t => t.id);
        const { data: ta } = await supabase.from('team_athletes').select('athlete_id').in('team_id', teamIds);
        const athleteIds = [...new Set((ta ?? []).map(x => x.athlete_id))];

        if (athleteIds.length > 0) {
          const [{ data: profiles }, { data: responses }, { data: allResponses }] = await Promise.all([
            supabase.from('profiles').select('*').in('id', athleteIds),
            supabase.from('responses').select('*').in('athlete_id', athleteIds).eq('week_of', weekOf),
            supabase.from('responses').select('week_of').in('athlete_id', athleteIds),
          ]);

          // Get unique weeks
          const weeks = [...new Set((allResponses ?? []).map(r => r.week_of))].sort((a, b) => b.localeCompare(a));
          setAvailableWeeks(weeks);

          if (profiles && qs) {
            const rpts: AthleteReport[] = profiles.map(p => {
              const pr = (responses ?? []).filter(r => r.athlete_id === p.id);
              const avg = pr.length > 0 ? pr.reduce((a, b) => a + b.score, 0) / pr.length : null;
              const byCategory: Record<string, number[]> = {};
              pr.forEach(r => {
                const q = qs.find(q => q.id === r.question_id);
                if (q) {
                  if (!byCategory[q.category]) byCategory[q.category] = [];
                  byCategory[q.category].push(r.score);
                }
              });
              const catAvg: Record<string, number> = {};
              Object.entries(byCategory).forEach(([cat, scores]) => {
                catAvg[cat] = scores.reduce((a, b) => a + b, 0) / scores.length;
              });
              return { profile: p, responses: pr, avgScore: avg, byCategory: catAvg };
            });
            setReports(rpts.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0)));
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [user, weekOf]);

  const categories = [...new Set(questions.map(q => q.category))];
  const selectedReport = reports.find(r => r.profile.id === selectedAthlete);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-48" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-gray-900">Team Reports</h1>
          <p className="font-inter text-gray-500 mt-1">{reports.length} athletes</p>
        </div>

        {/* Week selector */}
        <div className="relative">
          <button
            onClick={() => setShowWeekPicker(!showWeekPicker)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-inter text-sm font-medium text-gray-700 hover:border-blue-300 transition-colors"
          >
            <Calendar className="w-4 h-4 text-gray-400" />
            Week of {formatWeekLabel(weekOf)}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showWeekPicker && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[220px]">
              {availableWeeks.slice(0, 10).map(w => (
                <button
                  key={w}
                  onClick={() => { setWeekOf(w); setShowWeekPicker(false); }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm font-inter hover:bg-blue-50 transition-colors',
                    w === weekOf ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                  )}
                >
                  {formatWeekLabel(w)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-outfit text-lg font-bold text-gray-700 mb-2">No data yet</h3>
          <p className="font-inter text-gray-400 text-sm">
            No athletes have completed check-ins for this week.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Athletes list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-outfit font-bold text-gray-900">Athletes</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {reports.map(r => (
                <button
                  key={r.profile.id}
                  onClick={() => setSelectedAthlete(r.profile.id === selectedAthlete ? null : r.profile.id)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 text-left transition-colors',
                    r.profile.id === selectedAthlete ? 'bg-blue-50' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-semibold font-outfit text-sm flex-shrink-0">
                    {r.profile.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter font-semibold text-gray-900 text-sm truncate">{r.profile.full_name}</p>
                    {r.avgScore != null ? (
                      <p className={cn('text-xs font-inter font-medium mt-0.5', r.avgScore >= 3.5 ? 'text-green-600' : r.avgScore >= 2.5 ? 'text-yellow-600' : 'text-red-600')}>
                        {getScoreLabel(r.avgScore)}
                      </p>
                    ) : (
                      <p className="text-xs font-inter text-gray-400 mt-0.5">Not submitted</p>
                    )}
                  </div>
                  {r.avgScore != null && (
                    <span className={cn('font-outfit font-bold text-sm px-2.5 py-1 rounded-lg flex-shrink-0', getScoreBg(r.avgScore))}>
                      {r.avgScore.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Detail view */}
          {selectedReport ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold font-outfit">
                  {selectedReport.profile.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                  <h2 className="font-outfit font-bold text-gray-900">{selectedReport.profile.full_name}</h2>
                  {selectedReport.avgScore != null && (
                    <span className={cn('text-sm font-inter font-medium px-2.5 py-0.5 rounded-full', getScoreBg(selectedReport.avgScore))}>
                      Avg: {selectedReport.avgScore.toFixed(1)} — {getScoreLabel(selectedReport.avgScore)}
                    </span>
                  )}
                </div>
              </div>

              {selectedReport.avgScore == null ? (
                <p className="text-gray-400 font-inter text-sm">This athlete has not submitted a check-in for this week.</p>
              ) : (
                <>
                  {/* Category breakdown */}
                  <div className="space-y-3 mb-5">
                    {categories.map(cat => {
                      const score = selectedReport.byCategory[cat];
                      if (!score) return null;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-inter text-sm font-medium text-gray-700">{cat}</span>
                            <span className="font-outfit font-bold text-sm text-gray-900">{score.toFixed(1)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', CATEGORY_COLORS[cat] || 'bg-blue-400')}
                              style={{ width: `${(score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Individual responses */}
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    {questions.map(q => {
                      const r = selectedReport.responses.find(r => r.question_id === q.id);
                      if (!r) return null;
                      return (
                        <div key={q.id} className="flex items-center gap-3">
                          <p className="font-inter text-sm text-gray-600 flex-1 leading-tight">{q.text}</p>
                          <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center font-outfit font-bold text-sm flex-shrink-0', getScoreBg(r.score))}>
                            {r.score}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-10 text-center flex flex-col items-center justify-center">
              <BarChart3 className="w-10 h-10 text-gray-300 mb-3" />
              <p className="font-inter text-gray-400 text-sm">Click an athlete to view their report</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
