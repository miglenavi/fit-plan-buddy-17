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
      bookings: {
        Row: {
          client_id: string
          client_note: string | null
          created_at: string
          end_at: string
          id: string
          start_at: string
          status: string
          trainer_id: string
          training_id: string | null
          training_session_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          client_note?: string | null
          created_at?: string
          end_at: string
          id?: string
          start_at: string
          status?: string
          trainer_id: string
          training_id?: string | null
          training_session_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_note?: string | null
          created_at?: string
          end_at?: string
          id?: string
          start_at?: string
          status?: string
          trainer_id?: string
          training_id?: string | null
          training_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          full_name: string | null
          id: string
          status: string
          token: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          status?: string
          token: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          status?: string
          token?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_programs: {
        Row: {
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          plan_id: string
          start_date: string
          status: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id: string
          start_date?: string
          status?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_programs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          default_rest_seconds: number | null
          description: string | null
          id: string
          image_url: string | null
          muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          name: string
          primary_muscle_group:
            | Database["public"]["Enums"]["muscle_group"]
            | null
          secondary_muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          trainer_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          default_rest_seconds?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name: string
          primary_muscle_group?:
            | Database["public"]["Enums"]["muscle_group"]
            | null
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          trainer_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          default_rest_seconds?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name?: string
          primary_muscle_group?:
            | Database["public"]["Enums"]["muscle_group"]
            | null
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          trainer_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          alt_target_reps_max: number | null
          alt_target_reps_min: number | null
          alt_target_sets: number | null
          alt_target_weight: number | null
          alternative_exercise_id: string | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          session_id: string
          target_reps_max: number | null
          target_reps_min: number | null
          target_sets: number | null
          target_weight: number | null
          training_exercise_id: string | null
        }
        Insert: {
          alt_target_reps_max?: number | null
          alt_target_reps_min?: number | null
          alt_target_sets?: number | null
          alt_target_weight?: number | null
          alternative_exercise_id?: string | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          session_id: string
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number | null
          target_weight?: number | null
          training_exercise_id?: string | null
        }
        Update: {
          alt_target_reps_max?: number | null
          alt_target_reps_min?: number | null
          alt_target_sets?: number | null
          alt_target_weight?: number | null
          alternative_exercise_id?: string | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          session_id?: string
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number | null
          target_weight?: number | null
          training_exercise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_alternative_exercise_id_fkey"
            columns: ["alternative_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_training_exercise_id_fkey"
            columns: ["training_exercise_id"]
            isOneToOne: false
            referencedRelation: "training_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          reps: number | null
          rpe: number | null
          session_exercise_id: string
          set_index: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          reps?: number | null
          rpe?: number | null
          session_exercise_id: string
          set_index: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          reps?: number | null
          rpe?: number | null
          session_exercise_id?: string
          set_index?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_applications: {
        Row: {
          created_at: string
          email: string
          full_name: string
          note: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          note?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          note?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trainer_availability: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          is_recurring: boolean
          specific_date: string | null
          start_time: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          is_recurring?: boolean
          specific_date?: string | null
          start_time: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_recurring?: boolean
          specific_date?: string | null
          start_time?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainer_clients: {
        Row: {
          archived_at: string | null
          client_id: string
          created_at: string
          id: string
          trainer_id: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          created_at?: string
          id?: string
          trainer_id: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          created_at?: string
          id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_clients_client_profile_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_requests: {
        Row: {
          client_id: string
          created_at: string
          decline_reason: string | null
          id: string
          note: string | null
          status: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          decline_reason?: string | null
          id?: string
          note?: string | null
          status?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          decline_reason?: string | null
          id?: string
          note?: string | null
          status?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_exercises: {
        Row: {
          alt_coach_notes: string | null
          alt_rest_seconds: number | null
          alt_target_reps_max: number | null
          alt_target_reps_min: number | null
          alt_target_sets: number | null
          alt_target_weight: number | null
          alternative_exercise_id: string | null
          coach_notes: string | null
          exercise_id: string
          id: string
          order_index: number
          rest_seconds: number | null
          target_reps_max: number
          target_reps_min: number
          target_sets: number
          target_weight: number | null
          training_id: string
        }
        Insert: {
          alt_coach_notes?: string | null
          alt_rest_seconds?: number | null
          alt_target_reps_max?: number | null
          alt_target_reps_min?: number | null
          alt_target_sets?: number | null
          alt_target_weight?: number | null
          alternative_exercise_id?: string | null
          coach_notes?: string | null
          exercise_id: string
          id?: string
          order_index?: number
          rest_seconds?: number | null
          target_reps_max?: number
          target_reps_min?: number
          target_sets?: number
          target_weight?: number | null
          training_id: string
        }
        Update: {
          alt_coach_notes?: string | null
          alt_rest_seconds?: number | null
          alt_target_reps_max?: number | null
          alt_target_reps_min?: number | null
          alt_target_sets?: number | null
          alt_target_weight?: number | null
          alternative_exercise_id?: string | null
          coach_notes?: string | null
          exercise_id?: string
          id?: string
          order_index?: number
          rest_seconds?: number | null
          target_reps_max?: number
          target_reps_min?: number
          target_sets?: number
          target_weight?: number | null
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_exercises_alternative_exercise_id_fkey"
            columns: ["alternative_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_exercises_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          client_id: string
          client_notes: string | null
          completed_at: string | null
          created_at: string
          id: string
          logged_by: string
          started_at: string
          status: string
          trainer_id: string | null
          trainer_notes: string | null
          training_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_notes?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          logged_by?: string
          started_at?: string
          status?: string
          trainer_id?: string | null
          trainer_notes?: string | null
          training_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_notes?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          logged_by?: string
          started_at?: string
          status?: string
          trainer_id?: string | null
          trainer_notes?: string | null
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          role: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          role?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          role?: string | null
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_client_invite: { Args: { _token: string }; Returns: string }
      approve_trainer: { Args: { _user_id: string }; Returns: undefined }
      choose_session_exercise: {
        Args: { _se_id: string; _use_alternative: boolean }
        Returns: undefined
      }
      get_invite_info: {
        Args: { _token: string }
        Returns: {
          email: string
          full_name: string
          trainer_name: string
          valid: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_plan_assigned_to_client: {
        Args: { _client_id: string; _plan_id: string }
        Returns: boolean
      }
      is_plan_owned_by_trainer: {
        Args: { _plan_id: string; _trainer_id: string }
        Returns: boolean
      }
      is_trainer_of: {
        Args: { _client: string; _trainer: string }
        Returns: boolean
      }
      is_training_assigned_to_client: {
        Args: { _client_id: string; _training_id: string }
        Returns: boolean
      }
      link_client_by_email: { Args: { _email: string }; Returns: string }
      list_trainers: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      reapply_trainer: { Args: { _note: string }; Returns: undefined }
      reject_trainer: {
        Args: { _reason: string; _user_id: string }
        Returns: undefined
      }
      respond_to_trainer_request: {
        Args: { _approve: boolean; _reason?: string; _request_id: string }
        Returns: undefined
      }
      set_session_exercise_sets: {
        Args: { _count: number; _se_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "trainer" | "client" | "super_admin"
      muscle_group:
        | "chest"
        | "upper_back"
        | "lower_back"
        | "shoulders"
        | "biceps"
        | "triceps"
        | "quads"
        | "hamstrings"
        | "glutes"
        | "calves"
        | "core"
        | "full_body"
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
      app_role: ["trainer", "client", "super_admin"],
      muscle_group: [
        "chest",
        "upper_back",
        "lower_back",
        "shoulders",
        "biceps",
        "triceps",
        "quads",
        "hamstrings",
        "glutes",
        "calves",
        "core",
        "full_body",
      ],
    },
  },
} as const
