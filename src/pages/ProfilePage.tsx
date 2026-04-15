import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { UserCircle, Lock, Save } from 'lucide-react';

export function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const ROLE_LABELS: Record<string, string> = {
    athlete: 'Athlete',
    coach: 'Coach',
    parent: 'Parent/Guardian',
    admin: 'Administrator',
  };

  const ROLE_COLORS: Record<string, string> = {
    athlete: 'bg-blue-100 text-blue-800',
    coach: 'bg-amber-100 text-amber-800',
    parent: 'bg-purple-100 text-purple-800',
    admin: 'bg-red-100 text-red-800',
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user!.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await refreshProfile();
      toast({ title: 'Profile updated!' });
    }
  };

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewPassword('');
      toast({ title: 'Password updated!' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="font-inter text-gray-500 mt-1">Manage your account settings</p>
      </div>

      {/* Avatar + role */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-outfit shadow-sm">
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="font-outfit text-xl font-bold text-gray-900">{profile?.full_name}</h2>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-inter font-semibold ${ROLE_COLORS[profile?.role ?? ''] || 'bg-gray-100 text-gray-600'}`}>
              {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-inter font-medium text-gray-700">Full Name</Label>
            <div className="flex gap-3">
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="h-10 font-inter border-gray-200"
              />
              <Button
                onClick={saveProfile}
                disabled={savingProfile || fullName === profile?.full_name}
                className="bg-blue-700 hover:bg-blue-800 text-white font-inter px-4 flex items-center gap-2 whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-inter font-medium text-gray-700">Email</Label>
            <p className="font-inter text-gray-500 text-sm bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-gray-400" />
          <h2 className="font-outfit font-bold text-gray-900">Change Password</h2>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="font-inter font-medium text-gray-700">New Password</Label>
            <Input
              type="password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="h-10 font-inter border-gray-200"
            />
          </div>
          <Button
            onClick={updatePassword}
            disabled={savingPassword || !newPassword}
            className="bg-gray-900 hover:bg-gray-800 text-white font-inter"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <UserCircle className="w-4 h-4 text-gray-400" />
          <span className="font-inter text-xs font-medium text-gray-500 uppercase tracking-wide">Account Info</span>
        </div>
        <p className="font-inter text-xs text-gray-400">User ID: {user?.id}</p>
        <p className="font-inter text-xs text-gray-400 mt-0.5">
          Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
        </p>
      </div>
    </div>
  );
}
