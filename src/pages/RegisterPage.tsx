import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { Activity, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { InviteCode, UserRole } from '@/types/database';

const ROLE_LABELS: Record<string, string> = {
  athlete: '🏆 Athlete',
  coach: '📋 Coach',
  parent: '👨‍👩‍👧 Parent/Guardian',
};

export function RegisterPage() {
  const [step, setStep] = useState<'code' | 'details'>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [codeData, setCodeData] = useState<InviteCode | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.trim().toUpperCase())
      .eq('is_used', false)
      .single();

    setLoading(false);

    if (error || !data) {
      toast({ title: 'Invalid code', description: 'This invite code is invalid or has already been used.', variant: 'destructive' });
      return;
    }

    setCodeData(data);
    if (data.intended_email) setEmail(data.intended_email);
    setStep('details');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeData) return;
    setLoading(true);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      setLoading(false);
      toast({ title: 'Registration failed', description: authError?.message || 'Unknown error', variant: 'destructive' });
      return;
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: fullName,
      role: codeData.role as UserRole,
    });

    if (profileError) {
      setLoading(false);
      toast({ title: 'Profile creation failed', description: profileError.message, variant: 'destructive' });
      return;
    }

    // If parent code with athlete_id, create parent-athlete link
    if (codeData.role === 'parent' && codeData.athlete_id) {
      await supabase.from('parent_athlete_links').insert({
        parent_id: userId,
        athlete_id: codeData.athlete_id,
      });
    }

    // Mark invite code as used
    await supabase.from('invite_codes').update({
      is_used: true,
      used_by: userId,
    }).eq('id', codeData.id);

    setLoading(false);
    toast({ title: 'Account created!', description: 'Welcome to 247 Athlete Pulse.' });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-700 shadow-lg mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-outfit text-3xl font-bold text-gray-900">247 Athlete Pulse</h1>
          <p className="text-gray-500 mt-1 font-inter">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step === 'code' ? 'bg-blue-700 text-white' : 'bg-green-500 text-white'}`}>
              {step === 'code' ? '1' : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className={`flex-1 h-0.5 ${step === 'details' ? 'bg-blue-700' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step === 'details' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
              2
            </div>
          </div>

          {step === 'code' ? (
            <>
              <h2 className="font-outfit text-xl font-semibold text-gray-900 mb-2">Enter your invite code</h2>
              <p className="text-gray-500 font-inter text-sm mb-6">You'll need an invite code from your coach or administrator to join.</p>

              <form onSubmit={verifyCode} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="code" className="font-inter font-medium text-gray-700">Invite Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="e.g. ABC123"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    required
                    maxLength={6}
                    className="h-11 border-gray-200 focus:border-blue-500 font-inter text-center text-xl tracking-widest uppercase font-bold"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || inviteCode.length < 6}
                  className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white font-inter font-semibold rounded-xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : 'Verify Code'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setStep('code')} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-outfit text-xl font-semibold text-gray-900">Create your account</h2>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 font-inter">
                    {ROLE_LABELS[codeData?.role || ''] || codeData?.role}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-inter font-medium text-gray-700">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-11 border-gray-200 focus:border-blue-500 font-inter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-inter font-medium text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 border-gray-200 focus:border-blue-500 font-inter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-inter font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-11 border-gray-200 focus:border-blue-500 pr-10 font-inter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white font-inter font-semibold rounded-xl mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : 'Create Account'}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-500 font-inter text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-700 font-semibold hover:text-blue-800 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
