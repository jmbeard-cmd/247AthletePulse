import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteCode } from '@/lib/weekUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import {
  Shield, Star, Dumbbell, Users, HelpCircle,
  Plus, Trash2, Copy, CheckCircle2, Search,
  Pencil, Check, X, ToggleLeft, ToggleRight,
  AlertTriangle, Loader2, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  InviteCode, Profile, SportsList, Question, UserRole,
} from '@/types/database';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  athlete: 'bg-blue-100 text-blue-700 border-blue-200',
  coach:   'bg-amber-100 text-amber-700 border-amber-200',
  parent:  'bg-purple-100 text-purple-700 border-purple-200',
  admin:   'bg-red-100 text-red-700 border-red-200',
};

const CATEGORY_BADGE: Record<string, string> = {
  Mindset:      'bg-blue-50 text-blue-700',
  Relationships:'bg-purple-50 text-purple-700',
  Growth:       'bg-green-50 text-green-700',
  Preparation:  'bg-indigo-50 text-indigo-700',
  Family:       'bg-pink-50 text-pink-700',
  Competition:  'bg-amber-50 text-amber-700',
  Goals:        'bg-orange-50 text-orange-700',
  Wellness:     'bg-teal-50 text-teal-700',
  Connection:   'bg-cyan-50 text-cyan-700',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn(
      'inline-block px-2 py-0.5 rounded-full text-xs font-inter font-semibold border capitalize',
      ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600 border-gray-200',
    )}>
      {role}
    </span>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Section({
  id, icon, title, subtitle, children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Navy header */}
      <div className="bg-navy-gradient px-6 py-4 flex items-center gap-3 bg-[#0f172a]">
        <span className="text-white/70">{icon}</span>
        <div>
          <h2 className="font-outfit text-base font-bold text-white">{title}</h2>
          <p className="font-inter text-xs text-white/50">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Invite Code Manager
// ═════════════════════════════════════════════════════════════════════════════

interface EnrichedCode extends InviteCode {
  usedByName?: string;
  athleteName?: string;
}

function InviteCodeManager() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [codes, setCodes] = useState<EnrichedCode[]>([]);
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [genRole, setGenRole] = useState<'coach' | 'athlete' | 'parent'>('athlete');
  const [genAthleteId, setGenAthleteId] = useState('');
  const [genEmail, setGenEmail] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Newly generated code flash
  const [flashCode, setFlashCode] = useState<string | null>(null);

  const load = async () => {
    const [{ data: codesData }, { data: athleteData }] = await Promise.all([
      supabase.from('invite_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'athlete').order('full_name'),
    ]);
    setAthletes(athleteData ?? []);

    if (codesData) {
      const usedIds = codesData.map(c => c.used_by).filter(Boolean) as string[];
      let usedProfiles: Profile[] = [];
      if (usedIds.length > 0) {
        const { data } = await supabase.from('profiles').select('id, full_name').in('id', usedIds);
        usedProfiles = (data ?? []) as Profile[];
      }
      setCodes(codesData.map(c => ({
        ...c,
        usedByName: usedProfiles.find(p => p.id === c.used_by)?.full_name ?? undefined,
        athleteName: (athleteData ?? []).find(a => a.id === c.athlete_id)?.full_name ?? undefined,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    const code = generateInviteCode();
    const { error } = await supabase.from('invite_codes').insert({
      code,
      role: genRole,
      created_by: user!.id,
      athlete_id: genRole === 'parent' && genAthleteId ? genAthleteId : null,
      intended_email: genEmail.trim() || null,
      is_used: false,
      auto_generated: false,
    });
    setGenerating(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setFlashCode(code);
    setGenEmail('');
    setGenAthleteId('');
    setShowForm(false);
    await load();
    setTimeout(() => setFlashCode(null), 8000);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast({ title: 'Copied!', description: code });
    setTimeout(() => setCopied(null), 2500);
  };

  const deleteCode = async (id: string) => {
    await supabase.from('invite_codes').delete().eq('id', id);
    setConfirmDelete(null);
    load();
    toast({ title: 'Code deleted' });
  };

  return (
    <Section
      id="invites"
      icon={<Star className="w-4 h-4" />}
      title="Invite Code Manager"
      subtitle="Generate and track access codes for coaches, athletes, and parents"
    >
      <div className="p-6 space-y-5">
        {/* Flash: newly generated code */}
        {flashCode && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-inter text-xs text-green-700 font-medium">New code generated</p>
                <p className="font-outfit font-bold text-xl tracking-widest text-green-800">{flashCode}</p>
              </div>
            </div>
            <button
              onClick={() => copyCode(flashCode)}
              className="p-2 rounded-lg hover:bg-green-100 text-green-700 transition-colors"
            >
              {copied === flashCode ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Generate form toggle */}
        <div className="flex items-center justify-between">
          <p className="font-inter text-sm text-gray-500">{codes.length} code{codes.length !== 1 ? 's' : ''} total</p>
          <Button
            onClick={() => setShowForm(v => !v)}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-inter text-sm flex items-center gap-2 h-9"
          >
            <Plus className="w-4 h-4" />
            Generate Code
            <ChevronDown className={cn('w-3 h-3 transition-transform', showForm && 'rotate-180')} />
          </Button>
        </div>

        {/* Inline generator form */}
        {showForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-inter text-xs font-medium text-gray-600">Role</label>
                <Select value={genRole} onValueChange={v => setGenRole(v as typeof genRole)}>
                  <SelectTrigger className="h-9 text-sm font-inter bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="athlete" className="font-inter text-sm">Athlete</SelectItem>
                    <SelectItem value="coach"   className="font-inter text-sm">Coach</SelectItem>
                    <SelectItem value="parent"  className="font-inter text-sm">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-inter text-xs font-medium text-gray-600">
                  Email <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input
                  type="email"
                  placeholder="intended@email.com"
                  value={genEmail}
                  onChange={e => setGenEmail(e.target.value)}
                  className="h-9 text-sm font-inter bg-white border-gray-200"
                />
              </div>

              {genRole === 'parent' && (
                <div className="space-y-1">
                  <label className="font-inter text-xs font-medium text-gray-600">
                    Link to Athlete <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Select value={genAthleteId} onValueChange={setGenAthleteId}>
                    <SelectTrigger className="h-9 text-sm font-inter bg-white border-gray-200">
                      <SelectValue placeholder="Select athlete…" />
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map(a => (
                        <SelectItem key={a.id} value={a.id} className="font-inter text-sm">
                          {a.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={generate}
                disabled={generating}
                className="h-9 bg-[#0f172a] hover:bg-[#1e293b] text-white font-inter text-sm flex items-center gap-2"
              >
                {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : 'Generate'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="font-inter text-sm h-9">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Codes table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">For</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-inter text-sm text-gray-400">
                    No codes yet. Generate one above.
                  </td>
                </tr>
              ) : (
                codes.map(c => (
                  <tr key={c.id} className={cn('hover:bg-gray-50 transition-colors', c.id === flashCode && 'bg-green-50')}>
                    {/* Code + copy */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-outfit font-bold tracking-widest text-sm',
                          c.is_used ? 'text-gray-400' : 'text-gray-900'
                        )}>
                          {c.code}
                        </span>
                        {!c.is_used && (
                          <button
                            onClick={() => copyCode(c.code)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            {copied === c.code
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3"><RoleBadge role={c.role} /></td>
                    {/* For */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="font-inter text-xs text-gray-600">
                        {c.intended_email || c.athleteName
                          ? <>{c.intended_email && <span>{c.intended_email}</span>}{c.athleteName && <><br /><span className="text-gray-400">→ {c.athleteName}</span></>}</>
                          : <span className="text-gray-300">—</span>}
                      </p>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      {c.is_used ? (
                        <span className="inline-flex items-center gap-1 font-inter text-xs text-green-700">
                          <CheckCircle2 className="w-3 h-3" />
                          {c.usedByName ? `Used by ${c.usedByName}` : 'Used'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-inter text-xs text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          Unused
                        </span>
                      )}
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-inter text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    {/* Delete */}
                    <td className="px-4 py-3 text-right">
                      {!c.is_used && (
                        confirmDelete === c.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button onClick={() => deleteCode(c.id)} className="text-red-500 hover:text-red-700 font-inter text-xs font-medium">Delete</button>
                            <button onClick={() => setConfirmDelete(null)} className="text-gray-400 hover:text-gray-600 font-inter text-xs">Cancel</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(c.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Sports Manager
// ═════════════════════════════════════════════════════════════════════════════

function SportsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sports, setSports] = useState<SportsList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSport, setNewSport] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from('sports_list').select('*').order('name');
    setSports(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addSport = async () => {
    const name = newSport.trim();
    if (!name) return;
    setAdding(true);
    const { error } = await supabase.from('sports_list').insert({ name, created_by: user!.id });
    setAdding(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewSport('');
      inputRef.current?.focus();
      load();
    }
  };

  const deleteSport = async (id: string) => {
    const { error } = await supabase.from('sports_list').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setConfirmDelete(null);
      load();
      toast({ title: 'Sport removed' });
    }
  };

  return (
    <Section
      id="sports"
      icon={<Dumbbell className="w-4 h-4" />}
      title="Sports Manager"
      subtitle="Manage the list of sports athletes can select"
    >
      <div className="p-6 space-y-4">
        {/* Add sport */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="e.g. Lacrosse"
            value={newSport}
            onChange={e => setNewSport(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSport()}
            className="h-9 font-inter text-sm border-gray-200"
          />
          <Button
            onClick={addSport}
            disabled={adding || !newSport.trim()}
            className="h-9 bg-[#0f172a] hover:bg-[#1e293b] text-white font-inter text-sm flex items-center gap-1.5 px-4 flex-shrink-0"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Sport
          </Button>
        </div>

        {/* List */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : sports.length === 0 ? (
            <div className="px-4 py-10 text-center font-inter text-sm text-gray-400">
              No sports yet. Add one above.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sports.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <span className="font-inter text-sm text-gray-800 font-medium">{s.name}</span>
                  {confirmDelete === s.id ? (
                    <div className="flex items-center gap-2">
                      <span className="font-inter text-xs text-gray-500">Remove?</span>
                      <button onClick={() => deleteSport(s.id)} className="font-inter text-xs text-red-600 font-semibold hover:text-red-700">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="font-inter text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(s.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="font-inter text-xs text-gray-400">
          {sports.length} sport{sports.length !== 1 ? 's' : ''} in the system
        </p>
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3 — User List
// ═════════════════════════════════════════════════════════════════════════════

interface EnrichedProfile extends Profile {
  sports: string[];
  teams: string[];
}

function UserList() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<EnrichedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    const { data: profs } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!profs) { setLoading(false); return; }

    const ids = profs.map(p => p.id);

    // Athlete sports
    const { data: athleteSports } = await supabase
      .from('athlete_sports')
      .select('athlete_id, sport_id')
      .in('athlete_id', ids);

    const sportIds = [...new Set((athleteSports ?? []).map(a => a.sport_id))];
    const { data: sportNames } = sportIds.length > 0
      ? await supabase.from('sports_list').select('id, name').in('id', sportIds)
      : { data: [] };

    // Teams (for athletes)
    const { data: teamAthletes } = await supabase
      .from('team_athletes')
      .select('athlete_id, team_id')
      .in('athlete_id', ids);

    const teamIds = [...new Set((teamAthletes ?? []).map(t => t.team_id))];
    const { data: teamNames } = teamIds.length > 0
      ? await supabase.from('teams').select('id, name').in('id', teamIds)
      : { data: [] };

    setProfiles(profs.map(p => ({
      ...p,
      sports: (athleteSports ?? [])
        .filter(a => a.athlete_id === p.id)
        .map(a => (sportNames ?? []).find(s => s.id === a.sport_id)?.name ?? '')
        .filter(Boolean),
      teams: (teamAthletes ?? [])
        .filter(t => t.athlete_id === p.id)
        .map(t => (teamNames ?? []).find(n => n.id === t.team_id)?.name ?? '')
        .filter(Boolean),
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRole = async (id: string, role: UserRole) => {
    setUpdatingId(id);
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    setUpdatingId(null);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Role updated' });
      load();
    }
  };

  const filtered = profiles.filter(p => {
    const matchSearch = !search || (p.full_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || p.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <Section
      id="users"
      icon={<Users className="w-4 h-4" />}
      title="User List"
      subtitle="All registered users with their roles, sports, and team assignments"
    >
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-8 font-inter text-sm border-gray-200"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-9 w-36 font-inter text-sm border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"     className="font-inter text-sm">All Roles</SelectItem>
              <SelectItem value="athlete" className="font-inter text-sm">Athletes</SelectItem>
              <SelectItem value="coach"   className="font-inter text-sm">Coaches</SelectItem>
              <SelectItem value="parent"  className="font-inter text-sm">Parents</SelectItem>
              <SelectItem value="admin"   className="font-inter text-sm">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">Sports</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Team</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">Joined</th>
                <th className="px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide text-right">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-inter text-sm text-gray-400">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-white font-outfit font-bold text-xs flex-shrink-0',
                          p.role === 'coach' ? 'bg-amber-500' : p.role === 'parent' ? 'bg-purple-600' : p.role === 'admin' ? 'bg-red-600' : 'bg-blue-700'
                        )}>
                          {p.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="font-inter text-sm font-medium text-gray-900 truncate max-w-[130px]">
                          {p.full_name ?? 'Unknown'}
                        </span>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3.5"><RoleBadge role={p.role} /></td>
                    {/* Sports */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.sports.length > 0
                          ? p.sports.slice(0, 2).map((s, i) => (
                              <span key={i} className="font-inter text-[10px] bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">{s}</span>
                            ))
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                        {p.sports.length > 2 && <span className="font-inter text-[10px] text-gray-400">+{p.sports.length - 2}</span>}
                      </div>
                    </td>
                    {/* Team */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {p.teams.length > 0
                        ? <span className="font-inter text-xs text-gray-600 truncate max-w-[120px] block">{p.teams[0]}{p.teams.length > 1 ? ` +${p.teams.length - 1}` : ''}</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="font-inter text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    {/* Change role */}
                    <td className="px-4 py-3.5 text-right">
                      <Select
                        value={p.role}
                        onValueChange={v => updateRole(p.id, v as UserRole)}
                        disabled={updatingId === p.id}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs font-inter border-gray-200 ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="athlete" className="font-inter text-xs">Athlete</SelectItem>
                          <SelectItem value="coach"   className="font-inter text-xs">Coach</SelectItem>
                          <SelectItem value="parent"  className="font-inter text-xs">Parent</SelectItem>
                          <SelectItem value="admin"   className="font-inter text-xs">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="font-inter text-xs text-gray-400">{filtered.length} of {profiles.length} users shown</p>
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Question Manager
// ═════════════════════════════════════════════════════════════════════════════

function QuestionManager() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('sort_order');
    setQuestions(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditText(q.text);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setSavingId(id);
    const { error } = await supabase.from('questions').update({ text: trimmed }).eq('id', id);
    setSavingId(null);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setEditingId(null);
      load();
    }
  };

  const toggleActive = async (q: Question) => {
    setTogglingId(q.id);
    await supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id);
    setTogglingId(null);
    load();
  };

  const activeCount = questions.filter(q => q.is_active).length;

  return (
    <Section
      id="questions"
      icon={<HelpCircle className="w-4 h-4" />}
      title="Question Manager"
      subtitle="Enable, disable, or edit the weekly check-in questions"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-inter text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{activeCount}</span> of {questions.length} questions active
          </p>
          {activeCount < 5 && (
            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-inter text-xs font-medium">Less than 5 questions active</span>
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide w-8">#</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell w-28">Category</th>
                <th className="text-left px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide">Question</th>
                <th className="px-4 py-2.5 font-inter font-semibold text-gray-500 text-xs uppercase tracking-wide text-center w-20">Active</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4].map(j => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                questions.map(q => (
                  <tr
                    key={q.id}
                    className={cn(
                      'transition-colors',
                      !q.is_active ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50'
                    )}
                  >
                    {/* Sort order */}
                    <td className="px-4 py-3.5">
                      <span className="font-inter text-xs text-gray-400 font-medium">{q.sort_order}</span>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-[10px] font-inter font-semibold',
                        CATEGORY_BADGE[q.category] ?? 'bg-gray-100 text-gray-600'
                      )}>
                        {q.category}
                      </span>
                    </td>
                    {/* Question text — editable */}
                    <td className="px-4 py-3.5">
                      {editingId === q.id ? (
                        <input
                          ref={editInputRef}
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(q.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-full font-inter text-sm text-gray-900 bg-blue-50 border border-blue-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-400/30"
                        />
                      ) : (
                        <p className={cn(
                          'font-inter text-sm leading-snug',
                          q.is_active ? 'text-gray-800' : 'text-gray-400'
                        )}>
                          {q.text}
                        </p>
                      )}
                    </td>
                    {/* Active toggle */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => toggleActive(q)}
                        disabled={togglingId === q.id}
                        className="inline-flex items-center justify-center"
                        title={q.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {togglingId === q.id ? (
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : q.is_active ? (
                          <ToggleRight className="w-6 h-6 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-300" />
                        )}
                      </button>
                    </td>
                    {/* Edit / save / cancel */}
                    <td className="px-4 py-3.5 text-right">
                      {editingId === q.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(q.id)}
                            disabled={savingId === q.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Save"
                          >
                            {savingId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(q)}
                          className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          style={{ opacity: undefined }} // let CSS handle
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="font-inter text-xs text-gray-400">
          Click the pencil icon to edit text inline. Click the toggle to enable/disable a question.
        </p>
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOP-LEVEL PAGE
// ═════════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  { id: 'invites',   label: 'Invite Codes', icon: <Star    className="w-3.5 h-3.5" /> },
  { id: 'sports',    label: 'Sports',       icon: <Dumbbell className="w-3.5 h-3.5" /> },
  { id: 'users',     label: 'Users',        icon: <Users    className="w-3.5 h-3.5" /> },
  { id: 'questions', label: 'Questions',    icon: <HelpCircle className="w-3.5 h-3.5" /> },
];

export function AdminPage() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="font-inter text-sm text-red-500 font-medium uppercase tracking-wide">Admin</span>
        </div>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="font-inter text-gray-500 mt-1">Platform management tools</p>
      </div>

      {/* Jump-to nav */}
      <nav className="flex items-center gap-2 flex-wrap">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-[#0f172a] hover:text-white hover:border-[#0f172a] font-inter text-sm font-medium text-gray-600 transition-all duration-150 shadow-sm"
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </nav>

      {/* Sections */}
      <InviteCodeManager />
      <SportsManager />
      <UserList />
      <QuestionManager />
    </div>
  );
}
