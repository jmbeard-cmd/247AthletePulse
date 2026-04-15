import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatWeekLabel, getScoreBg } from '@/lib/weekUtils';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import type { Question, Response } from '@/types/database';

interface WeekData {
  week_of: string;
  responses: Response[];
  avgScore: number;
  byCategory: Record<string, number>;
}

const CATEGORY_COLORS: Record<string, string> = {
  Mindset: 'bg-blue-500',
  Relationships: 'bg-purple-500',
  Growth: 'bg-green-500',
  Preparation: 'bg-indigo-500',
  Family: 'bg-pink-500',
  Competition: 'bg-amber-500',
  Goals: 'bg-orange-500',
  Wellness: 'bg-teal-500',
  Connection: 'bg-cyan-500',
};

export function ProgressPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: qs }, { data: rs }] = await Promise.all([
        supabase.from('questions').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('responses').select('*').eq('athlete_id', user!.id).order('week_of', { ascending: false }),
      ]);
      if (qs && rs) {
        setQuestions(qs);
        const byWeek: Record<string, Response[]> = {};
        rs.forEach(r => {
          if (!byWeek[r.week_of]) byWeek[r.week_of] = [];
          byWeek[r.week_of].push(r);
        });
        const weeks = Object.entries(byWeek).map(([w, resp]) => {
          const avg = resp.reduce((a, b) => a + b.score, 0) / resp.length;
          const byCategory: Record<string, number[]> = {};
          resp.forEach(r => {
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
          return { week_of: w, responses: resp, avgScore: avg, byCategory: catAvg };
        }).sort((a, b) => b.week_of.localeCompare(a.week_of));
        setWeekData(weeks);
        if (weeks.length > 0) setSelectedWeek(weeks[0].week_of);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-48" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  const selectedData = weekData.find(w => w.week_of === selectedWeek);
  const categories = [...new Set(questions.map(q => q.category))];

  if (weekData.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="font-outfit text-3xl font-bold text-gray-900 mb-6">My Progress</h1>
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-outfit text-lg font-bold text-gray-700 mb-2">No data yet</h3>
          <p className="font-inter text-gray-400 text-sm">Complete your first check-in to see your progress here.</p>
        </div>
      </div>
    );
  }

  // Trend data for mini chart
  const maxBars = Math.min(weekData.length, 12);
  const chartData = weekData.slice(0, maxBars).reverse();
  const maxScore = 5;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">My Progress</h1>
        <p className="font-inter text-gray-500 mt-1">{weekData.length} weeks of data</p>
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-700" />
          <h2 className="font-outfit font-bold text-gray-900">Weekly Averages</h2>
        </div>

        <div className="flex items-end gap-2 h-28">
          {chartData.map(w => (
            <button
              key={w.week_of}
              onClick={() => setSelectedWeek(w.week_of)}
              className={cn(
                'flex-1 rounded-t-lg transition-all duration-200 min-w-0 cursor-pointer',
                w.week_of === selectedWeek ? 'opacity-100' : 'opacity-60 hover:opacity-80'
              )}
              style={{
                height: `${(w.avgScore / maxScore) * 100}%`,
                backgroundColor: w.avgScore >= 4 ? '#22c55e' : w.avgScore >= 3 ? '#3b82f6' : w.avgScore >= 2 ? '#f59e0b' : '#ef4444',
              }}
              title={`${formatWeekLabel(w.week_of)}: ${w.avgScore.toFixed(1)}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2 overflow-x-auto">
          {chartData.map(w => (
            <div key={w.week_of} className="flex-1 min-w-0 text-center">
              <p className="text-xs text-gray-400 font-inter truncate">
                {new Date(w.week_of + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Week selector */}
      <div className="flex gap-2 flex-wrap">
        {weekData.slice(0, 8).map(w => (
          <button
            key={w.week_of}
            onClick={() => setSelectedWeek(w.week_of)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-inter font-medium transition-all border',
              selectedWeek === w.week_of
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            )}
          >
            {new Date(w.week_of + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </button>
        ))}
      </div>

      {/* Selected week detail */}
      {selectedData && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-inter text-sm text-gray-500">
                  {formatWeekLabel(selectedData.week_of)}
                </span>
              </div>
              <h2 className="font-outfit text-xl font-bold text-gray-900">Weekly Breakdown</h2>
            </div>
            <span className={cn('font-outfit text-2xl font-bold px-4 py-1.5 rounded-xl', getScoreBg(selectedData.avgScore))}>
              {selectedData.avgScore.toFixed(1)}
            </span>
          </div>

          {/* Category scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {categories.map(cat => {
              const score = selectedData.byCategory[cat];
              if (!score) return null;
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-inter text-sm font-medium text-gray-700">{cat}</span>
                    <span className="font-outfit font-bold text-gray-900">{score.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', CATEGORY_COLORS[cat] || 'bg-blue-500')}
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Individual responses */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-outfit font-semibold text-gray-700 mb-3 text-sm">All Responses</h3>
            <div className="space-y-2">
              {questions.map(q => {
                const r = selectedData.responses.find(r => r.question_id === q.id);
                if (!r) return null;
                return (
                  <div key={q.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-inter text-sm text-gray-700 leading-tight">{q.text}</p>
                    </div>
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center font-outfit font-bold text-sm flex-shrink-0', getScoreBg(r.score))}>
                      {r.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
