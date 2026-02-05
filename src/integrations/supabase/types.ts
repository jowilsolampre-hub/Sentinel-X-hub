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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      market_state: {
        Row: {
          armed: boolean
          connection_status: string
          last_seen_at: string | null
          market_id: Database["public"]["Enums"]["market_id_enum"]
          meta: Json
          updated_at: string
        }
        Insert: {
          armed?: boolean
          connection_status?: string
          last_seen_at?: string | null
          market_id: Database["public"]["Enums"]["market_id_enum"]
          meta?: Json
          updated_at?: string
        }
        Update: {
          armed?: boolean
          connection_status?: string
          last_seen_at?: string | null
          market_id?: Database["public"]["Enums"]["market_id_enum"]
          meta?: Json
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value_json: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value_json: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value_json?: Json
        }
        Relationships: []
      }
      signals: {
        Row: {
          created_at: string
          direction: string
          executed_at: string | null
          expires_at: string | null
          id: string
          market_id: Database["public"]["Enums"]["market_id_enum"]
          notes: string | null
          outcome: Database["public"]["Enums"]["outcome_enum"]
          outcome_reason: string | null
          score: number
          score_detail_json: Json
          stage: Database["public"]["Enums"]["signal_stage_enum"]
          status: Database["public"]["Enums"]["signal_status_enum"]
          strategy: string | null
          symbol: string
          timeframe: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direction: string
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          market_id: Database["public"]["Enums"]["market_id_enum"]
          notes?: string | null
          outcome?: Database["public"]["Enums"]["outcome_enum"]
          outcome_reason?: string | null
          score?: number
          score_detail_json?: Json
          stage: Database["public"]["Enums"]["signal_stage_enum"]
          status?: Database["public"]["Enums"]["signal_status_enum"]
          strategy?: string | null
          symbol: string
          timeframe?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direction?: string
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          market_id?: Database["public"]["Enums"]["market_id_enum"]
          notes?: string | null
          outcome?: Database["public"]["Enums"]["outcome_enum"]
          outcome_reason?: string | null
          score?: number
          score_detail_json?: Json
          stage?: Database["public"]["Enums"]["signal_stage_enum"]
          status?: Database["public"]["Enums"]["signal_status_enum"]
          strategy?: string | null
          symbol?: string
          timeframe?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_finals: {
        Row: {
          created_at: string | null
          direction: string | null
          executed_at: string | null
          expires_at: string | null
          id: string | null
          market_id: Database["public"]["Enums"]["market_id_enum"] | null
          notes: string | null
          outcome: Database["public"]["Enums"]["outcome_enum"] | null
          outcome_reason: string | null
          score: number | null
          score_detail_json: Json | null
          stage: Database["public"]["Enums"]["signal_stage_enum"] | null
          status: Database["public"]["Enums"]["signal_status_enum"] | null
          strategy: string | null
          symbol: string | null
          timeframe: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string | null
          market_id?: Database["public"]["Enums"]["market_id_enum"] | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["outcome_enum"] | null
          outcome_reason?: string | null
          score?: number | null
          score_detail_json?: Json | null
          stage?: Database["public"]["Enums"]["signal_stage_enum"] | null
          status?: Database["public"]["Enums"]["signal_status_enum"] | null
          strategy?: string | null
          symbol?: string | null
          timeframe?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string | null
          market_id?: Database["public"]["Enums"]["market_id_enum"] | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["outcome_enum"] | null
          outcome_reason?: string | null
          score?: number | null
          score_detail_json?: Json | null
          stage?: Database["public"]["Enums"]["signal_stage_enum"] | null
          status?: Database["public"]["Enums"]["signal_status_enum"] | null
          strategy?: string | null
          symbol?: string | null
          timeframe?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      market_id_enum: "BINANCE" | "MT5_FOREX" | "PO_OTC" | "QX_OTC"
      outcome_enum: "WIN" | "LOSS" | "BREAKEVEN" | "UNKNOWN"
      signal_stage_enum: "CANDIDATE" | "CONFIRM" | "FINAL"
      signal_status_enum:
        | "CANDIDATE"
        | "CONFIRM"
        | "FINAL"
        | "EXECUTED"
        | "EXPIRED"
        | "REJECTED"
        | "BLOCKED"
        | "DISMISSED"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      market_id_enum: ["BINANCE", "MT5_FOREX", "PO_OTC", "QX_OTC"],
      outcome_enum: ["WIN", "LOSS", "BREAKEVEN", "UNKNOWN"],
      signal_stage_enum: ["CANDIDATE", "CONFIRM", "FINAL"],
      signal_status_enum: [
        "CANDIDATE",
        "CONFIRM",
        "FINAL",
        "EXECUTED",
        "EXPIRED",
        "REJECTED",
        "BLOCKED",
        "DISMISSED",
      ],
    },
  },
} as const
