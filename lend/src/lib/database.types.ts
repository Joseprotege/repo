// TypeScript types mirroring the Supabase database schema.
// In a real project these are auto-generated via: npx supabase gen types typescript
// For now they are hand-written to match 001_initial_schema.sql

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          bio: string;
          avatar_seed: string;
          city: string;
          state: string;
          neighborhood: string;
          lat: number;
          lng: number;
          skills: string[];
          is_online: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          bio?: string;
          avatar_seed?: string;
          city?: string;
          state?: string;
          neighborhood?: string;
          lat?: number;
          lng?: number;
          skills?: string[];
          is_online?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          bio?: string;
          avatar_seed?: string;
          city?: string;
          state?: string;
          neighborhood?: string;
          lat?: number;
          lng?: number;
          skills?: string[];
          is_online?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          urgency: string;
          status: string;
          image_url: string;
          city: string;
          state: string;
          neighborhood: string;
          lat: number;
          lng: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          urgency?: string;
          status?: string;
          image_url?: string;
          city?: string;
          state?: string;
          neighborhood?: string;
          lat?: number;
          lng?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          category?: string;
          urgency?: string;
          status?: string;
          image_url?: string;
          city?: string;
          state?: string;
          neighborhood?: string;
          lat?: number;
          lng?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          listing_id: string;
          user_id: string;
          message: string;
          confidence_ability: number;
          confidence_availability: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          user_id: string;
          message: string;
          confidence_ability: number;
          confidence_availability: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          user_id?: string;
          message?: string;
          confidence_ability?: number;
          confidence_availability?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reliability_scores: {
        Row: {
          user_id: string;
          total_offers: number;
          completed: number;
          positive_outcomes: number;
          self_assessed_ability_avg: number;
          self_assessed_availability_avg: number;
          actual_score: number;
          overall: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_offers?: number;
          completed?: number;
          positive_outcomes?: number;
          self_assessed_ability_avg?: number;
          self_assessed_availability_avg?: number;
          actual_score?: number;
          overall?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          total_offers?: number;
          completed?: number;
          positive_outcomes?: number;
          self_assessed_ability_avg?: number;
          self_assessed_availability_avg?: number;
          actual_score?: number;
          overall?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          link_to: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type?: string;
          link_to?: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          type?: string;
          link_to?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      community_broadcasts: {
        Row: {
          id: string;
          sender_id: string | null;
          area_label: string;
          category: string;
          message: string;
          note: string;
          reactions_heart: number;
          reactions_clap: number;
          reactions_spark: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id?: string | null;
          area_label: string;
          category: string;
          message: string;
          note?: string;
          reactions_heart?: number;
          reactions_clap?: number;
          reactions_spark?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string | null;
          area_label?: string;
          category?: string;
          message?: string;
          note?: string;
          reactions_heart?: number;
          reactions_clap?: number;
          reactions_spark?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      broadcast_reactions: {
        Row: {
          id: string;
          broadcast_id: string;
          user_id: string;
          reaction_type: 'heart' | 'clap' | 'spark';
          created_at: string;
        };
        Insert: {
          id?: string;
          broadcast_id: string;
          user_id: string;
          reaction_type: 'heart' | 'clap' | 'spark';
          created_at?: string;
        };
        Update: {
          id?: string;
          broadcast_id?: string;
          user_id?: string;
          reaction_type?: 'heart' | 'clap' | 'spark';
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
