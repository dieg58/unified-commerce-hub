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
          contact_email: string
          contact_name: string
          country: string
          entity_id: string
          id: string
          is_default: boolean
          label: string
          phone: string
          postal_code: string
          tenant_id: string
          type: Database["public"]["Enums"]["address_type"]
        }
        Insert: {
          address_line1: string
          city: string
          contact_email?: string
          contact_name?: string
          country: string
          entity_id: string
          id?: string
          is_default?: boolean
          label: string
          phone?: string
          postal_code?: string
          tenant_id: string
          type: Database["public"]["Enums"]["address_type"]
        }
        Update: {
          address_line1?: string
          city?: string
          contact_email?: string
          contact_name?: string
          country?: string
          entity_id?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          postal_code?: string
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
          description_en: string | null
          description_nl: string | null
          id: string
          image_url: string | null
          name: string
          name_en: string | null
          name_nl: string | null
          sku: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_nl?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_en?: string | null
          name_nl?: string | null
          sku: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_nl?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_en?: string | null
          name_nl?: string | null
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
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          order_id: string | null
          recipient_email: string
          status: string
          subject: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          recipient_email: string
          status?: string
          subject: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          recipient_email?: string
          status?: string
          subject?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          enabled: boolean
          event_type: string
          id: string
          label: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          enabled?: boolean
          event_type: string
          id?: string
          label: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          enabled?: boolean
          event_type?: string
          id?: string
          label?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
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
      invoices: {
        Row: {
          amount_tax: number
          amount_total: number
          amount_untaxed: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          odoo_invoice_id: number | null
          odoo_pdf_url: string | null
          order_id: string
          payment_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_tax?: number
          amount_total?: number
          amount_untaxed?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          odoo_invoice_id?: number | null
          odoo_pdf_url?: string | null
          order_id: string
          payment_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_tax?: number
          amount_total?: number
          amount_untaxed?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          odoo_invoice_id?: number | null
          odoo_pdf_url?: string | null
          order_id?: string
          payment_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          tenant_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          tenant_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      odoo_sync_log: {
        Row: {
          created_at: string
          direction: string
          error_message: string | null
          id: string
          odoo_model: string | null
          odoo_record_id: number | null
          order_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          sync_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          odoo_model?: string | null
          odoo_record_id?: number | null
          order_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          sync_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          odoo_model?: string | null
          odoo_record_id?: number | null
          order_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          sync_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "odoo_sync_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odoo_sync_log_tenant_id_fkey"
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
          billing_address_id: string | null
          created_at: string
          created_by: string
          entity_id: string
          id: string
          odoo_order_id: number | null
          odoo_order_status: string | null
          odoo_synced_at: string | null
          shipping_address_id: string | null
          shipping_entity_id: string | null
          status: string
          store_type: Database["public"]["Enums"]["store_type"]
          tenant_id: string
          total: number
        }
        Insert: {
          billing_address_id?: string | null
          created_at?: string
          created_by: string
          entity_id: string
          id?: string
          odoo_order_id?: number | null
          odoo_order_status?: string | null
          odoo_synced_at?: string | null
          shipping_address_id?: string | null
          shipping_entity_id?: string | null
          status?: string
          store_type: Database["public"]["Enums"]["store_type"]
          tenant_id: string
          total?: number
        }
        Update: {
          billing_address_id?: string | null
          created_at?: string
          created_by?: string
          entity_id?: string
          id?: string
          odoo_order_id?: number | null
          odoo_order_status?: string | null
          odoo_synced_at?: string | null
          shipping_address_id?: string | null
          shipping_entity_id?: string | null
          status?: string
          store_type?: Database["public"]["Enums"]["store_type"]
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_entity_id_fkey"
            columns: ["shipping_entity_id"]
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
          name_en: string | null
          name_nl: string | null
          slug: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_en?: string | null
          name_nl?: string | null
          slug: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_en?: string | null
          name_nl?: string | null
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
          location: string | null
          price_adjustment: number
          product_id: string
          sku_suffix: string | null
          sort_order: number
          stock_qty: number
          tenant_id: string
          variant_label: string
          variant_value: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          location?: string | null
          price_adjustment?: number
          product_id: string
          sku_suffix?: string | null
          sort_order?: number
          stock_qty?: number
          tenant_id: string
          variant_label: string
          variant_value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          location?: string | null
          price_adjustment?: number
          product_id?: string
          sku_suffix?: string | null
          sort_order?: number
          stock_qty?: number
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
          active_bulk: boolean
          active_staff: boolean
          category: string
          description: string | null
          description_en: string | null
          description_nl: string | null
          id: string
          image_url: string | null
          location: string | null
          low_stock_threshold: number
          min_bulk_qty: number
          name: string
          name_en: string | null
          name_nl: string | null
          no_billing_bulk: boolean
          no_billing_staff: boolean
          odoo_product_id: number | null
          sku: string
          stock_qty: number
          stock_type: Database["public"]["Enums"]["stock_type"]
          tenant_id: string
        }
        Insert: {
          active?: boolean
          active_bulk?: boolean
          active_staff?: boolean
          category?: string
          description?: string | null
          description_en?: string | null
          description_nl?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          low_stock_threshold?: number
          min_bulk_qty?: number
          name: string
          name_en?: string | null
          name_nl?: string | null
          no_billing_bulk?: boolean
          no_billing_staff?: boolean
          odoo_product_id?: number | null
          sku: string
          stock_qty?: number
          stock_type?: Database["public"]["Enums"]["stock_type"]
          tenant_id: string
        }
        Update: {
          active?: boolean
          active_bulk?: boolean
          active_staff?: boolean
          category?: string
          description?: string | null
          description_en?: string | null
          description_nl?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          low_stock_threshold?: number
          min_bulk_qty?: number
          name?: string
          name_en?: string | null
          name_nl?: string | null
          no_billing_bulk?: boolean
          no_billing_staff?: boolean
          odoo_product_id?: number | null
          sku?: string
          stock_qty?: number
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
          odoo_partner_id: number | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          odoo_partner_id?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          odoo_partner_id?: number | null
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
      shipments: {
        Row: {
          carrier: string
          created_at: string
          created_by: string
          delivered_at: string | null
          id: string
          notes: string | null
          order_id: string
          shipped_at: string | null
          status: string
          tenant_id: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string
          created_at?: string
          created_by: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          shipped_at?: string | null
          status?: string
          tenant_id: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          shipped_at?: string | null
          status?: string
          tenant_id?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_qty: number
          performed_by: string
          previous_qty: number
          product_id: string
          quantity: number
          reason: string | null
          tenant_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_qty?: number
          performed_by: string
          previous_qty?: number
          product_id: string
          quantity: number
          reason?: string | null
          tenant_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_qty?: number
          performed_by?: string
          previous_qty?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          tenant_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          accent_color: string
          background_color: string
          button_text_color: string
          favicon_url: string | null
          head_title: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          tenant_id: string
          text_color: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          button_text_color?: string
          favicon_url?: string | null
          head_title?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          tenant_id: string
          text_color?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          button_text_color?: string
          favicon_url?: string | null
          head_title?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          tenant_id?: string
          text_color?: string
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
      tenant_shipping: {
        Row: {
          bulk_fee: number
          fixed_amount: number
          mode: string
          staff_fee: number
          tenant_id: string
          threshold_amount: number
          threshold_fee: number
        }
        Insert: {
          bulk_fee?: number
          fixed_amount?: number
          mode?: string
          staff_fee?: number
          tenant_id: string
          threshold_amount?: number
          threshold_fee?: number
        }
        Update: {
          bulk_fee?: number
          fixed_amount?: number
          mode?: string
          staff_fee?: number
          tenant_id?: string
          threshold_amount?: number
          threshold_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_shipping_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      stock_movement_type: "entry" | "exit" | "adjustment"
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
      stock_movement_type: ["entry", "exit", "adjustment"],
      stock_type: ["in_stock", "made_to_order"],
      store_type: ["bulk", "staff"],
    },
  },
} as const
