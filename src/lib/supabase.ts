import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = 'https://ulximdwnhphwlrjotubk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseGltZHduaHBod2xyam90dWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDgxMTAsImV4cCI6MjA5MTc4NDExMH0.9NEKFeYi9mxvtLnEGISjXmV8rlXaGdEkKSF0XlwGpiA';

export const isSupabaseConfigured = true;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
