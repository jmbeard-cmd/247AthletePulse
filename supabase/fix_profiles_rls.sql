-- ============================================================
-- Fix: Profiles RLS — ensure authenticated users can always
-- SELECT their own row immediately after signup.
--
-- ROOT CAUSE
-- ----------
-- The existing "profiles_select_own" policy uses:
--   USING (id = auth.uid() OR get_my_role() = 'admin')
--
-- get_my_role() is a SECURITY DEFINER function that itself reads
-- from profiles. This creates a subtle ordering problem right after
-- signup: Supabase fires onAuthStateChange(SIGNED_IN) before the
-- app's INSERT INTO profiles has been fully committed and visible
-- to a fresh SELECT. On the very first query the function returns
-- NULL for the role, so the OR branch also evaluates to false, and
-- the row is invisible to the authenticated user.
--
-- FIX
-- ---
-- 1. Keep the existing policy but also add a simple, dependency-free
--    policy that directly checks auth.uid(). Two policies on the same
--    table are OR-ed by Postgres — so if either passes, the row is
--    returned. The direct-uid policy cannot deadlock on itself.
--
-- 2. The app-side retry loop (3 attempts × 500 ms) in AuthContext.tsx
--    covers the remaining window. Belt and suspenders.
-- ============================================================

-- Drop first so this script is safe to re-run
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;

-- Simple, direct policy: every authenticated user can read their own row.
-- No helper function, no sub-selects — cannot be affected by timing gaps.
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ── Verify the policies that should exist on profiles ────────────────────────
-- After running this you should see ALL of the following in
-- Supabase Dashboard > Authentication > Policies > profiles:
--
--   profiles_select_self        SELECT   auth.uid() = id
--   profiles_select_own         SELECT   id = auth.uid() OR get_my_role() = 'admin'
--   profiles_insert_own         INSERT   id = auth.uid()
--   profiles_update_own         UPDATE   id = auth.uid() OR get_my_role() = 'admin'
--   profiles_coach_view         SELECT   (coach sees team athletes)
--   profiles_parent_view        SELECT   (parent sees linked athletes)
--   profiles_anon_count_admins  SELECT   role = 'admin'   (from rls_patch.sql)
-- ============================================================
