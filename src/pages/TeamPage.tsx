import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { Users, Plus, Trash2, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Team, Profile, SportsList } from '@/types/database';

interface TeamWithAthletes {
  team: Team;
  athletes: Profile[];
  sport: SportsList | null;
}

export function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamsData, setTeamsData] = useState<TeamWithAthletes[]>([]);
  const [sports, setSports] = useState<SportsList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
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
        : { data: [] };

      const sportIds = teamsRaw.map(t => t.sport_id).filter(Boolean) as string[];
      const { data: sportsList } = sportIds.length > 0
        ? await supabase.from('sports_list').select('*').in('id', sportIds)
        : { data: [] };

      const combined = teamsRaw.map(team => ({
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-gray-900">My Teams</h1>
          <p className="font-inter text-gray-500 mt-1">{teamsData.length} team{teamsData.length !== 1 ? 's' : ''}</p>
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
                placeholder="e.g. Varsity Baseball"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                className="h-10 font-inter border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-inter font-medium text-gray-700">Sport</Label>
              <Select value={newTeamSport} onValueChange={setNewTeamSport}>
                <SelectTrigger className="h-10 font-inter border-gray-200">
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports.map(s => (
                    <SelectItem key={s.id} value={s.id} className="font-inter">{s.name}</SelectItem>
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
              {creating ? 'Creating...' : 'Create Team'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="font-inter">Cancel</Button>
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
          {teamsData.map(({ team, athletes, sport }) => (
            <div key={team.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-bold text-gray-900">{team.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sport && (
                        <span className="text-xs font-inter text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{sport.name}</span>
                      )}
                      <span className="text-xs font-inter text-gray-400">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteTeam(team.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    {expandedTeam === team.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedTeam === team.id && (
                <div className="border-t border-gray-100 px-5 py-4">
                  {athletes.length === 0 ? (
                    <div className="text-center py-4">
                      <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-inter text-sm text-gray-400">No athletes yet. Use invite codes to add athletes.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {athletes.map(a => (
                        <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-semibold font-outfit">
                              {a.full_name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <span className="font-inter text-sm font-medium text-gray-800">{a.full_name}</span>
                          </div>
                          <button
                            onClick={() => removeAthlete(team.id, a.id)}
                            className="text-xs text-gray-400 hover:text-red-500 font-inter transition-colors"
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
          ))}
        </div>
      )}
    </div>
  );
}
