-- ============================================================
-- 247 Athlete Pulse — Full Database Setup
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'parent', 'coach', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE
);

-- sports_list
CREATE TABLE IF NOT EXISTS sports_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- athlete_sports
CREATE TABLE IF NOT EXISTS athlete_sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports_list(id) ON DELETE CASCADE,
  UNIQUE(athlete_id, sport_id)
);

-- teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports_list(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- team_athletes
CREATE TABLE IF NOT EXISTS team_athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(team_id, athlete_id)
);

-- invite_codes
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('coach', 'athlete', 'parent')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  athlete_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  intended_email TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- parent_athlete_links
CREATE TABLE IF NOT EXISTS parent_athlete_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(parent_id, athlete_id)
);

-- questions
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- responses
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  week_of DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, question_id, week_of)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_athlete_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Helper function to get role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- PROFILES
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid() OR get_my_role() = 'admin');

-- Allow coaches to see their team athletes' profiles
CREATE POLICY "profiles_coach_view" ON profiles
  FOR SELECT USING (
    get_my_role() = 'coach' AND
    id IN (
      SELECT ta.athlete_id FROM team_athletes ta
      JOIN teams t ON t.id = ta.team_id
      WHERE t.coach_id = auth.uid()
    )
  );

-- Allow parents to see their linked athletes' profiles
CREATE POLICY "profiles_parent_view" ON profiles
  FOR SELECT USING (
    get_my_role() = 'parent' AND
    id IN (
      SELECT pal.athlete_id FROM parent_athlete_links pal
      WHERE pal.parent_id = auth.uid()
    )
  );

-- SPORTS_LIST
CREATE POLICY "sports_select_all" ON sports_list
  FOR SELECT USING (true);

CREATE POLICY "sports_insert_admin_coach" ON sports_list
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'coach'));

CREATE POLICY "sports_update_admin" ON sports_list
  FOR UPDATE USING (get_my_role() = 'admin');

-- ATHLETE_SPORTS
CREATE POLICY "athlete_sports_select" ON athlete_sports
  FOR SELECT USING (athlete_id = auth.uid() OR get_my_role() IN ('admin', 'coach'));

CREATE POLICY "athlete_sports_insert" ON athlete_sports
  FOR INSERT WITH CHECK (athlete_id = auth.uid() OR get_my_role() = 'admin');

-- TEAMS
CREATE POLICY "teams_select" ON teams
  FOR SELECT USING (
    get_my_role() = 'admin' OR
    coach_id = auth.uid() OR
    id IN (
      SELECT team_id FROM team_athletes WHERE athlete_id = auth.uid()
    )
  );

CREATE POLICY "teams_insert_coach_admin" ON teams
  FOR INSERT WITH CHECK (get_my_role() IN ('coach', 'admin'));

CREATE POLICY "teams_update_coach_admin" ON teams
  FOR UPDATE USING (coach_id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "teams_delete_coach_admin" ON teams
  FOR DELETE USING (coach_id = auth.uid() OR get_my_role() = 'admin');

-- TEAM_ATHLETES
CREATE POLICY "team_athletes_select" ON team_athletes
  FOR SELECT USING (
    get_my_role() = 'admin' OR
    athlete_id = auth.uid() OR
    team_id IN (SELECT id FROM teams WHERE coach_id = auth.uid())
  );

CREATE POLICY "team_athletes_insert_coach_admin" ON team_athletes
  FOR INSERT WITH CHECK (
    get_my_role() = 'admin' OR
    team_id IN (SELECT id FROM teams WHERE coach_id = auth.uid())
  );

CREATE POLICY "team_athletes_delete_coach_admin" ON team_athletes
  FOR DELETE USING (
    get_my_role() = 'admin' OR
    team_id IN (SELECT id FROM teams WHERE coach_id = auth.uid())
  );

-- INVITE_CODES
CREATE POLICY "invite_codes_select_own" ON invite_codes
  FOR SELECT USING (
    created_by = auth.uid() OR
    get_my_role() = 'admin'
  );

CREATE POLICY "invite_codes_insert_coach_admin" ON invite_codes
  FOR INSERT WITH CHECK (get_my_role() IN ('coach', 'admin'));

CREATE POLICY "invite_codes_update_own" ON invite_codes
  FOR UPDATE USING (created_by = auth.uid() OR get_my_role() = 'admin');

-- Allow anyone to read invite codes by code (for sign-up validation)
CREATE POLICY "invite_codes_read_by_code" ON invite_codes
  FOR SELECT USING (true);

-- PARENT_ATHLETE_LINKS
CREATE POLICY "pal_select" ON parent_athlete_links
  FOR SELECT USING (
    parent_id = auth.uid() OR
    athlete_id = auth.uid() OR
    get_my_role() = 'admin' OR
    athlete_id IN (
      SELECT ta.athlete_id FROM team_athletes ta
      JOIN teams t ON t.id = ta.team_id
      WHERE t.coach_id = auth.uid()
    )
  );

CREATE POLICY "pal_insert_admin" ON parent_athlete_links
  FOR INSERT WITH CHECK (parent_id = auth.uid() OR get_my_role() = 'admin');

-- QUESTIONS
CREATE POLICY "questions_select_all" ON questions
  FOR SELECT USING (true);

CREATE POLICY "questions_modify_admin" ON questions
  FOR ALL USING (get_my_role() = 'admin');

-- RESPONSES
CREATE POLICY "responses_athlete_own" ON responses
  FOR ALL USING (athlete_id = auth.uid());

CREATE POLICY "responses_parent_view" ON responses
  FOR SELECT USING (
    get_my_role() = 'parent' AND
    athlete_id IN (
      SELECT pal.athlete_id FROM parent_athlete_links pal
      WHERE pal.parent_id = auth.uid()
    )
  );

CREATE POLICY "responses_coach_view" ON responses
  FOR SELECT USING (
    get_my_role() = 'coach' AND
    athlete_id IN (
      SELECT ta.athlete_id FROM team_athletes ta
      JOIN teams t ON t.id = ta.team_id
      WHERE t.coach_id = auth.uid()
    )
  );

CREATE POLICY "responses_admin_all" ON responses
  FOR ALL USING (get_my_role() = 'admin');

-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed 14 questions
INSERT INTO questions (text, category, sort_order, is_active) VALUES
  ('I understand my role on this team.', 'Mindset', 1, true),
  ('I am motivated to work hard in practice.', 'Mindset', 2, true),
  ('I feel comfortable communicating with my coach.', 'Relationships', 3, true),
  ('I feel like I belong on this team.', 'Relationships', 4, true),
  ('My teammates push me to be better.', 'Relationships', 5, true),
  ('I handle feedback and correction well.', 'Growth', 6, true),
  ('I bounce back quickly from mistakes.', 'Growth', 7, true),
  ('I prepare mentally before games and practices.', 'Preparation', 8, true),
  ('I talk to my parents/guardians about my sport.', 'Family', 9, true),
  ('I get excited to compete.', 'Competition', 10, true),
  ('I have clear goals I am working toward.', 'Goals', 11, true),
  ('I am motivated to improve every day.', 'Goals', 12, true),
  ('I take care of my body (sleep, nutrition, recovery).', 'Wellness', 13, true),
  ('I feel connected to my coach this week.', 'Connection', 14, true)
ON CONFLICT DO NOTHING;

-- Seed common sports
INSERT INTO sports_list (name) VALUES
  ('Baseball'), ('Basketball'), ('Cheerleading'), ('Cross Country'),
  ('Football'), ('Golf'), ('Lacrosse'), ('Soccer'),
  ('Softball'), ('Swimming'), ('Tennis'), ('Track & Field'),
  ('Volleyball'), ('Wrestling'), ('Ice Hockey'), ('Field Hockey')
ON CONFLICT DO NOTHING;
