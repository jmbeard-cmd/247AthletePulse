import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteCode } from '@/lib/weekUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Mail,
  Users, Dumbbell, AlertCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SportsList } from '@/types/database';

// ─── Sport icon map (emoji fallback keyed to lowercase name) ─────────────────
const SPORT_EMOJI: Record<string, string> = {
  baseball: '⚾', basketball: '🏀', cheerleading: '📣',
  'cross country': '🏃', football: '🏈', golf: '⛳',
  lacrosse: '🥍', soccer: '⚽', softball: '🥎',
  swimming: '🏊', tennis: '🎾', 'track & field': '🏟️',
  volleyball: '🏐', wrestling: '🤼', 'ice hockey': '🏒',
  'field hockey': '🏑',
};

function sportEmoji(name: string) {
  return SPORT_EMOJI[name.toLowerCase()] ?? '🏅';
}

// ─── Email validation ─────────────────────────────────────────────────────────
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Step progress bar ────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Your Sports' },
    { n: 2, label: 'Parents & Guardians' },
  ];
  return (
    <div className="w-full mb-8">
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-outfit transition-all duration-300',
                    done
                      ? 'bg-green-500 text-white shadow-md shadow-green-900/30'
                      : active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-4 ring-blue-600/20'
                        : 'bg-gray-800 text-gray-500 border border-gray-700'
                  )}
                >
                  {done ? <CheckCircle2 className="w-4.5 h-4.5" /> : s.n}
                </div>
                <span
                  className={cn(
                    'text-xs font-inter font-medium whitespace-nowrap',
                    active ? 'text-white' : done ? 'text-green-400' : 'text-gray-500'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {/* Connector (not after last) */}
              {i < steps.length - 1 && (
                <div className="flex-1 mx-3 mb-5">
                  <div className="h-0.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: done ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AthleteOnboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [sports, setSports] = useState<SportsList[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set());

  // Step 2
  const [parentEmail1, setParentEmail1] = useState('');
  const [parentEmail2, setParentEmail2] = useState('');
  const [email1Error, setEmail1Error] = useState('');
  const [email2Error, setEmail2Error] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // ── Load sports ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('sports_list')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setSports(data ?? []);
        setSportsLoading(false);
      });
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const toggleSport = (id: string) => {
    setSelectedSports(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────────
  const goToStep2 = () => {
    // Sports are optional — athlete can skip them
    setStep(2);
  };

  // ── Final submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validate emails
    let valid = true;
    setEmail1Error('');
    setEmail2Error('');

    const e1 = parentEmail1.trim();
    const e2 = parentEmail2.trim();

    if (!e1) {
      setEmail1Error('At least one parent or guardian email is required.');
      valid = false;
    } else if (!isValidEmail(e1)) {
      setEmail1Error('Please enter a valid email address.');
      valid = false;
    }

    if (e2 && !isValidEmail(e2)) {
      setEmail2Error('Please enter a valid email address.');
      valid = false;
    }

    if (!valid) return;

    setSubmitting(true);

    // 1. Save athlete_sports (skip if none selected — that's fine)
    if (selectedSports.size > 0) {
      const rows = Array.from(selectedSports).map(sport_id => ({
        athlete_id: user!.id,
        sport_id,
      }));
      const { error: sportsErr } = await supabase
        .from('athlete_sports')
        .upsert(rows, { onConflict: 'athlete_id,sport_id' });

      if (sportsErr) {
        toast({ title: 'Error saving sports', description: sportsErr.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
    }

    // 2. Generate invite codes for each parent email
    const emails = [e1, e2 ? e2 : null].filter(Boolean) as string[];
    const codeInserts = emails.map(email => ({
      code: generateInviteCode(),
      role: 'parent' as const,
      created_by: user!.id,
      athlete_id: user!.id,
      intended_email: email,
      is_used: false,
      auto_generated: true,
    }));

    const { error: codesErr } = await supabase
      .from('invite_codes')
      .insert(codeInserts);

    if (codesErr) {
      toast({ title: 'Error creating invite codes', description: codesErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // 3. Mark onboarding complete
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user!.id);

    if (profileErr) {
      toast({ title: 'Error updating profile', description: profileErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // 4. Refresh auth context so DashboardRouter sees the new state
    await refreshProfile();

    setSubmitting(false);
    toast({ title: 'All set!', description: 'Welcome to 247 Athlete Pulse.' });
    navigate('/dashboard');
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 py-10">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/25 via-gray-950 to-gray-950 pointer-events-none" />

      <div className="relative w-full max-w-xl">
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow shadow-blue-900/50 flex-shrink-0">
            <PulseLogo />
          </div>
          <div>
            <p className="font-outfit text-white font-bold text-base leading-tight">247 Athlete Pulse</p>
            <p className="font-inter text-amber-400 text-[10px] font-semibold tracking-widest uppercase">
              Fight. Finish. Faith.
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar step={step} />

        {/* ── STEP 1: Sports ── */}
        {step === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <h2 className="font-outfit text-xl font-bold text-white">Select Your Sports</h2>
            </div>
            <p className="font-inter text-sm text-gray-400 mb-6 ml-12">
              Choose every sport you compete in — you can update this later.
            </p>

            {sportsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-gray-800 animate-pulse" />
                ))}
              </div>
            ) : sports.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-gray-700 rounded-xl">
                <Dumbbell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="font-inter text-sm text-gray-500">
                  No sports added yet.
                </p>
                <p className="font-inter text-xs text-gray-600 mt-0.5">
                  Ask your coach or admin to add sports to the platform.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {sports.map(sport => {
                  const selected = selectedSports.has(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id)}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 cursor-pointer group',
                        selected
                          ? 'border-blue-500 bg-blue-600/15 shadow-sm shadow-blue-900/30'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                      )}
                    >
                      {/* Check badge */}
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <span className="text-2xl leading-none select-none">{sportEmoji(sport.name)}</span>
                      <span
                        className={cn(
                          'font-inter text-[11px] font-medium text-center leading-tight transition-colors',
                          selected ? 'text-blue-300' : 'text-gray-400 group-hover:text-gray-200'
                        )}
                      >
                        {sport.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selection count */}
            <div className="mt-4 flex items-center justify-between">
              <p className="font-inter text-xs text-gray-500">
                {selectedSports.size > 0
                  ? `${selectedSports.size} sport${selectedSports.size !== 1 ? 's' : ''} selected`
                  : 'No sports selected — you can skip this'}
              </p>
              {selectedSports.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSports(new Set())}
                  className="font-inter text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
                >
                  Clear all
                </button>
              )}
            </div>

            <Button
              onClick={goToStep2}
              className="w-full h-11 mt-6 bg-blue-600 hover:bg-blue-500 text-white font-inter font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all duration-200 flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ── STEP 2: Parent email ── */}
        {step === 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-purple-600/20 rounded-xl flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-purple-400" />
              </div>
              <h2 className="font-outfit text-xl font-bold text-white">Connect Your Parent or Guardian</h2>
            </div>
            <p className="font-inter text-sm text-gray-400 mb-6 ml-12">
              We'll send them a link to view your progress.
            </p>

            <div className="space-y-5">
              {/* Email 1 — required */}
              <div className="space-y-1.5">
                <Label htmlFor="email1" className="font-inter text-sm font-medium text-gray-300 flex items-center gap-1.5">
                  Parent / Guardian Email
                  <span className="text-red-400 text-xs">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <Input
                    id="email1"
                    type="email"
                    autoComplete="off"
                    placeholder="parent@example.com"
                    value={parentEmail1}
                    onChange={e => {
                      setParentEmail1(e.target.value);
                      setEmail1Error('');
                    }}
                    className={cn(
                      'h-11 pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 font-inter',
                      email1Error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    )}
                  />
                </div>
                {email1Error && (
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="font-inter text-xs text-red-400 leading-snug">{email1Error}</p>
                  </div>
                )}
              </div>

              {/* Email 2 — optional */}
              <div className="space-y-1.5">
                <Label htmlFor="email2" className="font-inter text-sm font-medium text-gray-300 flex items-center justify-between">
                  Second Parent / Guardian Email
                  <span className="text-gray-600 text-xs font-normal">Optional</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <Input
                    id="email2"
                    type="email"
                    autoComplete="off"
                    placeholder="other.parent@example.com"
                    value={parentEmail2}
                    onChange={e => {
                      setParentEmail2(e.target.value);
                      setEmail2Error('');
                    }}
                    className={cn(
                      'h-11 pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 font-inter',
                      email2Error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    )}
                  />
                </div>
                {email2Error && (
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="font-inter text-xs text-red-400 leading-snug">{email2Error}</p>
                  </div>
                )}
              </div>

              {/* Info callout */}
              <div className="flex items-start gap-3 bg-gray-800/60 border border-gray-700/60 rounded-xl p-3.5">
                <Mail className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="font-inter text-xs text-gray-400 leading-relaxed">
                  Your parent or guardian will receive an invite code they can use to create an account and view your weekly check-in results.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="h-11 px-4 border-gray-700 bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 font-inter flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white font-inter font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up your account…
                  </>
                ) : (
                  <>
                    Finish Setup
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step indicator text */}
        <p className="text-center mt-4 font-inter text-xs text-gray-600">
          Step {step} of 2
        </p>
      </div>
    </div>
  );
}

function PulseLogo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 16h5l3-9 4 18 4-13 3 7 3-3h6"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
