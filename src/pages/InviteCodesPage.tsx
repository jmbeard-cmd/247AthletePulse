import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteCode } from '@/lib/weekUtils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { Plus, Copy, CheckCircle2, Clock, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InviteCode, Profile, Team } from '@/types/database';

interface InviteWithUsedBy extends InviteCode {
  used_by_profile?: Profile;
}

export function InviteCodesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<InviteWithUsedBy[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newRole, setNewRole] = useState<'coach' | 'athlete' | 'parent'>('athlete');
  const [newEmail, setNewEmail] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = async () => {
    const [{ data: codesData }, { data: teamsData }] = await Promise.all([
      supabase.from('invite_codes').select('*').eq('created_by', user!.id).order('created_at', { ascending: false }),
      supabase.from('teams').select('*').eq('coach_id', user!.id),
    ]);

    if (teamsData) {
      setTeams(teamsData);
      if (teamsData.length > 0) {
        const { data: ta } = await supabase.from('team_athletes').select('athlete_id').in('team_id', teamsData.map(t => t.id));
        const ids = [...new Set((ta ?? []).map(x => x.athlete_id))];
        if (ids.length > 0) {
          const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
          setAthletes(profs ?? []);
        }
      }
    }

    if (codesData) {
      const usedByIds = codesData.map(c => c.used_by).filter(Boolean) as string[];
      let usedProfiles: Profile[] = [];
      if (usedByIds.length > 0) {
        const { data } = await supabase.from('profiles').select('*').in('id', usedByIds);
        usedProfiles = data ?? [];
      }
      const enriched = codesData.map(c => ({
        ...c,
        used_by_profile: usedProfiles.find(p => p.id === c.used_by),
      }));
      setCodes(enriched);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const generateCode = async () => {
    setGenerating(true);
    const code = generateInviteCode();
    const { error } = await supabase.from('invite_codes').insert({
      code,
      role: newRole,
      created_by: user!.id,
      intended_email: newEmail || null,
      athlete_id: (newRole === 'parent' && selectedAthleteId) ? selectedAthleteId : null,
      auto_generated: false,
    });
    setGenerating(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Code generated!', description: `New invite code for ${newRole}` });
      setNewEmail('');
      setSelectedAthleteId('');
      loadData();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: 'Copied!', description: `Code ${code} copied to clipboard` });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const deleteCode = async (id: string) => {
    await supabase.from('invite_codes').delete().eq('id', id);
    loadData();
  };

  const ROLE_COLORS: Record<string, string> = {
    athlete: 'bg-blue-100 text-blue-800',
    coach: 'bg-amber-100 text-amber-800',
    parent: 'bg-purple-100 text-purple-800',
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
      <div>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">Invite Codes</h1>
        <p className="font-inter text-gray-500 mt-1">Generate codes to invite athletes, parents, and coaches</p>
      </div>

      {/* Generate form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-500" />
          <h2 className="font-outfit font-bold text-gray-900">Generate New Code</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label className="font-inter font-medium text-gray-700">Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as 'coach' | 'athlete' | 'parent')}>
              <SelectTrigger className="h-10 font-inter border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="athlete" className="font-inter">Athlete</SelectItem>
                <SelectItem value="parent" className="font-inter">Parent/Guardian</SelectItem>
                {profile?.role === 'admin' && (
                  <SelectItem value="coach" className="font-inter">Coach</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-inter font-medium text-gray-700">Email (optional)</Label>
            <Input
              placeholder="Intended email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="h-10 font-inter border-gray-200"
            />
          </div>

          {newRole === 'parent' && (
            <div className="space-y-2">
              <Label className="font-inter font-medium text-gray-700">Link to Athlete</Label>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="h-10 font-inter border-gray-200">
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map(a => (
                    <SelectItem key={a.id} value={a.id} className="font-inter">{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button
          onClick={generateCode}
          disabled={generating}
          className="bg-blue-700 hover:bg-blue-800 text-white font-inter flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {generating ? 'Generating...' : 'Generate Code'}
        </Button>
      </div>

      {/* Codes list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-outfit font-bold text-gray-900">All Codes ({codes.length})</h2>
        </div>

        {codes.length === 0 ? (
          <div className="p-10 text-center">
            <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-inter text-gray-400 text-sm">No codes generated yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {codes.map(c => (
              <div key={c.id} className={cn('flex items-center gap-4 p-4', c.is_used ? 'opacity-60' : '')}>
                {/* Code */}
                <div className="flex items-center gap-2">
                  <span className="font-outfit font-bold text-xl tracking-widest text-gray-900 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                    {c.code}
                  </span>
                  {!c.is_used && (
                    <button
                      onClick={() => copyCode(c.code)}
                      className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      {copiedCode === c.code ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs font-inter font-semibold px-2 py-0.5 rounded-full', ROLE_COLORS[c.role])}>
                      {c.role}
                    </span>
                    {c.intended_email && (
                      <span className="text-xs font-inter text-gray-500">{c.intended_email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {c.is_used ? (
                      <><CheckCircle2 className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600 font-inter">Used by {c.used_by_profile?.full_name ?? 'unknown'}</span></>
                    ) : (
                      <><Clock className="w-3 h-3 text-gray-300" /><span className="text-xs text-gray-400 font-inter">Unused</span></>
                    )}
                  </div>
                </div>

                {!c.is_used && (
                  <button
                    onClick={() => deleteCode(c.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
