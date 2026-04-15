import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Read env vars - these may be undefined in preview environments
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured with real values
export const isSupabaseConfigured = !!(
  envUrl &&
  envKey &&
  typeof envUrl === 'string' &&
  typeof envKey === 'string' &&
  envUrl.trim().length > 0 &&
  envKey.trim().length > 0 &&
  !envUrl.includes('your-project') &&
  !envKey.includes('your-anon-key') &&
  envUrl.startsWith('https://')
);

// Use valid-format dummy values when not configured to prevent
// "supabaseUrl is required" errors from Supabase client initialization
const DUMMY_URL = 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkxNTYzODQwMH0.dummySignatureForPreviewOnly';

const supabaseUrl = isSupabaseConfigured ? (envUrl as string) : DUMMY_URL;
const supabaseAnonKey = isSupabaseConfigured ? (envKey as string) : DUMMY_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
