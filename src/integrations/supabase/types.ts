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
      admin_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          function_name: string
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string | null
          output_tokens: number | null
          status: string
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          function_name: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          status?: string
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          function_name?: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          status?: string
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_quotas: {
        Row: {
          created_at: string
          id: string
          is_unlimited: boolean
          monthly_limit: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_unlimited?: boolean
          monthly_limit?: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_unlimited?: boolean
          monthly_limit?: number
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      art_file_attachments: {
        Row: {
          created_at: string
          file_extension: string | null
          file_path: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          mockup_id: string | null
          notes: string | null
          original_name: string
          quote_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_extension?: string | null
          file_path: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          mockup_id?: string | null
          notes?: string | null
          original_name: string
          quote_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_extension?: string | null
          file_path?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          mockup_id?: string | null
          notes?: string | null
          original_name?: string
          quote_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_detection_log: {
        Row: {
          blocked: boolean
          created_at: string
          detection_reason: string
          endpoint: string
          id: string
          ip_address: string
          metadata: Json | null
          request_count: number | null
          user_agent: string | null
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          detection_reason: string
          endpoint: string
          id?: string
          ip_address: string
          metadata?: Json | null
          request_count?: number | null
          user_agent?: string | null
        }
        Update: {
          blocked?: boolean
          created_at?: string
          detection_reason?: string
          endpoint?: string
          id?: string
          ip_address?: string
          metadata?: Json | null
          request_count?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      cart_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      category_icons: {
        Row: {
          category_name: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_name: string
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_name?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          sort_order: number | null
          thumbnail_url: string | null
        }
        Insert: {
          collection_id: string
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          collection_id?: string
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          icon_color: string | null
          id: string
          is_featured: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          is_featured?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          is_featured?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commission_entries: {
        Row: {
          commission_amount: number
          commission_percent: number
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          order_total: number
          paid_at: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          commission_percent: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_total?: number
          paid_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_total?: number
          paid_at?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          commission_percent: number
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          max_order_value: number | null
          min_order_value: number | null
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_order_value?: number | null
          min_order_value?: number | null
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_order_value?: number | null
          min_order_value?: number | null
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      component_media: {
        Row: {
          component_id: string
          created_at: string
          id: string
          is_cover: boolean | null
          media_type: string
          product_id: string
          sort_order: number | null
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          is_cover?: boolean | null
          media_type?: string
          product_id: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          is_cover?: boolean | null
          media_type?: string
          product_id?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      custom_kits: {
        Row: {
          box_data: Json | null
          box_price: number
          created_at: string
          id: string
          items_data: Json
          items_price: number
          kit_quantity: number
          kit_type: string
          name: string
          personalization_data: Json
          personalization_price: number
          status: string
          total_price: number
          updated_at: string
          user_id: string
          volume_usage_percent: number
        }
        Insert: {
          box_data?: Json | null
          box_price?: number
          created_at?: string
          id?: string
          items_data?: Json
          items_price?: number
          kit_quantity?: number
          kit_type?: string
          name?: string
          personalization_data?: Json
          personalization_price?: number
          status?: string
          total_price?: number
          updated_at?: string
          user_id: string
          volume_usage_percent?: number
        }
        Update: {
          box_data?: Json | null
          box_price?: number
          created_at?: string
          id?: string
          items_data?: Json
          items_price?: number
          kit_quantity?: number
          kit_type?: string
          name?: string
          personalization_data?: Json
          personalization_price?: number
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string
          volume_usage_percent?: number
        }
        Relationships: []
      }
      discount_approval_requests: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          created_at: string
          id: string
          max_allowed_percent: number
          quote_id: string
          requested_discount_percent: number
          responded_at: string | null
          seller_id: string
          seller_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          created_at?: string
          id?: string
          max_allowed_percent: number
          quote_id: string
          requested_discount_percent: number
          responded_at?: string | null
          seller_id: string
          seller_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          created_at?: string
          id?: string
          max_allowed_percent?: number
          quote_id?: string
          requested_discount_percent?: number
          responded_at?: string | null
          seller_id?: string
          seller_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_approval_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_conversations: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          seller_id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          seller_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          seller_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      expert_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "expert_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          is_sent: boolean
          notes: string | null
          quote_id: string
          reminder_type: string
          scheduled_for: string
          seller_id: string
          sent_at: string | null
          title: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          is_sent?: boolean
          notes?: string | null
          quote_id: string
          reminder_type?: string
          scheduled_for: string
          seller_id: string
          sent_at?: string | null
          title?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          is_sent?: boolean
          notes?: string | null
          quote_id?: string
          reminder_type?: string
          scheduled_for?: string
          seller_id?: string
          sent_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      generated_mockups: {
        Row: {
          annotations: Json | null
          client_id: string | null
          client_name: string | null
          colors_count: number | null
          created_at: string
          id: string
          layout_url: string | null
          location_name: string | null
          logo_height_cm: number | null
          logo_url: string | null
          logo_width_cm: number | null
          mockup_url: string | null
          position_x: number | null
          position_y: number | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          seller_id: string
          technique_id: string | null
          technique_name: string | null
        }
        Insert: {
          annotations?: Json | null
          client_id?: string | null
          client_name?: string | null
          colors_count?: number | null
          created_at?: string
          id?: string
          layout_url?: string | null
          location_name?: string | null
          logo_height_cm?: number | null
          logo_url?: string | null
          logo_width_cm?: number | null
          mockup_url?: string | null
          position_x?: number | null
          position_y?: number | null
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          seller_id: string
          technique_id?: string | null
          technique_name?: string | null
        }
        Update: {
          annotations?: Json | null
          client_id?: string | null
          client_name?: string | null
          colors_count?: number | null
          created_at?: string
          id?: string
          layout_url?: string | null
          location_name?: string | null
          logo_height_cm?: number | null
          logo_url?: string | null
          logo_width_cm?: number | null
          mockup_url?: string | null
          position_x?: number | null
          position_y?: number | null
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          seller_id?: string
          technique_id?: string | null
          technique_name?: string | null
        }
        Relationships: []
      }
      ip_access_control: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          ip_address: string
          list_type: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          ip_address: string
          list_type: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          list_type?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kit_share_tokens: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          kit_id: string
          seller_id: string
          status: string
          token: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kit_id: string
          seller_id: string
          status?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kit_id?: string
          seller_id?: string
          status?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_share_tokens_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "custom_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      magic_up_generations: {
        Row: {
          client_name: string | null
          created_at: string
          generated_image_url: string | null
          id: string
          is_favorite: boolean | null
          product_name: string | null
          scene_category: string | null
          scene_title: string | null
          user_id: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          generated_image_url?: string | null
          id?: string
          is_favorite?: boolean | null
          product_name?: string | null
          scene_category?: string | null
          scene_title?: string | null
          user_id: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          generated_image_url?: string | null
          id?: string
          is_favorite?: boolean | null
          product_name?: string | null
          scene_category?: string | null
          scene_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mockup_drafts: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          draft_key: string
          id: string
          logo_data: string | null
          personalization_areas: Json | null
          product_id: string | null
          product_name: string | null
          technique_id: string | null
          technique_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          draft_key?: string
          id?: string
          logo_data?: string | null
          personalization_areas?: Json | null
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          draft_key?: string
          id?: string
          logo_data?: string | null
          personalization_areas?: Json | null
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mockup_prompt_configs: {
        Row: {
          ai_model: string
          config_key: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          prompt_text: string
          technique_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          ai_model?: string
          config_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          prompt_text: string
          technique_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          ai_model?: string
          config_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          prompt_text?: string
          technique_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      mockup_prompt_history: {
        Row: {
          ai_model: string
          change_notes: string | null
          changed_at: string
          changed_by: string | null
          config_id: string
          config_key: string
          id: string
          new_prompt: string
          old_prompt: string | null
          version: number
        }
        Insert: {
          ai_model: string
          change_notes?: string | null
          changed_at?: string
          changed_by?: string | null
          config_id: string
          config_key: string
          id?: string
          new_prompt: string
          old_prompt?: string | null
          version: number
        }
        Update: {
          ai_model?: string
          change_notes?: string | null
          changed_at?: string
          changed_by?: string | null
          config_id?: string
          config_key?: string
          id?: string
          new_prompt?: string
          old_prompt?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mockup_prompt_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "mockup_prompt_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      mockup_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          name: string
          personalization_areas: Json
          product_id: string | null
          product_name: string | null
          technique_id: string | null
          technique_name: string | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          personalization_areas?: Json
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          personalization_areas?: Json
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          organization_id: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_sku: string | null
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          organization_id?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string | null
          product_sku?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          organization_id?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string | null
          product_sku?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_company: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          delivery_time: string | null
          discount_amount: number | null
          fulfillment_status: string
          id: string
          internal_notes: string | null
          notes: string | null
          order_number: string
          organization_id: string | null
          payment_terms: string | null
          quote_id: string | null
          seller_id: string
          shipping_cost: number | null
          shipping_type: string | null
          status: string
          subtotal: number | null
          total: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_time?: string | null
          discount_amount?: number | null
          fulfillment_status?: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          organization_id?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          seller_id: string
          shipping_cost?: number | null
          shipping_type?: string | null
          status?: string
          subtotal?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_time?: string | null
          discount_amount?: number | null
          fulfillment_status?: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          organization_id?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          seller_id?: string
          shipping_cost?: number | null
          shipping_type?: string | null
          status?: string
          subtotal?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_component_locations: {
        Row: {
          component_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location_code: string
          location_name: string
          max_height_cm: number | null
          max_width_cm: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          component_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_code: string
          location_name: string
          max_height_cm?: number | null
          max_width_cm?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          component_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_code?: string
          location_name?: string
          max_height_cm?: number | null
          max_width_cm?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_component_locations_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "product_components"
            referencedColumns: ["id"]
          },
        ]
      }
      product_components: {
        Row: {
          component_code: string
          component_name: string
          created_at: string
          id: string
          is_active: boolean
          is_personalizable: boolean
          product_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          component_code: string
          component_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_personalizable?: boolean
          product_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          component_code?: string
          component_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_personalizable?: boolean
          product_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_group_members: {
        Row: {
          created_at: string
          id: string
          product_group_id: string
          product_id: string
          updated_at: string
          use_group_rules: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          product_group_id: string
          product_id: string
          updated_at?: string
          use_group_rules?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          product_group_id?: string
          product_id?: string
          updated_at?: string
          use_group_rules?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_group_members_product_group_id_fkey"
            columns: ["product_group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          created_at: string
          description: string | null
          group_code: string
          group_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_code: string
          group_name: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_code?: string
          group_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      product_sync_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          payload: Json | null
          records_failed: number
          records_inserted: number
          records_processed: number
          records_updated: number
          source: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          records_failed?: number
          records_inserted?: number
          records_processed?: number
          records_updated?: number
          source: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          records_failed?: number
          records_inserted?: number
          records_processed?: number
          records_updated?: number
          source?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          seller_id: string | null
          view_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          seller_id?: string | null
          view_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          seller_id?: string | null
          view_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          phone: string | null
          preferences: Json | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      query_telemetry: {
        Row: {
          count_mode: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          operation: string
          query_limit: number | null
          query_offset: number | null
          record_count: number | null
          rpc_name: string | null
          severity: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          count_mode?: string | null
          created_at?: string
          duration_ms: number
          error_message?: string | null
          id?: string
          operation: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quote_approval_tokens: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          quote_id: string
          responded_at: string | null
          response: string | null
          response_notes: string | null
          seller_id: string
          signature_hash: string | null
          signed_at: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_name: string | null
          signer_user_agent: string | null
          status: string
          token: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          quote_id: string
          responded_at?: string | null
          response?: string | null
          response_notes?: string | null
          seller_id: string
          signature_hash?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_user_agent?: string | null
          status?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          quote_id?: string
          responded_at?: string | null
          response?: string | null
          response_notes?: string | null
          seller_id?: string
          signature_hash?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_user_agent?: string | null
          status?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      quote_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean
          parent_id: string | null
          quote_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          quote_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          quote_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "quote_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_history: {
        Row: {
          action: string
          created_at: string
          description: string | null
          field_changed: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          quote_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          quote_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          quote_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_item_personalizations: {
        Row: {
          area_cm2: number | null
          colors_count: number | null
          created_at: string
          height_cm: number | null
          id: string
          notes: string | null
          personalized_quantity: number | null
          positions_count: number | null
          quote_item_id: string
          setup_cost: number | null
          technique_id: string | null
          technique_name: string | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
          width_cm: number | null
        }
        Insert: {
          area_cm2?: number | null
          colors_count?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          notes?: string | null
          personalized_quantity?: number | null
          positions_count?: number | null
          quote_item_id: string
          setup_cost?: number | null
          technique_id?: string | null
          technique_name?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          width_cm?: number | null
        }
        Update: {
          area_cm2?: number | null
          colors_count?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          notes?: string | null
          personalized_quantity?: number | null
          positions_count?: number | null
          quote_item_id?: string
          setup_cost?: number | null
          technique_id?: string | null
          technique_name?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_item_personalizations_quote_item_id_fkey"
            columns: ["quote_item_id"]
            isOneToOne: false
            referencedRelation: "quote_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          color_hex: string | null
          color_name: string | null
          created_at: string
          display_order: number | null
          gender: string | null
          id: string
          kit_group_id: string | null
          kit_name: string | null
          notes: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          quote_id: string
          size_code: string | null
          sort_order: number | null
          subtotal: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          display_order?: number | null
          gender?: string | null
          id?: string
          kit_group_id?: string | null
          kit_name?: string | null
          notes?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          quote_id: string
          size_code?: string | null
          sort_order?: number | null
          subtotal?: number | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          display_order?: number | null
          gender?: string | null
          id?: string
          kit_group_id?: string | null
          kit_name?: string | null
          notes?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          quote_id?: string
          size_code?: string | null
          sort_order?: number | null
          subtotal?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          created_at: string
          delivery_time: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          internal_notes: string | null
          is_default: boolean | null
          items_data: Json | null
          name: string
          notes: string | null
          payment_terms: string | null
          seller_id: string
          template_data: Json | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          delivery_time?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          internal_notes?: string | null
          is_default?: boolean | null
          items_data?: Json | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          seller_id: string
          template_data?: Json | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          delivery_time?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          internal_notes?: string | null
          is_default?: boolean | null
          items_data?: Json | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          seller_id?: string
          template_data?: Json | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          bitrix_deal_id: string | null
          bitrix_quote_id: string | null
          client_cnpj: string | null
          client_company: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          client_response: string | null
          client_response_at: string | null
          client_response_notes: string | null
          created_at: string
          delivery_time: string | null
          discount_amount: number
          discount_percent: number
          id: string
          internal_notes: string | null
          is_latest_version: boolean
          negotiation_markup_percent: number
          notes: string | null
          organization_id: string | null
          parent_quote_id: string | null
          payment_terms: string | null
          quote_number: string
          real_discount_percent: number | null
          real_subtotal: number | null
          seller_id: string
          sent_at: string | null
          shipping_cost: number | null
          shipping_type: string | null
          status: string
          subtotal: number
          synced_at: string | null
          synced_to_bitrix: boolean | null
          total: number
          updated_at: string
          valid_until: string | null
          version: number
        }
        Insert: {
          bitrix_deal_id?: string | null
          bitrix_quote_id?: string | null
          client_cnpj?: string | null
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_response?: string | null
          client_response_at?: string | null
          client_response_notes?: string | null
          created_at?: string
          delivery_time?: string | null
          discount_amount?: number
          discount_percent?: number
          id?: string
          internal_notes?: string | null
          is_latest_version?: boolean
          negotiation_markup_percent?: number
          notes?: string | null
          organization_id?: string | null
          parent_quote_id?: string | null
          payment_terms?: string | null
          quote_number?: string
          real_discount_percent?: number | null
          real_subtotal?: number | null
          seller_id: string
          sent_at?: string | null
          shipping_cost?: number | null
          shipping_type?: string | null
          status?: string
          subtotal?: number
          synced_at?: string | null
          synced_to_bitrix?: boolean | null
          total?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          bitrix_deal_id?: string | null
          bitrix_quote_id?: string | null
          client_cnpj?: string | null
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_response?: string | null
          client_response_at?: string | null
          client_response_notes?: string | null
          created_at?: string
          delivery_time?: string | null
          discount_amount?: number
          discount_percent?: number
          id?: string
          internal_notes?: string | null
          is_latest_version?: boolean
          negotiation_markup_percent?: number
          notes?: string | null
          organization_id?: string | null
          parent_quote_id?: string | null
          payment_terms?: string | null
          quote_number?: string
          real_discount_percent?: number | null
          real_subtotal?: number | null
          seller_id?: string
          sent_at?: string | null
          shipping_cost?: number | null
          shipping_type?: string | null
          status?: string
          subtotal?: number
          synced_at?: string | null
          synced_to_bitrix?: boolean | null
          total?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      request_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_code?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          color: string | null
          context: string
          created_at: string
          description: string | null
          filters: Json
          icon: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          context?: string
          created_at?: string
          description?: string | null
          filters?: Json
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          context?: string
          created_at?: string
          description?: string | null
          filters?: Json
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_trends_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string
          email_to: string
          filters: Json | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          next_run_at: string
          report_name: string
          report_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_to: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_run_at?: string
          report_name?: string
          report_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_to?: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_run_at?: string
          report_name?: string
          report_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          created_at: string
          id: string
          results_count: number
          search_context: string | null
          search_term: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          results_count?: number
          search_context?: string | null
          search_term: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          results_count?: number
          search_context?: string | null
          search_term?: string
          user_id?: string | null
        }
        Relationships: []
      }
      seller_cart_items: {
        Row: {
          cart_id: string
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          product_image_url: string | null
          product_name: string
          product_price: number
          product_sku: string | null
          quantity: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          cart_id: string
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          product_image_url?: string | null
          product_name: string
          product_price?: number
          product_sku?: string | null
          quantity?: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          cart_id?: string
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          product_image_url?: string | null
          product_name?: string
          product_price?: number
          product_sku?: string | null
          quantity?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "seller_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_carts: {
        Row: {
          company_id: string
          company_location: string | null
          company_logo_url: string | null
          company_name: string
          created_at: string
          id: string
          notes: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          company_location?: string | null
          company_logo_url?: string | null
          company_name: string
          created_at?: string
          id?: string
          notes?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_location?: string | null
          company_logo_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_discount_limits: {
        Row: {
          created_at: string
          id: string
          max_discount_percent: number
          notes: string | null
          set_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_discount_percent?: number
          notes?: string | null
          set_by: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_discount_percent?: number
          notes?: string | null
          set_by?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      simulator_wizard_drafts: {
        Row: {
          created_at: string
          id: string
          personalizations: Json
          product_data: Json
          quantity: number
          title: string
          updated_at: string
          user_id: string
          wizard_step: string
        }
        Insert: {
          created_at?: string
          id?: string
          personalizations?: Json
          product_data?: Json
          quantity?: number
          title?: string
          updated_at?: string
          user_id: string
          wizard_step?: string
        }
        Update: {
          created_at?: string
          id?: string
          personalizations?: Json
          product_data?: Json
          quantity?: number
          title?: string
          updated_at?: string
          user_id?: string
          wizard_step?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          completed_steps: Json | null
          created_at: string
          current_step: number
          has_completed_tour: boolean
          id: string
          started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string
          current_step?: number
          has_completed_tour?: boolean
          id?: string
          started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string
          current_step?: number
          has_completed_tour?: boolean
          id?: string
          started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_variant_links: {
        Row: {
          created_at: string
          id: string
          product_id: string
          supplier_code: string | null
          variant_color_hex: string | null
          variant_id: string
          variant_name: string | null
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          supplier_code?: string | null
          variant_color_hex?: string | null
          variant_id: string
          variant_name?: string | null
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          supplier_code?: string | null
          variant_color_hex?: string | null
          variant_id?: string
          variant_name?: string | null
          video_id?: string
        }
        Relationships: []
      }
      voice_command_logs: {
        Row: {
          action: string
          created_at: string
          data: Json | null
          duration_ms: number | null
          id: string
          response: string | null
          success: boolean | null
          transcript: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          data?: Json | null
          duration_ms?: number | null
          id?: string
          response?: string | null
          success?: boolean | null
          transcript: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json | null
          duration_ms?: number | null
          id?: string
          response?: string | null
          success?: boolean | null
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      web_vitals: {
        Row: {
          created_at: string
          delta: number | null
          id: string
          metric_name: string
          metric_value: number
          navigation_type: string | null
          page_url: string | null
          rating: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delta?: number | null
          id?: string
          metric_name: string
          metric_value: number
          navigation_type?: string | null
          page_url?: string | null
          rating?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delta?: number | null
          id?: string
          metric_name?: string
          metric_value?: number
          navigation_type?: string | null
          page_url?: string | null
          rating?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workspace_notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_ai_quota: {
        Args: { _function_name: string; _model: string; _user_id: string }
        Returns: Json
      }
      check_ai_quota: { Args: { _user_id: string }; Returns: Json }
      check_ip_access: { Args: { _ip: string }; Returns: string }
      check_rate_limit: {
        Args: {
          _block_duration_seconds?: number
          _endpoint: string
          _identifier: string
          _max_requests?: number
          _window_seconds?: number
        }
        Returns: Json
      }
      cleanup_discount_test_data: { Args: never; Returns: Json }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      create_organization_with_owner: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      get_bundle_suggestions: {
        Args: { _product_id: string }
        Returns: {
          cooccurrence_count: number
          frequency_percent: number
          product_id: string
          product_image_url: string
          product_name: string
        }[]
      }
      get_client_top_products: {
        Args: { _client_id: string; _limit?: number }
        Returns: {
          avg_unit_price: number
          last_quoted_at: string
          occurrences: number
          product_id: string
          product_image_url: string
          product_name: string
          total_quantity: number
          total_revenue: number
        }[]
      }
      get_industry_top_products: {
        Args: { _company_ids: string[]; _days?: number; _limit?: number }
        Returns: {
          avg_unit_price: number
          product_id: string
          product_image_url: string
          product_name: string
          total_quantity: number
          total_revenue: number
          unique_clients: number
          unique_sellers: number
        }[]
      }
      get_quote_token_by_value: {
        Args: { _token: string }
        Returns: {
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          quote_id: string
          responded_at: string | null
          response: string | null
          response_notes: string | null
          seller_id: string
          signature_hash: string | null
          signed_at: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_name: string | null
          signer_user_agent: string | null
          status: string
          token: string
          updated_at: string
          viewed_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "quote_approval_tokens"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_unread_count: { Args: never; Returns: number }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_dnd_active: { Args: never; Returns: boolean }
      is_manager_or_admin: { Args: never; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      search_products_semantic: {
        Args: { _limit?: number; _products: Json; _query: string }
        Returns: {
          matched_field: string
          product_id: string
          score: number
        }[]
      }
      search_records_rerank: {
        Args: { _candidates: Json; _query: string }
        Returns: {
          id: string
          matched_field: string
          score: number
        }[]
      }
      seed_discount_test_users: { Args: never; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_quote_response: {
        Args: { _response: string; _response_notes?: string; _token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "vendedor"
      org_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "manager", "vendedor"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
