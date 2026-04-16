import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import {
  CheckCircle2, ChevronRight, ChevronLeft,
  Users, ClipboardList, Search, Loader2,
  UserPlus, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SportsList, Profile } from '@/types/database';

// ─── Sport emoji map ──────────────────────────────────────────────────────────
const SPORT_EMOJI: Record<string, string> = {
  baseball: '⚾', basketball: '🏀', cheerleading: '📣',
  'cross country': '🏃', football: '🏈', golf: '⛳',
  lacrosse: '🥍', soccer: '⚽', softball: '🥎',
  swimming: '🏊', tennis: '🎾', 'track & field': '🏟️',
  volleyball: '🏐', wrestling: '🤼', 'ice hockey': '🏒',
  'field hockey': '🏑',
};
const sportEmoji = (name: string) => SPORT_EMOJI[name.toLowerCase()] ?? '🏅';

// ─── Athlete with their sports ────────────────────────────────────────────────
interface AthleteWithSports {
  profile: Profile;
  sports: SportsList[];
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Create Team' },
    { n: 2, label: 'Add Athletes' },
  ] as const;

  return (
    <div className="w-full mb-8">
      <div className="flex items-center">
        {steps.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-outfit transition-all duration-300',
                  done
                    ? 'bg-green-500 text-white shadow-md shadow-green-900/30'
                    : active
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-900/40 ring-4 ring-amber-500/20'
                      : 'bg-gray-800 text-gray-500 border border-gray-700'
                )}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                </div>
                <span className={cn(
                  'text-xs font-inter font-medium whitespace-nowrap',
                  active ? 'text-white' : done ? 'text-green-400' : 'text-gray-500'
                )}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 mx-3 mb-5">
                  <div className="h-0.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
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

// ─── Pulse logo ───────────────────────────────────────────────────────────────
function PulseLogo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 16h5l3-9 4 18 4-13 3 7 3-3h6"
        stroke="white" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CoachOnboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Step tracking ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1 state ─────────────────────────────────────────────────────────────
  const [sports, setSports] = useState<SportsList[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [teamSportId, setTeamSportId] = useState('');
  const [teamNameError, setTeamNameError] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [createdTeamName, setCreatedTeamName] = useState('');
  const [createdSport, setCreatedSport] = useState<SportsList | null>(null);

  // ── Step 2 state ─────────────────────────────────────────────────────────────
  const [athletes, setAthletes] = useState<AthleteWithSports[]>([]);
  const [athletesLoading, setAthletesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // ── Load sports on mount ─────────────────────────────────────────────────────
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

  // ── Load athletes for step 2 ─────────────────────────────────────────────────
  // Fetches all athlete profiles. If the team has a sport, filters to athletes
  // who have that sport in their athlete_sports; otherwise shows all athletes.
  const loadAthletes = async (sportId: string | null) => {
    setAthletesLoading(true);

    // 1. Get all athlete profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'athlete')
      .order('full_name');

    if (!profiles || profiles.length === 0) {
      setAthletes([]);
      setAthletesLoading(false);
      return;
    }

    // 2. Get all athlete_sports rows for these athletes
    const profileIds = profiles.map(p => p.id);
    const { data: athleteSports } = await supabase
      .from('athlete_sports')
      .select('athlete_id, sport_id')
      .in('athlete_id', profileIds);

    // 3. Get sport details for badge display
    const uniqueSportIds = [...new Set((athleteSports ?? []).map(a => a.sport_id))];
    const { data: sportDetails } = uniqueSportIds.length > 0
      ? await supabase.from('sports_list').select('*').in('id', uniqueSportIds)
      : { data: [] as SportsList[] };

    // 4. Build enriched athlete list
    const enriched: AthleteWithSports[] = profiles
      .map(p => {
        const thisSports = (athleteSports ?? [])
          .filter(a => a.athlete_id === p.id)
          .map(a => (sportDetails ?? []).find(s => s.id === a.sport_id))
          .filter(Boolean) as SportsList[];
        return { profile: p, sports: thisSports };
      })
      .filter(a => {
        // If the team has a sport, only show athletes who play that sport
        if (!sportId) return true;
        return a.sports.some(s => s.id === sportId);
      });

    setAthletes(enriched);
    setAthletesLoading(false);
  };

  // ── Step 1: Create team ───────────────────────────────────────────────────────
  const handleCreateTeam = async () => {
    setTeamNameError('');
    if (!teamName.trim()) {
      setTeamNameError('Team name is required.');
      return;
    }

    setCreatingTeam(true);

    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: teamName.trim(),
        coach_id: user!.id,
        sport_id: teamSportId || null,
      })
      .select()
      .single();

    setCreatingTeam(false);

    if (error || !data) {
      toast({ title: 'Error creating team', description: error?.message, variant: 'destructive' });
      return;
    }

    const sport = sports.find(s => s.id === teamSportId) ?? null;
    setCreatedTeamId(data.id);
    setCreatedTeamName(data.name);
    setCreatedSport(sport);

    // Load athletes filtered to the team's sport
    await loadAthletes(teamSportId || null);
    setStep(2);
  };

  // ── Step 2: Toggle athlete selection ─────────────────────────────────────────
  const toggleAthlete = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Step 2: Finish ────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    setSubmitting(true);

    // Insert team_athletes rows for checked athletes (skip if none checked)
    if (selected.size > 0 && createdTeamId) {
      const rows = Array.from(selected).map(athlete_id => ({
        team_id: createdTeamId,
        athlete_id,
      }));
      const { error } = await supabase
        .from('team_athletes')
        .upsert(rows, { onConflict: 'team_id,athlete_id' });

      if (error) {
        toast({ title: 'Error adding athletes', description: error.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
    }

    // Mark onboarding complete
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user!.id);

    if (profileErr) {
      toast({ title: 'Error updating profile', description: profileErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    setSubmitting(false);

    toast({
      title: 'Team created!',
      description: selected.size > 0
        ? `${selected.size} athlete${selected.size !== 1 ? 's' : ''} added to ${createdTeamName}.`
        : `${createdTeamName} is ready. Add athletes anytime from your dashboard.`,
    });

    navigate('/dashboard');
  };

  // ── Filtered athlete list ─────────────────────────────────────────────────────
  const filtered = athletes.filter(a =>
    !search.trim() ||
    (a.profile.full_name ?? '').toLowerCase().includes(search.trim().toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 py-10">
      {/* Background glow — amber tint to distinguish from athlete onboarding */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-gray-950 to-gray-950 pointer-events-none" />

      <div className="relative w-full max-w-xl">
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow shadow-amber-900/50 flex-shrink-0">
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

        {/* ═══════════════════════════════════════════════════════════════════════
            STEP 1 — Create Your Team
        ═══════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="font-outfit text-xl font-bold text-white">Create Your Team</h2>
            </div>
            <p className="font-inter text-sm text-gray-400 mb-6 ml-12">
              Give your team a name and choose the sport you coach.
            </p>

            <div className="space-y-5">
              {/* Team name */}
              <div className="space-y-1.5">
                <Label htmlFor="teamName" className="font-inter text-sm font-medium text-gray-300 flex items-center gap-1">
                  Team Name
                  <span className="text-red-400 text-xs">*</span>
                </Label>
                <Input
                  id="teamName"
                  type="text"
                  placeholder='e.g. "Eagles Varsity Baseball"'
                  value={teamName}
                  onChange={e => {
                    setTeamName(e.target.value);
                    setTeamNameError('');
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                  className={cn(
                    'h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-amber-500 focus:ring-amber-500/20 font-inter',
                    teamNameError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  )}
                />
                {teamNameError && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <p className="font-inter text-xs text-red-400">{teamNameError}</p>
                  </div>
                )}
              </div>

              {/* Sport selector */}
              <div className="space-y-1.5">
                <Label className="font-inter text-sm font-medium text-gray-300">
                  Sport
                  <span className="text-gray-600 text-xs font-normal ml-2">Optional</span>
                </Label>
                {sportsLoading ? (
                  <div className="h-11 bg-gray-800 rounded-xl animate-pulse" />
                ) : (
                  <Select value={teamSportId} onValueChange={setTeamSportId}>
                    <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white focus:border-amber-500 focus:ring-amber-500/20 font-inter data-[placeholder]:text-gray-500">
                      <SelectValue placeholder="Select a sport…" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {sports.map(s => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          className="font-inter text-gray-200 focus:bg-gray-700 focus:text-white"
                        >
                          {sportEmoji(s.name)} {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {teamSportId && (
                  <p className="font-inter text-xs text-gray-500">
                    Athletes who play {sports.find(s => s.id === teamSportId)?.name ?? 'this sport'} will be suggested in the next step.
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleCreateTeam}
              disabled={creatingTeam || !teamName.trim()}
              className="w-full h-11 mt-6 bg-amber-500 hover:bg-amber-400 text-gray-950 font-inter font-semibold rounded-xl shadow-lg shadow-amber-900/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creatingTeam ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating team…</>
              ) : (
                <>Create Team <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            STEP 2 — Add Athletes
        ═══════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-7 pb-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="font-outfit text-xl font-bold text-white">Add Athletes to Your Team</h2>
              </div>
              <p className="font-inter text-sm text-gray-400 ml-12">
                {createdSport
                  ? <>Showing athletes who play <span className="text-amber-400 font-medium">{createdSport.name}</span>. You can add more anytime.</>
                  : 'Select athletes to add to your team. You can add more anytime from your dashboard.'
                }
              </p>

              {/* Team name pill */}
              <div className="mt-4 ml-12 inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-inter text-xs font-semibold text-gray-200">{createdTeamName}</span>
                {createdSport && (
                  <>
                    <span className="text-gray-600">·</span>
                    <span className="font-inter text-xs text-gray-400">
                      {sportEmoji(createdSport.name)} {createdSport.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="px-7 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search athletes by name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-10 pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-amber-500 focus:ring-amber-500/20 font-inter text-sm"
                />
              </div>
            </div>

            {/* Athlete list */}
            <div className="border-t border-gray-800">
              {athletesLoading ? (
                <div className="divide-y divide-gray-800">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-7 py-4">
                      <div className="w-5 h-5 rounded bg-gray-800 animate-pulse flex-shrink-0" />
                      <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-gray-800 rounded w-36 animate-pulse" />
                        <div className="h-3 bg-gray-800 rounded w-20 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 px-7 text-center">
                  <UserPlus className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  {athletes.length === 0 ? (
                    <>
                      <p className="font-inter text-sm text-gray-400 font-medium">No athletes have signed up yet</p>
                      <p className="font-inter text-xs text-gray-600 mt-1">
                        Generate invite codes from your dashboard to invite athletes.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-inter text-sm text-gray-400 font-medium">No athletes match "{search}"</p>
                      <p className="font-inter text-xs text-gray-600 mt-1">Try a different name.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-800/70 max-h-72 overflow-y-auto">
                  {filtered.map(({ profile, sports: aSports }) => {
                    const isSelected = selected.has(profile.id);
                    return (
                      <label
                        key={profile.id}
                        className={cn(
                          'flex items-center gap-4 px-7 py-3.5 cursor-pointer transition-colors select-none',
                          isSelected ? 'bg-amber-500/8' : 'hover:bg-gray-800/60'
                        )}
                      >
                        {/* Custom checkbox */}
                        <div
                          onClick={() => toggleAthlete(profile.id)}
                          className={cn(
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150',
                            isSelected
                              ? 'bg-amber-500 border-amber-500'
                              : 'border-gray-600 hover:border-gray-400'
                          )}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-950" />
                            </svg>
                          )}
                        </div>

                        {/* Avatar */}
                        <div
                          onClick={() => toggleAthlete(profile.id)}
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center font-outfit font-bold text-sm flex-shrink-0 transition-colors',
                            isSelected ? 'bg-amber-500 text-gray-950' : 'bg-gray-700 text-gray-300'
                          )}
                        >
                          {profile.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>

                        {/* Name + sport badges */}
                        <div className="flex-1 min-w-0" onClick={() => toggleAthlete(profile.id)}>
                          <p className={cn(
                            'font-inter text-sm font-semibold leading-tight transition-colors',
                            isSelected ? 'text-white' : 'text-gray-200'
                          )}>
                            {profile.full_name ?? 'Unknown Athlete'}
                          </p>
                          {aSports.length > 0 ? (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {aSports.slice(0, 3).map(s => (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center gap-1 text-[10px] font-inter font-medium bg-gray-800 border border-gray-700 text-gray-400 rounded-full px-2 py-0.5"
                                >
                                  {sportEmoji(s.name)} {s.name}
                                </span>
                              ))}
                              {aSports.length > 3 && (
                                <span className="text-[10px] font-inter text-gray-600">
                                  +{aSports.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="font-inter text-[11px] text-gray-600 mt-0.5">No sports listed</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-7 py-5 border-t border-gray-800 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="h-11 px-4 border-gray-700 bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 font-inter flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>

              <div className="flex-1 flex items-center justify-between gap-3">
                {/* Selection count */}
                <p className="font-inter text-xs text-gray-500 flex-shrink-0">
                  {selected.size > 0
                    ? <span className="text-amber-400 font-semibold">{selected.size} selected</span>
                    : 'None selected — you can skip'
                  }
                </p>

                <Button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="h-11 bg-amber-500 hover:bg-amber-400 text-gray-950 font-inter font-semibold rounded-xl shadow-lg shadow-amber-900/20 transition-all duration-200 flex items-center gap-2 px-5 disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Finish Setup</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <p className="text-center mt-4 font-inter text-xs text-gray-600">
          Step {step} of 2
        </p>
      </div>
    </div>
  );
}
