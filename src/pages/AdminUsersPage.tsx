import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { Search, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile, UserRole } from '@/types/database';

const ROLE_COLORS: Record<string, string> = {
  athlete: 'bg-blue-100 text-blue-800',
  coach: 'bg-amber-100 text-amber-800',
  parent: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};

export function AdminUsersPage() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => { loadProfiles(); }, []);

  const updateRole = async (id: string, role: UserRole) => {
    setUpdatingId(id);
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    setUpdatingId(null);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Role updated' });
      loadProfiles();
    }
  };

  const filtered = profiles.filter(p => {
    const matchSearch = !search || (p.full_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || p.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="font-inter text-sm text-red-500 font-medium">Admin</span>
        </div>
        <h1 className="font-outfit text-3xl font-bold text-gray-900">Manage Users</h1>
        <p className="font-inter text-gray-500 mt-1">{profiles.length} total users</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 font-inter border-gray-200"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40 h-10 font-inter border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-inter">All Roles</SelectItem>
            <SelectItem value="athlete" className="font-inter">Athletes</SelectItem>
            <SelectItem value="coach" className="font-inter">Coaches</SelectItem>
            <SelectItem value="parent" className="font-inter">Parents</SelectItem>
            <SelectItem value="admin" className="font-inter">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="animate-pulse space-y-3 p-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-inter text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-semibold font-outfit text-sm flex-shrink-0">
                  {p.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter font-semibold text-gray-900 text-sm truncate">{p.full_name ?? 'Unknown'}</p>
                  <p className="font-inter text-xs text-gray-400">{p.id.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs font-inter font-semibold px-2.5 py-1 rounded-full', ROLE_COLORS[p.role] || 'bg-gray-100 text-gray-600')}>
                    {p.role}
                  </span>
                  <Select
                    value={p.role}
                    onValueChange={(v) => updateRole(p.id, v as UserRole)}
                    disabled={updatingId === p.id}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs font-inter border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="athlete" className="font-inter text-xs">Athlete</SelectItem>
                      <SelectItem value="coach" className="font-inter text-xs">Coach</SelectItem>
                      <SelectItem value="parent" className="font-inter text-xs">Parent</SelectItem>
                      <SelectItem value="admin" className="font-inter text-xs">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
