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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      child_seen_chores: {
        Row: {
          child_id: string
          chore_id: string
          seen_at: string
        }
        Insert: {
          child_id: string
          chore_id: string
          seen_at?: string
        }
        Update: {
          child_id?: string
          chore_id?: string
          seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_seen_chores_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_seen_chores_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          avatar: string
          created_at: string
          family_id: string
          id: string
          name: string
          pin_hash: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          family_id: string
          id?: string
          name: string
          pin_hash: string
        }
        Update: {
          avatar?: string
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          pin_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_assignments: {
        Row: {
          child_id: string
          chore_id: string
        }
        Insert: {
          child_id: string
          chore_id: string
        }
        Update: {
          child_id?: string
          chore_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_assignments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_assignments_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          family_id: string
          frequency: Database["public"]["Enums"]["chore_frequency"]
          id: string
          points: number
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          family_id: string
          frequency?: Database["public"]["Enums"]["chore_frequency"]
          id?: string
          points?: number
          start_date?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          family_id?: string
          frequency?: Database["public"]["Enums"]["chore_frequency"]
          id?: string
          points?: number
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      completions: {
        Row: {
          child_id: string
          chore_id: string
          family_id: string
          id: string
          note: string | null
          period_key: string
          points: number
          reviewed_at: string | null
          status: Database["public"]["Enums"]["completion_status"]
          submitted_at: string
        }
        Insert: {
          child_id: string
          chore_id: string
          family_id: string
          id?: string
          note?: string | null
          period_key: string
          points: number
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["completion_status"]
          submitted_at?: string
        }
        Update: {
          child_id?: string
          chore_id?: string
          family_id?: string
          id?: string
          note?: string | null
          period_key?: string
          points?: number
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["completion_status"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "completions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completions_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_child: {
        Args: { _avatar: string; _name: string; _pin: string }
        Returns: string
      }
      child_submit: {
        Args: {
          _child_id: string
          _chore_id: string
          _period_key: string
          _pin: string
        }
        Returns: undefined
      }
      my_family_id: { Args: never; Returns: string }
      reset_child_pin: {
        Args: { _child_id: string; _pin: string }
        Returns: undefined
      }
      verify_child_pin: {
        Args: { _child_id: string; _pin: string }
        Returns: boolean
      }
    }
    Enums: {
      chore_frequency: "once" | "daily" | "weekly" | "monthly" | "yearly"
      completion_status: "pending" | "approved" | "rejected"
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
    Enums: {
      chore_frequency: ["once", "daily", "weekly", "monthly", "yearly"],
      completion_status: ["pending", "approved", "rejected"],
    },
  },
} as const
