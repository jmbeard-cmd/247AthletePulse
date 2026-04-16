-- ============================================================
-- Migration: add onboarding_complete to profiles
-- Run this in Supabase SQL Editor if you already ran migrations.sql
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing athletes are treated as already onboarded so they
-- are not unexpectedly sent to the onboarding screen.
UPDATE profiles SET onboarding_complete = TRUE WHERE role = 'athlete';
