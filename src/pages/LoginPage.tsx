import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { SetupPage } from './SetupPage';

export function LoginPage() {
  if (!isSupabaseConfigured) {
    return <SetupPage />;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      navigate('/dashboard');
    }
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
          <p className="text-gray-500 mt-1 font-inter">Your weekly mindset check-in</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="font-outfit text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleLogin} className="space-y-5">
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white font-inter font-semibold rounded-xl transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 font-inter text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-700 font-semibold hover:text-blue-800 transition-colors">
                Sign up with invite code
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 font-inter">
          <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">
            Vibed with Shakespeare
          </a>
        </p>
      </div>
    </div>
  );
}
