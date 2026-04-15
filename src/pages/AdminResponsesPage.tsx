import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentWeekMonday, formatWeekLabel, getScoreBg } from '@/lib/weekUtils';
import { cn } from '@/lib/utils';
import { BarChart3, Calendar, ChevronDown, Shield } from 'lucide-react';
import type { Profile, Question, Response } from '@/types/database';

interface AthleteReport {
  profile: Profile;
  responses: Response[];
  avgScore: number | null;
}

export function AdminResponsesPage() {
  const [weekOf, setWeekOf] = useState(getCurrentWeekMonday());
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [reports, setReports] = useState<AthleteReport[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: qs }, { data: allProfiles }, { data: allResponses }, { data: weekResponses }] = await Promise.all([
        supabase.from('questions').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('profiles').select('*').eq('role', 'athlete').order('full_name'),
        supabase.from('responses').select('week_of'),
        supabase.from('responses').select('*').eq('week_of', weekOf),
      ]);

      if (qs) setQuestions(qs);

      const weeks = [...new Set((allResponses ?? []).map(r => r.week_of))].sort((a, b) => b.localeCompare(a));
      setAvailableWeeks(weeks);

      if (allProfiles) {
        const rpts: AthleteReport[] = allProfiles.map(p => {
          const pr = (weekResponses ?? []).filter(r => r.athlete_id === p.id);
          return {
            profile: p,
            responses: pr,
            avgScore: pr.length > 0 ? pr.reduce((a, b) => a + b.score, 0) / pr.length : null,
          };
        });
        setReports(rpts.sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1)));
      }
      setLoading(false);
    };
    load();
  }, [weekOf]);

  const selectedReport = reports.find(r => r.profile.id === selectedAthlete);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="font-inter text-sm text-red-500 font-medium">Admin</span>
          </div>
          <h1 className="font-outfit text-3xl font-bold text-gray-900">All Responses</h1>
          <p className="font-inter text-gray-500 mt-1">{reports.filter(r => r.avgScore != null).length} athletes checked in this week</p>
        </div>

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
              {availableWeeks.slice(0, 12).map(w => (
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
              {availableWeeks.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400 font-inter">No weeks with data</p>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Athletes list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-outfit font-bold text-gray-900">All Athletes</h2>
              <span className="font-inter text-xs text-gray-400">{reports.length} total</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {reports.map(r => (
                <button
                  key={r.profile.id}
                  onClick={() => setSelectedAthlete(r.profile.id === selectedAthlete ? null : r.profile.id)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 text-left transition-colors',
                    r.profile.id === selectedAthlete ? 'bg-blue-50' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="w-9 h-9 bg-blue-700 rounded-full flex items-center justify-center text-white font-semibold font-outfit text-sm flex-shrink-0">
                    {r.profile.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter font-semibold text-gray-900 text-sm truncate">{r.profile.full_name}</p>
                    <p className="text-xs font-inter text-gray-400">
                      {r.avgScore != null ? `${r.responses.length} responses` : 'Not submitted'}
                    </p>
                  </div>
                  {r.avgScore != null && (
                    <span className={cn('font-outfit font-bold text-sm px-2.5 py-1 rounded-lg flex-shrink-0', getScoreBg(r.avgScore))}>
                      {r.avgScore.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
              {reports.length === 0 && (
                <div className="p-8 text-center">
                  <p className="font-inter text-gray-400 text-sm">No athletes yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Detail */}
          {selectedReport ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold font-outfit text-sm">
                  {selectedReport.profile.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                  <h2 className="font-outfit font-bold text-gray-900">{selectedReport.profile.full_name}</h2>
                  {selectedReport.avgScore != null && (
                    <span className={cn('text-xs font-inter font-semibold px-2 py-0.5 rounded-full', getScoreBg(selectedReport.avgScore))}>
                      {selectedReport.avgScore.toFixed(1)} avg
                    </span>
                  )}
                </div>
              </div>
              {selectedReport.avgScore == null ? (
                <p className="text-gray-400 font-inter text-sm">No responses for this week.</p>
              ) : (
                <div className="space-y-2.5">
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
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-10 text-center flex flex-col items-center justify-center">
              <BarChart3 className="w-10 h-10 text-gray-300 mb-3" />
              <p className="font-inter text-gray-400 text-sm">Select an athlete to view responses</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
