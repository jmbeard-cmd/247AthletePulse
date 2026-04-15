import { useState, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/database';

// ─── Role option definitions ─────────────────────────────────────────────────

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: ReactNode;
}

const ROLES: RoleOption[] = [
  {
    value: 'athlete',
    label: 'Athlete',
    description: 'Track my mindset weekly',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    value: 'coach',
    label: 'Coach',
    description: 'Monitor my team',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'parent',
    label: 'Parent',
    description: "Support my athlete",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<UserRole, { ring: string; bg: string; text: string; badge: string }> = {
  athlete: {
    ring: 'ring-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    badge: 'bg-blue-900/60 text-blue-300',
  },
  coach: {
    ring: 'ring-amber-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    badge: 'bg-amber-900/60 text-amber-300',
  },
  parent: {
    ring: 'ring-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    badge: 'bg-purple-900/60 text-purple-300',
  },
  admin: {
    ring: 'ring-red-500',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    badge: 'bg-red-900/60 text-red-300',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState('');

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setLoading(true);
    setCodeError('');

    // ── 1. Check whether we need a code ─────────────────────────────────────
    // Admin bootstrap: if there are zero admins, the first admin signup is free.
    let skipCodeCheck = false;
    let codeRecord: { id: string; role: string; athlete_id: string | null } | null = null;

    if (role === 'admin') {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((count ?? 0) === 0) {
        skipCodeCheck = true;
      }
    }

    // ── 2. Validate invite code unless skipped ───────────────────────────────
    if (!skipCodeCheck) {
      const code = inviteCode.trim().toUpperCase();

      if (!code) {
        setCodeError('An invite code is required.');
        setLoading(false);
        return;
      }

      const { data: codeData, error: codeErr } = await supabase
        .from('invite_codes')
        .select('id, role, athlete_id, is_used')
        .eq('code', code)
        .single();

      if (codeErr || !codeData || codeData.is_used) {
        setCodeError('That code is not valid. Please check with your coach or admin.');
        setLoading(false);
        return;
      }

      if (codeData.role !== role) {
        setCodeError(
          `That code is for a ${codeData.role} account, not ${role}. Please use the correct role or get a new code.`
        );
        setLoading(false);
        return;
      }

      codeRecord = codeData;
    }

    // ── 3. Create Supabase auth user ─────────────────────────────────────────
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authErr || !authData.user) {
      toast({
        title: 'Registration failed',
        description: authErr?.message ?? 'Unknown error — please try again.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // ── 4. Create profile row ────────────────────────────────────────────────
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: userId,
      full_name: fullName.trim(),
      role,
    });

    if (profileErr) {
      toast({
        title: 'Profile creation failed',
        description: profileErr.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // ── 5. Post-registration side-effects ────────────────────────────────────
    if (codeRecord) {
      // Link parent → athlete if code carries an athlete_id
      if (role === 'parent' && codeRecord.athlete_id) {
        await supabase.from('parent_athlete_links').insert({
          parent_id: userId,
          athlete_id: codeRecord.athlete_id,
        });
      }

      // Mark code used
      await supabase
        .from('invite_codes')
        .update({ is_used: true, used_by: userId })
        .eq('id', codeRecord.id);
    }

    setLoading(false);
    toast({ title: 'Account created!', description: 'Welcome to 247 Athlete Pulse.' });
    navigate('/dashboard');
  };

  const selectedRole = role ? ROLES.find(r => r.value === role) : null;
  const colors = role ? ROLE_COLORS[role] : null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 py-10">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-gray-950 to-gray-950 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/50 mb-5">
            <PulseLogo />
          </div>
          <h1 className="font-outfit text-3xl font-extrabold text-white tracking-tight">
            247 Athlete Pulse
          </h1>
          <p className="mt-1.5 font-inter text-sm font-medium tracking-widest text-amber-400 uppercase">
            Fight. Finish. Faith.
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
          <h2 className="font-outfit text-xl font-bold text-white mb-1">Create your account</h2>
          <p className="font-inter text-sm text-gray-400 mb-6">Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Name ── */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="font-inter text-sm font-medium text-gray-300">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 font-inter"
              />
            </div>

            {/* ── Email ── */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-inter text-sm font-medium text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 font-inter"
              />
            </div>

            {/* ── Password ── */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-inter text-sm font-medium text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 pr-10 font-inter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* ── Role selector ── */}
            <div className="space-y-2">
              <Label className="font-inter text-sm font-medium text-gray-300">I am a…</Label>
              <div className="grid grid-cols-3 gap-2.5">
                {ROLES.map(r => {
                  const c = ROLE_COLORS[r.value];
                  const selected = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all duration-150 cursor-pointer',
                        selected
                          ? `border-current ${c.ring} ring-1 ${c.bg}`
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                      )}
                    >
                      <span className={cn('transition-colors', selected ? c.text : 'text-gray-400')}>
                        {r.icon}
                      </span>
                      <span
                        className={cn(
                          'font-outfit text-xs font-bold leading-tight transition-colors',
                          selected ? 'text-white' : 'text-gray-400'
                        )}
                      >
                        {r.label}
                      </span>
                      <span
                        className={cn(
                          'font-inter text-[10px] leading-tight text-center transition-colors hidden sm:block',
                          selected ? 'text-gray-300' : 'text-gray-600'
                        )}
                      >
                        {r.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Invite code ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="code" className="font-inter text-sm font-medium text-gray-300">
                  Invite Code
                </Label>
                {role === 'admin' && (
                  <span className="font-inter text-[10px] text-gray-500 italic">
                    Not required for first admin
                  </span>
                )}
              </div>
              <Input
                id="code"
                type="text"
                placeholder="e.g. ABC123"
                value={inviteCode}
                onChange={e => {
                  setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setCodeError('');
                }}
                maxLength={6}
                className={cn(
                  'h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 font-outfit font-bold text-center text-lg tracking-[.25em] uppercase focus:border-blue-500 focus:ring-blue-500/20',
                  codeError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                )}
              />
              {codeError && (
                <div className="flex items-start gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="font-inter text-xs text-red-400 leading-snug">{codeError}</p>
                </div>
              )}
            </div>

            {/* ── Role badge preview ── */}
            {selectedRole && colors && (
              <div className={cn('flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-700/50', colors.bg)}>
                <span className={colors.text}>{selectedRole.icon}</span>
                <div>
                  <p className="font-inter text-xs text-gray-400">Signing up as</p>
                  <p className={cn('font-outfit text-sm font-bold', colors.text)}>{selectedRole.label}</p>
                </div>
              </div>
            )}

            {/* ── Submit ── */}
            <Button
              type="submit"
              disabled={loading || !role}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-inter font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/40 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : 'Create Account'}
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-800 text-center">
            <p className="font-inter text-sm text-gray-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-400 font-semibold hover:text-blue-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-gray-600 font-inter">
          <a
            href="https://shakespeare.diy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors"
          >
            Vibed with Shakespeare
          </a>
        </p>
      </div>
    </div>
  );
}

function PulseLogo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 16h5l3-9 4 18 4-13 3 7 3-3h6"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
