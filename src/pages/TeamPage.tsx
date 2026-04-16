import { useEffect, useState } from 'react';
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
  Users, Plus, Trash2, ChevronDown, ChevronUp,
  UserPlus, Search, X, Loader2, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Team, Profile, SportsList } from '@/types/database';

// ─── Sport emoji ──────────────────────────────────────────────────────────────
const SPORT_EMOJI: Record<string, string> = {
  baseball: '⚾', basketball: '🏀', cheerleading: '📣',
  'cross country': '🏃', football: '🏈', golf: '⛳',
  lacrosse: '🥍', soccer: '⚽', softball: '🥎',
  swimming: '🏊', tennis: '🎾', 'track & field': '🏟️',
  volleyball: '🏐', wrestling: '🤼', 'ice hockey': '🏒',
  'field hockey': '🏑',
};
const sportEmoji = (name: string) => SPORT_EMOJI[name.toLowerCase()] ?? '🏅';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AthleteWithSports {
  profile: Profile;
  sports: SportsList[];
}

interface TeamWithAthletes {
  team: Team;
  athletes: Profile[];
  sport: SportsList | null;
}

// ─── Add Athletes Sheet ───────────────────────────────────────────────────────
// Inline panel that appears below a team row when "Add Athletes" is clicked.
interface AddAthletesPanelProps {
  team: TeamWithAthletes;
  onDone: () => void;
}

function AddAthletesPanel({ team, onDone }: AddAthletesPanelProps) {
  const { toast } = useToast();
  const [athletes, setAthletes] = useState<AthleteWithSports[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Pre-exclude athletes already on the team
  const existingIds = new Set(team.athletes.map(a => a.id));

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'athlete')
        .order('full_name');

      if (!profiles || profiles.length === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }

      const profileIds = profiles.map(p => p.id);
      const { data: athleteSports } = await supabase
        .from('athlete_sports')
        .select('athlete_id, sport_id')
        .in('athlete_id', profileIds);

      const uniqueSportIds = [...new Set((athleteSports ?? []).map(a => a.sport_id))];
      const { data: sportDetails } = uniqueSportIds.length > 0
        ? await supabase.from('sports_list').select('*').in('id', uniqueSportIds)
        : { data: [] as SportsList[] };

      const enriched: AthleteWithSports[] = profiles
        .filter(p => !existingIds.has(p.id))   // hide already-added athletes
        .map(p => {
          const thisSports = (athleteSports ?? [])
            .filter(a => a.athlete_id === p.id)
            .map(a => (sportDetails ?? []).find(s => s.id === a.sport_id))
            .filter(Boolean) as SportsList[];
          return { profile: p, sports: thisSports };
        })
        .filter(a => {
          if (!team.sport) return true;
          return a.sports.some(s => s.id === team.sport!.id);
        });

      setAthletes(enriched);
      setLoading(false);
    };
    load();
  }, []);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) { onDone(); return; }
    setSaving(true);
    const rows = Array.from(selected).map(athlete_id => ({
      team_id: team.team.id,
      athlete_id,
    }));
    const { error } = await supabase
      .from('team_athletes')
      .upsert(rows, { onConflict: 'team_id,athlete_id' });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${selected.size} athlete${selected.size !== 1 ? 's' : ''} added!` });
      onDone();
    }
  };

  const filtered = athletes.filter(a =>
    !search.trim() ||
    (a.profile.full_name ?? '').toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="border-t border-gray-100 bg-blue-50/40">
      {/* Search */}
      <div className="px-5 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            autoFocus
            placeholder="Search athletes by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm font-inter border-gray-200 bg-white"
          />
        </div>
        {team.sport && (
          <p className="font-inter text-xs text-gray-400 mt-1.5">
            Showing athletes who play <span className="font-medium text-blue-700">{team.sport.name}</span>
          </p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="divide-y divide-gray-100 px-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="w-5 h-5 rounded bg-gray-200 animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="font-inter text-sm text-gray-400">
            {athletes.length === 0
              ? 'No athletes available to add.'
              : `No athletes match "${search}".`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto px-5">
          {filtered.map(({ profile, sports: aSports }) => {
            const isChecked = selected.has(profile.id);
            return (
              <label
                key={profile.id}
                className={cn(
                  'flex items-center gap-3 py-3 cursor-pointer transition-colors',
                  isChecked ? 'opacity-100' : 'hover:bg-blue-50/60'
                )}
              >
                <div
                  onClick={() => toggle(profile.id)}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isChecked ? 'bg-blue-700 border-blue-700' : 'border-gray-300 hover:border-gray-400'
                  )}
                >
                  {isChecked && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div
                  onClick={() => toggle(profile.id)}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-outfit font-bold text-xs flex-shrink-0 transition-colors',
                    isChecked ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {profile.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0" onClick={() => toggle(profile.id)}>
                  <p className="font-inter text-sm font-medium text-gray-900 leading-tight">{profile.full_name}</p>
                  {aSports.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {aSports.slice(0, 3).map(s => (
                        <span key={s.id} className="text-[10px] font-inter text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5">
                          {sportEmoji(s.name)} {s.name}
                        </span>
                      ))}
                      {aSports.length > 3 && (
                        <span className="text-[10px] font-inter text-gray-400">+{aSports.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <span className="font-inter text-xs text-gray-400">
          {selected.size > 0 ? (
            <span className="text-blue-700 font-semibold">{selected.size} selected</span>
          ) : 'None selected'}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDone}
            className="h-8 font-inter text-xs"
          >
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={saving}
            className="h-8 bg-blue-700 hover:bg-blue-800 text-white font-inter text-xs flex items-center gap-1.5"
          >
            {saving ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Adding…</>
            ) : (
              <><CheckCircle2 className="w-3 h-3" /> Add to Team</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main TeamPage ────────────────────────────────────────────────────────────
export function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamsData, setTeamsData] = useState<TeamWithAthletes[]>([]);
  const [sports, setSports] = useState<SportsList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [addingToTeam, setAddingToTeam] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSport, setNewTeamSport] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    const [{ data: teamsRaw }, { data: sportsRaw }] = await Promise.all([
      supabase.from('teams').select('*').eq('coach_id', user!.id),
      supabase.from('sports_list').select('*').order('name'),
    ]);
    setSports(sportsRaw ?? []);

    if (teamsRaw && teamsRaw.length > 0) {
      const teamIds = teamsRaw.map(t => t.id);
      const { data: ta } = await supabase.from('team_athletes').select('*').in('team_id', teamIds);
      const athleteIds = [...new Set((ta ?? []).map(x => x.athlete_id))];
      const { data: profiles } = athleteIds.length > 0
        ? await supabase.from('profiles').select('*').in('id', athleteIds)
        : { data: [] as Profile[] };

      const sportIds = teamsRaw.map(t => t.sport_id).filter(Boolean) as string[];
      const { data: sportsList } = sportIds.length > 0
        ? await supabase.from('sports_list').select('*').in('id', sportIds)
        : { data: [] as SportsList[] };

      const combined: TeamWithAthletes[] = teamsRaw.map(team => ({
        team,
        athletes: (ta ?? [])
          .filter(x => x.team_id === team.id)
          .map(x => (profiles ?? []).find(p => p.id === x.athlete_id))
          .filter(Boolean) as Profile[],
        sport: (sportsList ?? []).find(s => s.id === team.sport_id) ?? null,
      }));
      setTeamsData(combined);
    } else {
      setTeamsData([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from('teams').insert({
      name: newTeamName.trim(),
      coach_id: user!.id,
      sport_id: newTeamSport || null,
    });
    setCreating(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team created!' });
      setNewTeamName('');
      setNewTeamSport('');
      setShowCreate(false);
      loadData();
    }
  };

  const removeAthlete = async (teamId: string, athleteId: string) => {
    await supabase.from('team_athletes').delete().eq('team_id', teamId).eq('athlete_id', athleteId);
    loadData();
    toast({ title: 'Athlete removed' });
  };

  const deleteTeam = async (teamId: string) => {
    await supabase.from('teams').delete().eq('id', teamId);
    loadData();
    toast({ title: 'Team deleted' });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-48" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-gray-900">My Teams</h1>
          <p className="font-inter text-gray-500 mt-1">
            {teamsData.length} team{teamsData.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-700 hover:bg-blue-800 text-white font-inter flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Team
        </Button>
      </div>

      {/* Create team form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
          <h2 className="font-outfit font-bold text-gray-900 mb-4">Create New Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-inter font-medium text-gray-700">Team Name</Label>
              <Input
                placeholder='e.g. "Eagles Varsity Baseball"'
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createTeam()}
                className="h-10 font-inter border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-inter font-medium text-gray-700">
                Sport <span className="text-gray-400 font-normal text-xs">Optional</span>
              </Label>
              <Select value={newTeamSport} onValueChange={setNewTeamSport}>
                <SelectTrigger className="h-10 font-inter border-gray-200">
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports.map(s => (
                    <SelectItem key={s.id} value={s.id} className="font-inter">
                      {sportEmoji(s.name)} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={createTeam}
              disabled={!newTeamName.trim() || creating}
              className="bg-blue-700 hover:bg-blue-800 text-white font-inter"
            >
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Team'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="font-inter">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Teams list */}
      {teamsData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-outfit text-lg font-bold text-gray-700 mb-2">No teams yet</h3>
          <p className="font-inter text-gray-400 text-sm">Create your first team above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teamsData.map(teamWithAthletes => {
            const { team, athletes, sport } = teamWithAthletes;
            const isExpanded = expandedTeam === team.id;
            const isAdding = addingToTeam === team.id;

            return (
              <div key={team.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Team header row */}
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-outfit font-bold text-gray-900 truncate">{team.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {sport && (
                          <span className="text-xs font-inter text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {sportEmoji(sport.name)} {sport.name}
                          </span>
                        )}
                        <span className="text-xs font-inter text-gray-400">
                          {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Add athletes button */}
                    <button
                      onClick={() => {
                        setAddingToTeam(isAdding ? null : team.id);
                        setExpandedTeam(null);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-inter font-medium transition-colors',
                        isAdding
                          ? 'bg-blue-700 text-white'
                          : 'text-blue-700 border border-blue-200 hover:bg-blue-50'
                      )}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Athletes</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand roster */}
                    <button
                      onClick={() => {
                        setExpandedTeam(isExpanded ? null : team.id);
                        setAddingToTeam(null);
                      }}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Add athletes panel */}
                {isAdding && (
                  <AddAthletesPanel
                    team={teamWithAthletes}
                    onDone={() => {
                      setAddingToTeam(null);
                      loadData();
                    }}
                  />
                )}

                {/* Roster */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {athletes.length === 0 ? (
                      <div className="text-center py-4">
                        <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-inter text-sm text-gray-400">No athletes yet.</p>
                        <button
                          onClick={() => {
                            setExpandedTeam(null);
                            setAddingToTeam(team.id);
                          }}
                          className="font-inter text-sm text-blue-700 font-medium hover:underline mt-1"
                        >
                          Add athletes now →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {athletes.map(a => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-semibold font-outfit">
                                {a.full_name?.charAt(0).toUpperCase() ?? '?'}
                              </div>
                              <span className="font-inter text-sm font-medium text-gray-800">
                                {a.full_name}
                              </span>
                            </div>
                            <button
                              onClick={() => removeAthlete(team.id, a.id)}
                              className="text-xs text-gray-300 hover:text-red-500 font-inter transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
