import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Activity, Home, ClipboardList, Users, BarChart2,
  LogOut, Menu, ChevronRight, Bell,
  UserCircle, Shield, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <Home className="w-5 h-5" />, roles: ['athlete', 'coach', 'parent', 'admin'] },
  { label: 'Check-In', href: '/checkin', icon: <ClipboardList className="w-5 h-5" />, roles: ['athlete'] },
  { label: 'My Progress', href: '/progress', icon: <BarChart2 className="w-5 h-5" />, roles: ['athlete'] },
  { label: 'My Team', href: '/team', icon: <Users className="w-5 h-5" />, roles: ['coach'] },
  { label: 'Team Reports', href: '/reports', icon: <BarChart2 className="w-5 h-5" />, roles: ['coach'] },
  { label: 'Invite Codes', href: '/invites', icon: <Star className="w-5 h-5" />, roles: ['coach', 'admin'] },
  { label: 'My Athletes', href: '/athletes', icon: <Users className="w-5 h-5" />, roles: ['parent'] },
  { label: 'Admin Panel', href: '/admin', icon: <Shield className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Profile', href: '/profile', icon: <UserCircle className="w-5 h-5" />, roles: ['athlete', 'coach', 'parent', 'admin'] },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = profile?.role ?? '';
  const filteredNav = navItems.filter(item => item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const roleLabel = {
    athlete: 'Athlete',
    coach: 'Coach',
    parent: 'Parent',
    admin: 'Admin',
  }[role] ?? role;

  const roleBg = {
    athlete: 'bg-blue-100 text-blue-800',
    coach: 'bg-amber-100 text-amber-800',
    parent: 'bg-purple-100 text-purple-800',
    admin: 'bg-red-100 text-red-800',
  }[role] ?? 'bg-gray-100 text-gray-800';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-outfit font-bold text-gray-900 leading-tight text-sm">247 Athlete</p>
            <p className="font-outfit font-bold text-blue-700 leading-tight text-sm">Pulse</p>
          </div>
        </Link>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-semibold font-outfit text-sm">
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-inter font-semibold text-gray-900 text-sm truncate">{profile?.full_name ?? 'User'}</p>
            <span className={cn('text-xs font-inter font-medium px-2 py-0.5 rounded-full', roleBg)}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter font-medium text-sm transition-all duration-150 group',
                isActive
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <span className={cn('transition-colors', isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')}>
                {item.icon}
              </span>
              {item.label}
              {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter font-medium text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all w-full group"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-700" />
            <span className="font-outfit font-bold text-gray-900">247 Athlete Pulse</span>
          </div>
          <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors relative">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
