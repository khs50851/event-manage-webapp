export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      event_invite_tokens: {
        Row: {
          created_at: string;
          event_id: string;
          revoked_at: string | null;
          token: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          revoked_at?: string | null;
          token?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          revoked_at?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_invite_tokens_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          capacity: number | null;
          created_at: string;
          description: string;
          group_id: string;
          id: string;
          location: string;
          rsvp_deadline: string | null;
          starts_at: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          created_at?: string;
          description?: string;
          group_id: string;
          id?: string;
          location: string;
          rsvp_deadline?: string | null;
          starts_at: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          description?: string;
          group_id?: string;
          id?: string;
          location?: string;
          rsvp_deadline?: string | null;
          starts_at?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          memo: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          memo?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          memo?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          is_one_off: boolean;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          is_one_off?: boolean;
          name: string;
          owner_id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          is_one_off?: boolean;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rsvps: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          member_id: string | null;
          name: string;
          responded_at: string;
          respondent_key: string | null;
          source: string;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          member_id?: string | null;
          name: string;
          responded_at?: string;
          respondent_key?: string | null;
          source?: string;
          status: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          member_id?: string | null;
          name?: string;
          responded_at?: string;
          respondent_key?: string | null;
          source?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rsvps_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "group_members";
            referencedColumns: ["id"];
          },
        ];
      };
      settlement_shares: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          member_id: string | null;
          name: string;
          rsvp_id: string | null;
          settlement_id: string;
          status: string;
          status_changed_at: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          member_id?: string | null;
          name: string;
          rsvp_id?: string | null;
          settlement_id: string;
          status?: string;
          status_changed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          member_id?: string | null;
          name?: string;
          rsvp_id?: string | null;
          settlement_id?: string;
          status?: string;
          status_changed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "settlement_shares_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "group_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "settlement_shares_rsvp_id_fkey";
            columns: ["rsvp_id"];
            isOneToOne: false;
            referencedRelation: "rsvps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "settlement_shares_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "settlements";
            referencedColumns: ["id"];
          },
        ];
      };
      settlement_tokens: {
        Row: {
          created_at: string;
          revoked_at: string | null;
          settlement_id: string;
          token: string;
        };
        Insert: {
          created_at?: string;
          revoked_at?: string | null;
          settlement_id: string;
          token?: string;
        };
        Update: {
          created_at?: string;
          revoked_at?: string | null;
          settlement_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "settlement_tokens_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "settlements";
            referencedColumns: ["id"];
          },
        ];
      };
      settlements: {
        Row: {
          created_at: string;
          event_id: string;
          head_count: number;
          host_included: boolean;
          host_remainder: number;
          id: string;
          payment_guide: string;
          per_person_amount: number;
          status: string;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          head_count: number;
          host_included?: boolean;
          host_remainder: number;
          id?: string;
          payment_guide: string;
          per_person_amount: number;
          status?: string;
          total_amount: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          head_count?: number;
          host_included?: boolean;
          host_remainder?: number;
          id?: string;
          payment_guide?: string;
          per_person_amount?: number;
          status?: string;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "settlements_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_one_off_event: {
        Args: {
          p_capacity: number;
          p_description: string;
          p_location: string;
          p_rsvp_deadline: string;
          p_starts_at: string;
          p_title: string;
        };
        Returns: {
          event_id: string;
          group_id: string;
        }[];
      };
      get_event_respondent_avatars: {
        Args: { p_event_id: string };
        Returns: {
          avatar_path: string;
          rsvp_id: string;
        }[];
      };
      get_invite: {
        Args: { p_respondent_key?: string; p_token: string };
        Returns: Json;
      };
      get_settlement: { Args: { p_token: string }; Returns: Json };
      get_settlement_share: {
        Args: { p_share_id: string; p_token: string };
        Returns: Json;
      };
      report_settlement_payment: {
        Args: { p_share_id: string; p_token: string };
        Returns: Json;
      };
      rotate_event_invite_token: {
        Args: { p_event_id: string };
        Returns: string;
      };
      rotate_settlement_token: {
        Args: { p_settlement_id: string };
        Returns: string;
      };
      submit_rsvp: {
        Args: {
          p_member_id?: string;
          p_name: string;
          p_respondent_key: string;
          p_status: string;
          p_token: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
