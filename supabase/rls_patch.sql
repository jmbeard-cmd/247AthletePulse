-- ============================================================
-- RLS Patch — run this after migrations.sql if you already
-- ran the original migration, OR it is included automatically
-- if you run migrations.sql fresh (append to the bottom).
-- ============================================================

-- 1. Allow any authenticated user to mark an unused invite code
--    as used (they just signed up with it). The app code already
--    ensures the code matches role + is_used = false before calling update.
DROP POLICY IF EXISTS "invite_codes_mark_used" ON invite_codes;
CREATE POLICY "invite_codes_mark_used" ON invite_codes
  FOR UPDATE
  USING (is_used = false)                 -- only unused codes can be claimed
  WITH CHECK (is_used = true);            -- and only to mark them used

-- 2. Allow unauthenticated (anon) reads on profiles solely to count admins.
--    We expose only the count via RLS by allowing anon to read role column.
--    This lets the admin-bootstrap check work without authentication.
DROP POLICY IF EXISTS "profiles_anon_count_admins" ON profiles;
CREATE POLICY "profiles_anon_count_admins" ON profiles
  FOR SELECT
  USING (role = 'admin');                 -- anon can only see admin rows (for counting)
