import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentWeekMonday, formatWeekLabel, getScoreBg, getScoreLabel } from '@/lib/weekUtils';
import { cn } from '@/lib/utils';
import { Users, BarChart3, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import type { Profile, Question, Response } from '@/types/database';

interface AthleteData {
  profile: Profile;
  responses: Response[];
  avgScore: number | null;
}

export function ParentDashboard() {
  const { profile, user } = useAuth();
  const weekOf = getCurrentWeekMonday();
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: links }, { data: qs }] = await Promise.all([
        supabase.from('parent_athlete_links').select('athlete_id').eq('parent_id', user!.id),
        supabase.from('questions').select('*').eq('is_active', true).order('sort_order'),
      ]);
      if (qs) setQuestions(qs);

      if (links && links.length > 0) {
        const ids = links.map(l => l.athlete_id);
        const [{ data: profiles }, { data: responses }] = await Promise.all([
          supabase.from('profiles').select('*').in('id', ids),
          supabase.from('responses').select('*').in('athlete_id', ids).eq('week_of', weekOf),
        ]);
        if (profiles) {
          const data: AthleteData[] = profiles.map(p => {
            const pr = (responses ?? []).filter(r => r.athlete_id === p.id);
            return {
              profile: p,
              responses: pr,
              avgScore: pr.length > 0 ? pr.reduce((a, b) => a + b.score, 0) / pr.length : null,
            };
          });
          setAthletes(data);
          if (data.length > 0) setSelectedAthlete(data[0].profile.id);
        }
      }
      setLoading(false);
    };
    load();
  }, [user, weekOf]);

  const selectedData = athletes.find(a => a.profile.id === selectedAthlete);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div>
          <p className="font-inter text-gray-500 text-sm">Parent Dashboard</p>
          <h1 className="font-outfit text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name?.split(' ')[0] ?? 'Parent'} 👋
          </h1>
        </div>
        <div className="mt-6 bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-outfit text-lg font-bold text-gray-700 mb-2">No linked athletes</h3>
          <p className="font-inter text-gray-400 text-sm max-w-sm mx-auto">
            Ask your child's coach for a parent invite code with your athlete linked. Use it to create your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="font-inter text-gray-500 text-sm">Parent Dashboard</p>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">
          Welcome, {profile?.full_name?.split(' ')[0] ?? 'Parent'} 👋
        </h1>
        <p className="font-inter text-gray-500 text-sm mt-1">Week of {formatWeekLabel(weekOf)}</p>
      </div>

      {/* Athlete tabs */}
      {athletes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {athletes.map(a => (
            <button
              key={a.profile.id}
              onClick={() => setSelectedAthlete(a.profile.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-inter font-medium transition-all border',
                selectedAthlete === a.profile.id
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              )}
            >
              {a.profile.full_name}
            </button>
          ))}
        </div>
      )}

      {selectedData && (
        <div className="space-y-5">
          {/* Status card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={cn(
              'rounded-2xl p-5 border col-span-1',
              selectedData.avgScore != null ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            )}>
              <div className="flex items-center gap-2 mb-2">
                {selectedData.avgScore != null
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Clock className="w-5 h-5 text-amber-500" />
                }
                <span className={cn('text-xs font-inter font-semibold uppercase tracking-wide', selectedData.avgScore != null ? 'text-green-600' : 'text-amber-600')}>
                  This Week
                </span>
              </div>
              <p className="font-outfit text-xl font-bold text-gray-900">
                {selectedData.avgScore != null ? 'Completed' : 'Pending'}
              </p>
              <p className="font-inter text-xs text-gray-500 mt-1">{formatWeekLabel(weekOf)}</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Score</span>
              </div>
              <p className="font-outfit text-3xl font-bold text-blue-700">
                {selectedData.avgScore != null ? selectedData.avgScore.toFixed(1) : '—'}
              </p>
              {selectedData.avgScore != null && (
                <p className="font-inter text-xs text-gray-500 mt-0.5">{getScoreLabel(selectedData.avgScore)}</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-inter font-semibold uppercase tracking-wide text-gray-400">Athlete</span>
              </div>
              <p className="font-outfit text-xl font-bold text-gray-900">{selectedData.profile.full_name}</p>
              <p className="font-inter text-xs text-gray-400 mt-0.5">{questions.length} check-in questions</p>
            </div>
          </div>

          {/* Responses */}
          {selectedData.responses.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-outfit font-bold text-gray-900 mb-4">
                {selectedData.profile.full_name?.split(' ')[0]}'s Responses
              </h2>
              <div className="space-y-3">
                {questions.map(q => {
                  const r = selectedData.responses.find(r => r.question_id === q.id);
                  if (!r) return null;
                  return (
                    <div key={q.id} className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-inter text-sm text-gray-700 leading-tight">{q.text}</p>
                        <p className="font-inter text-xs text-gray-400 mt-0.5">{q.category}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-700 rounded-full" style={{ width: `${(r.score / 5) * 100}%` }} />
                        </div>
                        <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center font-outfit font-bold text-sm', getScoreBg(r.score))}>
                          {r.score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-outfit font-bold text-gray-700 mb-1">No responses yet</p>
              <p className="font-inter text-gray-400 text-sm">
                {selectedData.profile.full_name?.split(' ')[0]} hasn't completed their check-in this week.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
