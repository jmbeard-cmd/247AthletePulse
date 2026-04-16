import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile } from '@/types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// How long to wait between retry attempts (ms)
const RETRY_DELAY_MS = 500;
// Maximum number of fetch attempts before giving up
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep a ref to the current user id so the retry loop can bail out
  // if the user signs out mid-retry.
  const currentUserIdRef = useRef<string | null>(null);

  /**
   * Fetch the profile row for `userId`, retrying up to MAX_RETRIES times
   * with a RETRY_DELAY_MS pause between attempts.
   *
   * This handles the race condition where auth.signUp() fires
   * onAuthStateChange(SIGNED_IN) before the app's own INSERT INTO profiles
   * has been committed and is readable via RLS.
   */
  const fetchProfile = async (userId: string): Promise<void> => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Bail out if the user changed or signed out while we were waiting
      if (currentUserIdRef.current !== userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        return;
      }

      // Log the failure reason for debugging
      const reason = error?.message ?? 'no row returned';
      console.warn(`[AuthContext] fetchProfile attempt ${attempt}/${MAX_RETRIES} failed for ${userId}: ${reason}`);

      // Don't sleep after the last attempt
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }

    // All retries exhausted — leave profile as null so DashboardRouter
    // can show a recovery UI instead of silently getting stuck.
    console.error(`[AuthContext] fetchProfile gave up after ${MAX_RETRIES} attempts for ${userId}`);
  };

  const refreshProfile = async () => {
    if (user) {
      currentUserIdRef.current = user.id;
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      currentUserIdRef.current = session?.user?.id ?? null;

      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to subsequent auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      currentUserIdRef.current = session?.user?.id ?? null;

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
