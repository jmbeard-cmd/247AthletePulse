import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentWeekMonday, formatWeekLabel } from '@/lib/weekUtils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { 
  CheckCircle2, ChevronRight, ChevronLeft, Calendar,
  Zap, Heart, Target, Users, Brain, Star, Shield, Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question, Response } from '@/types/database';

const CATEGORY_ICONS: Record<string, ReactNode> = {
  Mindset: <Brain className="w-4 h-4" />,
  Relationships: <Users className="w-4 h-4" />,
  Growth: <Zap className="w-4 h-4" />,
  Preparation: <Shield className="w-4 h-4" />,
  Family: <Heart className="w-4 h-4" />,
  Competition: <Star className="w-4 h-4" />,
  Goals: <Target className="w-4 h-4" />,
  Wellness: <Smile className="w-4 h-4" />,
  Connection: <Users className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  Mindset: 'bg-blue-100 text-blue-700',
  Relationships: 'bg-purple-100 text-purple-700',
  Growth: 'bg-green-100 text-green-700',
  Preparation: 'bg-indigo-100 text-indigo-700',
  Family: 'bg-pink-100 text-pink-700',
  Competition: 'bg-amber-100 text-amber-700',
  Goals: 'bg-orange-100 text-orange-700',
  Wellness: 'bg-teal-100 text-teal-700',
  Connection: 'bg-cyan-100 text-cyan-700',
};

const SCORE_LABELS: Record<number, string> = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree',
};

const SCORE_COLORS: Record<number, string> = {
  1: 'border-red-300 bg-red-50 hover:bg-red-100',
  2: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
  3: 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100',
  4: 'border-green-300 bg-green-50 hover:bg-green-100',
  5: 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100',
};

const SCORE_SELECTED: Record<number, string> = {
  1: 'border-red-500 bg-red-500 text-white',
  2: 'border-orange-500 bg-orange-500 text-white',
  3: 'border-yellow-500 bg-yellow-500 text-white',
  4: 'border-green-500 bg-green-500 text-white',
  5: 'border-emerald-500 bg-emerald-500 text-white',
};

import type { ReactNode } from 'react';

export function CheckInPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const weekOf = getCurrentWeekMonday();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [existingResponses, setExistingResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [{ data: qs }, { data: rs }] = await Promise.all([
        supabase.from('questions').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('responses').select('*').eq('athlete_id', user!.id).eq('week_of', weekOf),
      ]);
      if (qs) setQuestions(qs);
      if (rs && rs.length > 0) {
        const map: Record<string, number> = {};
        rs.forEach(r => { map[r.question_id] = r.score; });
        setAnswers(map);
        setExistingResponses(rs);
        if (rs.length >= (qs?.length ?? 0)) setCompleted(true);
      }
      setLoading(false);
    };
    load();
  }, [user, weekOf]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const handleScore = (score: number) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: score }));
    // Auto-advance
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(i => i + 1), 350);
    }
  };

  const handleSubmit = async () => {
    if (!user || !allAnswered) return;
    setSubmitting(true);

    const upserts = questions.map(q => ({
      athlete_id: user.id,
      question_id: q.id,
      score: answers[q.id],
      week_of: weekOf,
    }));

    const { error } = await supabase.from('responses').upsert(upserts, {
      onConflict: 'athlete_id,question_id,week_of',
    });

    setSubmitting(false);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      setCompleted(true);
      toast({ title: 'Check-in complete!', description: 'Your responses have been saved.' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-xl w-1/2" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (completed) {
    const avgScore = Object.values(answers).reduce((a, b) => a + b, 0) / Object.values(answers).length;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="font-outfit text-3xl font-bold text-gray-900 mb-2">Check-In Complete!</h1>
          <p className="font-inter text-gray-500 mb-6">
            Week of {formatWeekLabel(weekOf)}
          </p>

          <div className="bg-blue-50 rounded-2xl p-6 mb-6">
            <p className="font-inter text-sm text-blue-600 font-medium mb-1">Your average score</p>
            <p className="font-outfit text-5xl font-bold text-blue-700">{avgScore.toFixed(1)}</p>
            <p className="font-inter text-sm text-blue-500 mt-1">out of 5.0</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            {questions.map(q => (
              <div key={q.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn('text-xs font-inter font-medium px-2 py-0.5 rounded-full', CATEGORY_COLORS[q.category] || 'bg-gray-100 text-gray-600')}>
                    {q.category}
                  </span>
                  <span className="font-outfit font-bold text-gray-900">{answers[q.id]}</span>
                </div>
                <p className="text-xs text-gray-600 font-inter leading-tight line-clamp-2">{q.text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => { setCompleted(false); setCurrentIndex(0); }}
              className="flex-1 font-inter"
            >
              Edit Responses
            </Button>
            <Button
              onClick={() => navigate('/progress')}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-inter"
            >
              View Progress
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const catColor = CATEGORY_COLORS[currentQuestion.category] || 'bg-gray-100 text-gray-600';
  const selectedScore = answers[currentQuestion.id];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-blue-700" />
          <span className="font-inter text-sm text-gray-500">Week of {formatWeekLabel(weekOf)}</span>
        </div>
        <h1 className="font-outfit text-2xl font-bold text-gray-900">Weekly Check-In</h1>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-inter text-sm font-medium text-gray-700">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="font-inter text-sm text-gray-500">{answeredCount} answered</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-700 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-inter font-semibold px-2.5 py-1 rounded-full', catColor)}>
              {CATEGORY_ICONS[currentQuestion.category]}
              {currentQuestion.category}
            </span>
          </div>
          <p className="font-outfit text-xl font-semibold leading-snug">{currentQuestion.text}</p>
        </div>

        <div className="p-6">
          <p className="font-inter text-sm text-gray-500 mb-4 text-center">Rate your agreement (1 = Strongly Disagree, 5 = Strongly Agree)</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(score => (
              <button
                key={score}
                onClick={() => handleScore(score)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 cursor-pointer',
                  selectedScore === score
                    ? SCORE_SELECTED[score]
                    : SCORE_COLORS[score]
                )}
              >
                <span className="font-outfit text-2xl font-bold">{score}</span>
                <span className={cn('text-xs font-inter leading-tight text-center hidden sm:block', selectedScore === score ? 'text-white/90' : 'text-gray-500')}>
                  {SCORE_LABELS[score]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 font-inter"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>

        {/* Question dots */}
        <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all duration-150',
                idx === currentIndex ? 'bg-blue-700 w-5' :
                answers[q.id] ? 'bg-green-500' : 'bg-gray-200'
              )}
            />
          ))}
        </div>

        {currentIndex < questions.length - 1 ? (
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(i => i + 1)}
            className="flex items-center gap-2 font-inter"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="bg-blue-700 hover:bg-blue-800 text-white font-inter flex items-center gap-2"
          >
            {submitting ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Submit</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
