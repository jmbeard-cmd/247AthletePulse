export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'athlete' | 'parent' | 'coach' | 'admin';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
      };
      sports_list: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string | null;
        };
      };
      athlete_sports: {
        Row: {
          id: string;
          athlete_id: string;
          sport_id: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          sport_id: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          sport_id?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          coach_id: string;
          sport_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          coach_id: string;
          sport_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          coach_id?: string;
          sport_id?: string | null;
          created_at?: string;
        };
      };
      team_athletes: {
        Row: {
          id: string;
          team_id: string;
          athlete_id: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          athlete_id: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          athlete_id?: string;
        };
      };
      invite_codes: {
        Row: {
          id: string;
          code: string;
          role: 'coach' | 'athlete' | 'parent';
          created_by: string;
          used_by: string | null;
          athlete_id: string | null;
          intended_email: string | null;
          is_used: boolean;
          auto_generated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          role: 'coach' | 'athlete' | 'parent';
          created_by: string;
          used_by?: string | null;
          athlete_id?: string | null;
          intended_email?: string | null;
          is_used?: boolean;
          auto_generated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          role?: 'coach' | 'athlete' | 'parent';
          created_by?: string;
          used_by?: string | null;
          athlete_id?: string | null;
          intended_email?: string | null;
          is_used?: boolean;
          auto_generated?: boolean;
          created_at?: string;
        };
      };
      parent_athlete_links: {
        Row: {
          id: string;
          parent_id: string;
          athlete_id: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          athlete_id: string;
        };
        Update: {
          id?: string;
          parent_id?: string;
          athlete_id?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          text: string;
          category: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          text: string;
          category: string;
          sort_order: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          text?: string;
          category?: string;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      responses: {
        Row: {
          id: string;
          athlete_id: string;
          question_id: string;
          score: number;
          week_of: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          question_id: string;
          score: number;
          week_of: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          question_id?: string;
          score?: number;
          week_of?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type SportsList = Database['public']['Tables']['sports_list']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamAthlete = Database['public']['Tables']['team_athletes']['Row'];
export type InviteCode = Database['public']['Tables']['invite_codes']['Row'];
export type ParentAthleteLink = Database['public']['Tables']['parent_athlete_links']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type Response = Database['public']['Tables']['responses']['Row'];
