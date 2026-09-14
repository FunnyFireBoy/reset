export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          message: string
          stayed_addiction_free: boolean
          streak_after: number
          timezone_offset_minutes: number
          user_id: string
          xp_awarded: number
        }
        Insert: {
          checkin_date: string
          created_at?: string
          id?: string
          message: string
          stayed_addiction_free: boolean
          streak_after?: number
          timezone_offset_minutes: number
          user_id: string
          xp_awarded?: number
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          message?: string
          stayed_addiction_free?: boolean
          streak_after?: number
          timezone_offset_minutes?: number
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      daily_quest_batches: {
        Row: {
          created_at: string
          quest_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          quest_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          quest_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          gem_reward: number
          id: string
          kind: string
          quest_date: string | null
          scheduled_at: string | null
          title: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          gem_reward?: number
          id?: string
          kind?: string
          quest_date?: string | null
          scheduled_at?: string | null
          title: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          gem_reward?: number
          id?: string
          kind?: string
          quest_date?: string | null
          scheduled_at?: string | null
          title?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_character: string | null
          addiction_type: string | null
          created_at: string
          display_name: string
          frequency: string | null
          gems: number
          id: string
          level: number
          onboarded: boolean
          triggers: string | null
          updated_at: string
          user_id: string
          xp: number
          years_addicted: string | null
        }
        Insert: {
          active_character?: string | null
          addiction_type?: string | null
          created_at?: string
          display_name?: string
          frequency?: string | null
          gems?: number
          id?: string
          level?: number
          onboarded?: boolean
          triggers?: string | null
          updated_at?: string
          user_id: string
          xp?: number
          years_addicted?: string | null
        }
        Update: {
          active_character?: string | null
          addiction_type?: string | null
          created_at?: string
          display_name?: string
          frequency?: string | null
          gems?: number
          id?: string
          level?: number
          onboarded?: boolean
          triggers?: string | null
          updated_at?: string
          user_id?: string
          xp?: number
          years_addicted?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          note: string | null
          timezone_offset_minutes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          note?: string | null
          timezone_offset_minutes: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          note?: string | null
          timezone_offset_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          blurb: string | null
          emoji: string
          id: string
          kind: string
          min_level: number
          name: string
          price_gems: number
        }
        Insert: {
          blurb?: string | null
          emoji: string
          id?: string
          kind: string
          min_level?: number
          name: string
          price_gems: number
        }
        Update: {
          blurb?: string | null
          emoji?: string
          id?: string
          kind?: string
          min_level?: number
          name?: string
          price_gems?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_goal: { Args: { _goal_id: string }; Returns: Json }
      log_recovery_relapse: {
        Args: {
          _note?: string
          _relapse_date: string
          _timezone_offset_minutes: number
          _user_id: string
        }
        Returns: Json
      }
      record_daily_checkin: {
        Args: {
          _checkin_date: string
          _stayed_addiction_free: boolean
          _timezone_offset_minutes: number
          _user_id: string
        }
        Returns: Json
      }
      start_recovery_attempt: {
        Args: {
          _quit_date: string
          _timezone_offset_minutes: number
          _user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
