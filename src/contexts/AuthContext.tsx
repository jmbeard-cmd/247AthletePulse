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

const RETRY_DELAY_MS = 600;
const MAX_RETRIES = 4;

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Start true so nothing renders until we know the auth state
  const [loading, setLoading] = useState(true);

  // Tracks which user id the current fetch is for — lets us discard
  // results from stale fetches if the user changes mid-flight.
  const currentUserIdRef = useRef<string | null>(null);

  /**
   * Fetch the profile for `userId`.
   * Retries up to MAX_RETRIES times with RETRY_DELAY_MS between attempts.
   * Caller is responsible for setting loading=true before calling and
   * loading=false after it resolves.
   */
  const fetchProfileInner = async (userId: string): Promise<void> => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (currentUserIdRef.current !== userId) return; // user changed, abort

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        if (currentUserIdRef.current === userId) {
          setProfile(data);
        }
        return;
      }

      console.warn(
        `[Auth] fetchProfile attempt ${attempt}/${MAX_RETRIES} for ${userId}:`,
        error?.message ?? 'no row'
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }

    console.error(`[Auth] fetchProfile gave up after ${MAX_RETRIES} attempts for ${userId}`);
  };

  /**
   * Public method — used by DashboardRouter's "Try Refreshing" button.
   * Re-runs the fetch and keeps loading=true while it runs so the UI
   * re-evaluates once the result is available.
   */
  const refreshProfile = async (): Promise<void> => {
    if (!user) return;
    currentUserIdRef.current = user.id;
    setLoading(true);
    await fetchProfileInner(user.id);
    setLoading(false);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // ── Step 1: check for an existing session on page load ──────────────────
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        currentUserIdRef.current = session.user.id;
        // Keep loading=true the whole time the profile fetch runs
        await fetchProfileInner(session.user.id);
      }

      if (isMounted) setLoading(false);
    });

    // ── Step 2: react to login / logout events ──────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Set loading=true so consumers wait while we fetch the profile.
          // This is the critical fix: without this, the dashboard renders
          // with profile=null immediately after signInWithPassword resolves.
          setLoading(true);
          currentUserIdRef.current = session.user.id;
          await fetchProfileInner(session.user.id);
          if (isMounted) setLoading(false);
        } else {
          // Signed out
          currentUserIdRef.current = null;
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    currentUserIdRef.current = null;
    setProfile(null);
    await supabase.auth.signOut();
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
