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
      addresses: {
        Row: {
          address_line1: string
          city: string
          country: string
          entity_id: string
          id: string
          is_default: boolean
          label: string
          tenant_id: string
          type: Database["public"]["Enums"]["address_type"]
        }
        Insert: {
          address_line1: string
          city: string
          country: string
          entity_id: string
          id?: string
          is_default?: boolean
          label: string
          tenant_id: string
          type: Database["public"]["Enums"]["address_type"]
        }
        Update: {
          address_line1?: string
          city?: string
          country?: string
          entity_id?: string
          id?: string
          is_default?: boolean
          label?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["address_type"]
        }
        Relationships: [
          {
            foreignKeyName: "addresses_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_profiles: {
        Row: {
          address_line1: string | null
          city: string | null
          country: string | null
          entity_id: string | null
          id: string
          is_default: boolean
          name: string
          tenant_id: string
          vat: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          country?: string | null
          entity_id?: string | null
          id?: string
          is_default?: boolean
          name: string
          tenant_id: string
          vat?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          country?: string | null
          entity_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string
          vat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          entity_id: string
          id: string
          period: Database["public"]["Enums"]["budget_period"]
          spent: number
          store_type: Database["public"]["Enums"]["store_type"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          entity_id: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          spent?: number
          store_type: Database["public"]["Enums"]["store_type"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          entity_id?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          spent?: number
          store_type?: Database["public"]["Enums"]["store_type"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          active: boolean
          base_price: number
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          sku: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          sku: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sku?: string
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order_amount: number | null
          store_scope: string
          tenant_id: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          store_scope?: string
          tenant_id: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          store_scope?: string
          tenant_id?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          payment_on_order: boolean
          requires_approval: boolean
          tenant_id: string
          vat: string | null
          vat_rate: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          payment_on_order?: boolean
          requires_approval?: boolean
          tenant_id: string
          vat?: string | null
          vat_rate?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          payment_on_order?: boolean
          requires_approval?: boolean
          tenant_id?: string
          vat?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "entities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          qty: number
          tenant_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          qty?: number
          tenant_id: string
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          qty?: number
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          id: string
          status: string
          store_type: Database["public"]["Enums"]["store_type"]
          tenant_id: string
          total: number
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id: string
          id?: string
          status?: string
          store_type: Database["public"]["Enums"]["store_type"]
          tenant_id: string
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          id?: string
          status?: string
          store_type?: Database["public"]["Enums"]["store_type"]
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          currency: string
          id: string
          price: number
          product_id: string
          store_type: Database["public"]["Enums"]["store_type"]
          tenant_id: string
        }
        Insert: {
          currency?: string
          id?: string
          price?: number
          product_id: string
          store_type: Database["public"]["Enums"]["store_type"]
          tenant_id: string
        }
        Update: {
          currency?: string
          id?: string
          price?: number
          product_id?: string
          store_type?: Database["public"]["Enums"]["store_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          created_at: string
          id: string
          price_adjustment: number
          product_id: string
          sku_suffix: string | null
          sort_order: number
          tenant_id: string
          variant_label: string
          variant_value: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          price_adjustment?: number
          product_id: string
          sku_suffix?: string | null
          sort_order?: number
          tenant_id: string
          variant_label: string
          variant_value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          price_adjustment?: number
          product_id?: string
          sku_suffix?: string | null
          sort_order?: number
          tenant_id?: string
          variant_label?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          sku: string
          stock_type: Database["public"]["Enums"]["stock_type"]
          tenant_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          sku: string
          stock_type?: Database["public"]["Enums"]["stock_type"]
          tenant_id: string
        }
        Update: {
          active?: boolean
          category?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sku?: string
          stock_type?: Database["public"]["Enums"]["stock_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          accent_color: string
          favicon_url: string | null
          head_title: string | null
          logo_url: string | null
          primary_color: string
          tenant_id: string
        }
        Insert: {
          accent_color?: string
          favicon_url?: string | null
          head_title?: string | null
          logo_url?: string | null
          primary_color?: string
          tenant_id: string
        }
        Update: {
          accent_color?: string
          favicon_url?: string | null
          head_title?: string | null
          logo_url?: string | null
          primary_color?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_catalog_selections: {
        Row: {
          catalog_product_id: string
          enabled: boolean
          id: string
          selected_at: string
          tenant_id: string
        }
        Insert: {
          catalog_product_id: string
          enabled?: boolean
          id?: string
          selected_at?: string
          tenant_id: string
        }
        Update: {
          catalog_product_id?: string
          enabled?: boolean
          id?: string
          selected_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_catalog_selections_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_catalog_selections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_budgets: {
        Row: {
          amount: number
          entity_id: string
          id: string
          period: string
          spent: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          entity_id: string
          id?: string
          period?: string
          spent?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          entity_id?: string
          id?: string
          period?: string
          spent?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_budgets_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      address_type: "shipping" | "billing"
      app_role: "super_admin" | "shop_manager" | "dept_manager" | "employee"
      budget_period: "monthly" | "quarterly" | "yearly"
      stock_type: "in_stock" | "made_to_order"
      store_type: "bulk" | "staff"
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
      address_type: ["shipping", "billing"],
      app_role: ["super_admin", "shop_manager", "dept_manager", "employee"],
      budget_period: ["monthly", "quarterly", "yearly"],
      stock_type: ["in_stock", "made_to_order"],
      store_type: ["bulk", "staff"],
    },
  },
} as const
