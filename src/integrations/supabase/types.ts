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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_blocked_log: {
        Row: {
          block_reason: string
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: string
          state: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          block_reason: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address: string
          state?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          block_reason?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string
          state?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      access_security_settings: {
        Row: {
          block_unknown_locations: boolean
          city_whitelist_enabled: boolean
          id: string
          ip_whitelist_enabled: boolean
          lockout_duration_minutes: number
          max_failed_attempts: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_unknown_locations?: boolean
          city_whitelist_enabled?: boolean
          id?: string
          ip_whitelist_enabled?: boolean
          lockout_duration_minutes?: number
          max_failed_attempts?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_unknown_locations?: boolean
          city_whitelist_enabled?: boolean
          id?: string
          ip_whitelist_enabled?: boolean
          lockout_duration_minutes?: number
          max_failed_attempts?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string
          code: string
          coins_reward: number
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          category?: string
          code: string
          coins_reward?: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          requirement_type: string
          requirement_value?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          code?: string
          coins_reward?: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      art_file_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          product_id: string | null
          product_name: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bitrix_clients: {
        Row: {
          address: string | null
          bitrix_id: string
          created_at: string
          email: string | null
          id: string
          last_purchase_date: string | null
          logo_url: string | null
          name: string
          nicho: string | null
          phone: string | null
          primary_color_hex: string | null
          primary_color_name: string | null
          ramo: string | null
          synced_at: string
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bitrix_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_purchase_date?: string | null
          logo_url?: string | null
          name: string
          nicho?: string | null
          phone?: string | null
          primary_color_hex?: string | null
          primary_color_name?: string | null
          ramo?: string | null
          synced_at?: string
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bitrix_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_purchase_date?: string | null
          logo_url?: string | null
          name?: string
          nicho?: string | null
          phone?: string | null
          primary_color_hex?: string | null
          primary_color_name?: string | null
          ramo?: string | null
          synced_at?: string
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bitrix_deals: {
        Row: {
          bitrix_client_id: string
          bitrix_id: string
          close_date: string | null
          created_at: string
          created_at_bitrix: string | null
          currency: string | null
          id: string
          stage: string | null
          synced_at: string
          title: string
          value: number | null
        }
        Insert: {
          bitrix_client_id: string
          bitrix_id: string
          close_date?: string | null
          created_at?: string
          created_at_bitrix?: string | null
          currency?: string | null
          id?: string
          stage?: string | null
          synced_at?: string
          title: string
          value?: number | null
        }
        Update: {
          bitrix_client_id?: string
          bitrix_id?: string
          close_date?: string | null
          created_at?: string
          created_at_bitrix?: string | null
          currency?: string | null
          id?: string
          stage?: string | null
          synced_at?: string
          title?: string
          value?: number | null
        }
        Relationships: []
      }
      bitrix_sync_logs: {
        Row: {
          clients_synced: number | null
          completed_at: string | null
          deals_synced: number | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          synced_by: string | null
        }
        Insert: {
          clients_synced?: number | null
          completed_at?: string | null
          deals_synced?: number | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          synced_by?: string | null
        }
        Update: {
          clients_synced?: number | null
          completed_at?: string | null
          deals_synced?: number | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          synced_by?: string | null
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
          icon?: string
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
      city_whitelist: {
        Row: {
          city_name: string
          country_code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          state: string | null
          updated_at: string
        }
        Insert: {
          city_name: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          state?: string | null
          updated_at?: string
        }
        Update: {
          city_name?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      color_groups: {
        Row: {
          created_at: string | null
          description: string | null
          hex_code: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hex_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hex_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      color_nuances: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      color_variations: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string
          hex_code: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id: string
          hex_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string
          hex_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "color_variations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "color_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_variations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "v_color_hierarchy"
            referencedColumns: ["group_id"]
          },
        ]
      }
      companies: {
        Row: {
          bairro: string | null
          bitrix_id: string | null
          bitrix_synced_at: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          condicao_pagamento: string | null
          cor_primaria_hex: string | null
          cor_primaria_nome: string | null
          cor_secundaria_hex: string | null
          cor_secundaria_nome: string | null
          created_at: string
          created_by: string | null
          estado: string | null
          faturamento_estimado: number | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_active: boolean
          limite_credito: number | null
          logo_url: string | null
          logradouro: string | null
          nicho: string | null
          nome_fantasia: string | null
          notas: string | null
          numero: string | null
          numero_funcionarios: number | null
          origem: string | null
          pais: string | null
          porte: string | null
          prazo_pagamento_dias: number | null
          ramo: string | null
          razao_social: string
          responsavel_id: string | null
          status: string
          total_gasto: number | null
          total_pedidos: number | null
          ultima_compra_em: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bairro?: string | null
          bitrix_id?: string | null
          bitrix_synced_at?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          condicao_pagamento?: string | null
          cor_primaria_hex?: string | null
          cor_primaria_nome?: string | null
          cor_secundaria_hex?: string | null
          cor_secundaria_nome?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string | null
          faturamento_estimado?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          limite_credito?: number | null
          logo_url?: string | null
          logradouro?: string | null
          nicho?: string | null
          nome_fantasia?: string | null
          notas?: string | null
          numero?: string | null
          numero_funcionarios?: number | null
          origem?: string | null
          pais?: string | null
          porte?: string | null
          prazo_pagamento_dias?: number | null
          ramo?: string | null
          razao_social: string
          responsavel_id?: string | null
          status?: string
          total_gasto?: number | null
          total_pedidos?: number | null
          ultima_compra_em?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bairro?: string | null
          bitrix_id?: string | null
          bitrix_synced_at?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          condicao_pagamento?: string | null
          cor_primaria_hex?: string | null
          cor_primaria_nome?: string | null
          cor_secundaria_hex?: string | null
          cor_secundaria_nome?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string | null
          faturamento_estimado?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          limite_credito?: number | null
          logo_url?: string | null
          logradouro?: string | null
          nicho?: string | null
          nome_fantasia?: string | null
          notas?: string | null
          numero?: string | null
          numero_funcionarios?: number | null
          origem?: string | null
          pais?: string | null
          porte?: string | null
          prazo_pagamento_dias?: number | null
          ramo?: string | null
          razao_social?: string
          responsavel_id?: string | null
          status?: string
          total_gasto?: number | null
          total_pedidos?: number | null
          ultima_compra_em?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_addresses: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          company_id: string
          complemento: string | null
          contato_local: string | null
          created_at: string
          estado: string | null
          id: string
          is_principal: boolean | null
          logradouro: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          pais: string | null
          telefone_local: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id: string
          complemento?: string | null
          contato_local?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          is_principal?: boolean | null
          logradouro?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          telefone_local?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string
          complemento?: string | null
          contato_local?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          is_principal?: boolean | null
          logradouro?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          telefone_local?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          apelido: string | null
          canal_preferido: string | null
          cargo: string | null
          company_id: string
          created_at: string
          data_aniversario: string | null
          departamento: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          is_principal: boolean | null
          linkedin_url: string | null
          melhor_horario: string | null
          nome: string
          notas: string | null
          poder_decisao: string | null
          preferencias: Json | null
          sobrenome: string | null
          updated_at: string
        }
        Insert: {
          apelido?: string | null
          canal_preferido?: string | null
          cargo?: string | null
          company_id: string
          created_at?: string
          data_aniversario?: string | null
          departamento?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          is_principal?: boolean | null
          linkedin_url?: string | null
          melhor_horario?: string | null
          nome: string
          notas?: string | null
          poder_decisao?: string | null
          preferencias?: Json | null
          sobrenome?: string | null
          updated_at?: string
        }
        Update: {
          apelido?: string | null
          canal_preferido?: string | null
          cargo?: string | null
          company_id?: string
          created_at?: string
          data_aniversario?: string | null
          departamento?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          is_principal?: boolean | null
          linkedin_url?: string | null
          melhor_horario?: string | null
          nome?: string
          notas?: string | null
          poder_decisao?: string | null
          preferencias?: Json | null
          sobrenome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_emails: {
        Row: {
          contact_id: string
          created_at: string
          email: string
          id: string
          is_principal: boolean | null
          tipo: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          email: string
          id?: string
          is_principal?: boolean | null
          tipo?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          email?: string
          id?: string
          is_principal?: boolean | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_phones: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_principal: boolean | null
          is_whatsapp: boolean | null
          numero: string
          tipo: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_principal?: boolean | null
          is_whatsapp?: boolean | null
          numero: string
          tipo?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_principal?: boolean | null
          is_whatsapp?: boolean | null
          numero?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_phones_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      device_login_notifications: {
        Row: {
          created_at: string
          device_id: string | null
          email_sent: boolean | null
          id: string
          ip_address: string
          location: string | null
          notification_sent_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          email_sent?: boolean | null
          id?: string
          ip_address: string
          location?: string | null
          notification_sent_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          email_sent?: boolean | null
          id?: string
          ip_address?: string
          location?: string | null
          notification_sent_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_login_notifications_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_known_devices"
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
        Relationships: [
          {
            foreignKeyName: "expert_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bitrix_clients"
            referencedColumns: ["id"]
          },
        ]
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
          role: string
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
          client_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          priority: string
          quote_id: string | null
          reminder_date: string
          reminder_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string
          quote_id?: string | null
          reminder_date: string
          reminder_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string
          quote_id?: string | null
          reminder_date?: string
          reminder_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bitrix_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_reminders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      future_stock_entries: {
        Row: {
          color_hex: string | null
          color_name: string | null
          created_at: string
          created_by: string | null
          expected_date: string
          expected_quantity: number
          id: string
          notes: string | null
          order_date: string | null
          product_id: string
          product_name: string
          product_sku: string
          source: string
          source_reference: string | null
          status: string
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string
          updated_by: string | null
          variant_id: string | null
          variant_sku: string | null
        }
        Insert: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          created_by?: string | null
          expected_date: string
          expected_quantity: number
          id?: string
          notes?: string | null
          order_date?: string | null
          product_id: string
          product_name: string
          product_sku: string
          source?: string
          source_reference?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_id?: string | null
          variant_sku?: string | null
        }
        Update: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string
          expected_quantity?: number
          id?: string
          notes?: string | null
          order_date?: string | null
          product_id?: string
          product_name?: string
          product_sku?: string
          source?: string
          source_reference?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_id?: string | null
          variant_sku?: string | null
        }
        Relationships: []
      }
      generated_mockups: {
        Row: {
          annotations: Json | null
          client_id: string | null
          created_at: string
          id: string
          logo_height_cm: number | null
          logo_url: string
          logo_width_cm: number | null
          mockup_url: string
          position_x: number | null
          position_y: number | null
          product_id: string | null
          product_name: string
          product_sku: string | null
          seller_id: string
          technique_id: string | null
          technique_name: string
        }
        Insert: {
          annotations?: Json | null
          client_id?: string | null
          created_at?: string
          id?: string
          logo_height_cm?: number | null
          logo_url: string
          logo_width_cm?: number | null
          mockup_url: string
          position_x?: number | null
          position_y?: number | null
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          seller_id: string
          technique_id?: string | null
          technique_name: string
        }
        Update: {
          annotations?: Json | null
          client_id?: string | null
          created_at?: string
          id?: string
          logo_height_cm?: number | null
          logo_url?: string
          logo_width_cm?: number | null
          mockup_url?: string
          position_x?: number | null
          position_y?: number | null
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          seller_id?: string
          technique_id?: string | null
          technique_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_mockups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bitrix_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_mockups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_mockups_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "personalization_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_allowed_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ip_address: string
          is_active: boolean
          label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Relationships: []
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
          ip_address: string
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
          client_id: string | null
          client_name: string | null
          created_at: string
          custom_prompt: string | null
          generated_image_url: string
          id: string
          is_favorite: boolean
          location_name: string | null
          logo_url: string | null
          product_color: string | null
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          scene_category: string | null
          scene_prompt: string
          scene_title: string | null
          technique_name: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          custom_prompt?: string | null
          generated_image_url: string
          id?: string
          is_favorite?: boolean
          location_name?: string | null
          logo_url?: string | null
          product_color?: string | null
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          scene_category?: string | null
          scene_prompt: string
          scene_title?: string | null
          technique_name?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          custom_prompt?: string | null
          generated_image_url?: string
          id?: string
          is_favorite?: boolean
          location_name?: string | null
          logo_url?: string | null
          product_color?: string | null
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          scene_category?: string | null
          scene_prompt?: string
          scene_title?: string | null
          technique_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_up_generations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bitrix_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mockup_drafts: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          draft_key: string
          id: string
          logo_data: string | null
          personalization_areas: Json
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
          personalization_areas?: Json
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
          personalization_areas?: Json
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mockup_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bitrix_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mockup_drafts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mockup_drafts_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "personalization_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      mockup_templates: {
        Row: {
          areas: Json
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          areas?: Json
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          areas?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
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
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
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
      order_history: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          order_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          order_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          personalization_details: Json | null
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          sort_order: number | null
          subtotal: number | null
          unit_price: number
        }
        Insert: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          personalization_details?: Json | null
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          sort_order?: number | null
          subtotal?: number | null
          unit_price?: number
        }
        Update: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          personalization_details?: Json | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          sort_order?: number | null
          subtotal?: number | null
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
        ]
      }
      orders: {
        Row: {
          actual_delivery_date: string | null
          client_id: string | null
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          estimated_delivery_date: string | null
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          id: string
          internal_notes: string | null
          notes: string | null
          order_number: string
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          quote_id: string | null
          seller_id: string
          shipped_at: string | null
          shipping_address: string | null
          shipping_cost: number | null
          shipping_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          total: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          estimated_delivery_date?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number: string
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          quote_id?: string | null
          seller_id: string
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          total?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          estimated_delivery_date?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          quote_id?: string | null
          seller_id?: string
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          total?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bitrix_clients"
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
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          user_id?: string | null
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
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      personalization_locations: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          location_name: string
          product_type: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_name: string
          product_type: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_name?: string
          product_type?: string
        }
        Relationships: []
      }
      personalization_simulations: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string | null
          product_name: string
          product_sku: string | null
          product_unit_price: number
          quantity: number
          seller_id: string
          simulation_data: Json
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          product_unit_price?: number
          quantity?: number
          seller_id: string
          simulation_data?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          product_unit_price?: number
          quantity?: number
          seller_id?: string
          simulation_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalization_simulations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bitrix_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalization_simulations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      personalization_sizes: {
        Row: {
          area_cm2: number | null
          created_at: string
          height_cm: number | null
          id: string
          is_active: boolean | null
          price_modifier: number | null
          size_label: string
          technique_code: string | null
          technique_id: string | null
          width_cm: number | null
        }
        Insert: {
          area_cm2?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          price_modifier?: number | null
          size_label: string
          technique_code?: string | null
          technique_id?: string | null
          width_cm?: number | null
        }
        Update: {
          area_cm2?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          price_modifier?: number | null
          size_label?: string
          technique_code?: string | null
          technique_id?: string | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personalization_sizes_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "personalization_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      personalization_techniques: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          estimated_days: number | null
          id: string
          is_active: boolean | null
          min_quantity: number | null
          name: string
          setup_cost: number | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name: string
          setup_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name?: string
          setup_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_component_location_techniques: {
        Row: {
          component_location_id: string
          composed_code: string
          composed_location_image_url: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_colors: number | null
          technique_id: string
        }
        Insert: {
          component_location_id: string
          composed_code: string
          composed_location_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_colors?: number | null
          technique_id: string
        }
        Update: {
          component_location_id?: string
          composed_code?: string
          composed_location_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_colors?: number | null
          technique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_component_location_technique_component_location_id_fkey"
            columns: ["component_location_id"]
            isOneToOne: false
            referencedRelation: "product_component_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_component_location_techniques_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "personalization_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      product_component_locations: {
        Row: {
          area_image_url: string | null
          component_id: string
          created_at: string
          id: string
          is_active: boolean | null
          location_code: string
          location_name: string
          max_area_cm2: number | null
          max_height_cm: number | null
          max_width_cm: number | null
          printing_lines_image_url: string | null
        }
        Insert: {
          area_image_url?: string | null
          component_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_code: string
          location_name: string
          max_area_cm2?: number | null
          max_height_cm?: number | null
          max_width_cm?: number | null
          printing_lines_image_url?: string | null
        }
        Update: {
          area_image_url?: string | null
          component_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_code?: string
          location_name?: string
          max_area_cm2?: number | null
          max_height_cm?: number | null
          max_width_cm?: number | null
          printing_lines_image_url?: string | null
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
          image_url: string | null
          is_active: boolean | null
          is_personalizable: boolean | null
          product_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          component_code: string
          component_name: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_personalizable?: boolean | null
          product_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          component_code?: string
          component_name?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_personalizable?: boolean | null
          product_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_group_components: {
        Row: {
          component_code: string
          component_name: string
          created_at: string
          id: string
          is_active: boolean | null
          is_personalizable: boolean | null
          product_group_id: string
          sort_order: number | null
        }
        Insert: {
          component_code: string
          component_name: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_personalizable?: boolean | null
          product_group_id: string
          sort_order?: number | null
        }
        Update: {
          component_code?: string
          component_name?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_personalizable?: boolean | null
          product_group_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_group_components_product_group_id_fkey"
            columns: ["product_group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_group_location_techniques: {
        Row: {
          created_at: string
          group_location_id: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_colors: number | null
          technique_id: string
        }
        Insert: {
          created_at?: string
          group_location_id: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_colors?: number | null
          technique_id: string
        }
        Update: {
          created_at?: string
          group_location_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_colors?: number | null
          technique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_group_location_techniques_group_location_id_fkey"
            columns: ["group_location_id"]
            isOneToOne: false
            referencedRelation: "product_group_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_group_location_techniques_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "personalization_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      product_group_locations: {
        Row: {
          area_image_url: string | null
          created_at: string
          group_component_id: string
          id: string
          is_active: boolean | null
          location_code: string
          location_name: string
          max_area_cm2: number | null
          max_height_cm: number | null
          max_width_cm: number | null
        }
        Insert: {
          area_image_url?: string | null
          created_at?: string
          group_component_id: string
          id?: string
          is_active?: boolean | null
          location_code: string
          location_name: string
          max_area_cm2?: number | null
          max_height_cm?: number | null
          max_width_cm?: number | null
        }
        Update: {
          area_image_url?: string | null
          created_at?: string
          group_component_id?: string
          id?: string
          is_active?: boolean | null
          location_code?: string
          location_name?: string
          max_area_cm2?: number | null
          max_height_cm?: number | null
          max_width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_group_locations_group_component_id_fkey"
            columns: ["group_component_id"]
            isOneToOne: false
            referencedRelation: "product_group_components"
            referencedColumns: ["id"]
          },
        ]
      }
      product_group_members: {
        Row: {
          created_at: string
          id: string
          product_group_id: string
          product_id: string
          use_group_rules: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_group_id: string
          product_id: string
          use_group_rules?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          product_group_id?: string
          product_id?: string
          use_group_rules?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_group_members_product_group_id_fkey"
            columns: ["product_group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_group_members_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_code: string
          group_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_code?: string
          group_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      product_novelties: {
        Row: {
          created_at: string
          detected_at: string
          expires_at: string
          id: string
          is_active: boolean
          is_highlighted: boolean
          product_id: string
          supplier_code: string | null
          supplier_id: string | null
          supplier_product_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          detected_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          product_id: string
          supplier_code?: string | null
          supplier_id?: string | null
          supplier_product_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          detected_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          product_id?: string
          supplier_code?: string | null
          supplier_id?: string | null
          supplier_product_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_novelties_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          products_created: number | null
          products_failed: number | null
          products_received: number | null
          products_updated: number | null
          source: string | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          products_created?: number | null
          products_failed?: number | null
          products_received?: number | null
          products_updated?: number | null
          source?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          products_created?: number | null
          products_failed?: number | null
          products_received?: number | null
          products_updated?: number | null
          source?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          seller_id: string
          view_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          seller_id: string
          view_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          seller_id?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          category_name: string | null
          colors: Json | null
          created_at: string
          description: string | null
          external_id: string | null
          featured: boolean | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_kit: boolean | null
          kit_items: Json | null
          materials: string[] | null
          metadata: Json | null
          min_quantity: number | null
          name: string
          new_arrival: boolean | null
          on_sale: boolean | null
          price: number
          search_vector: unknown
          sku: string
          stock: number | null
          stock_status: string | null
          subcategory: string | null
          supplier_id: string | null
          supplier_name: string | null
          synced_at: string
          tags: Json | null
          updated_at: string
          variations: Json | null
          video_url: string | null
        }
        Insert: {
          category_id?: number | null
          category_name?: string | null
          colors?: Json | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          featured?: boolean | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_kit?: boolean | null
          kit_items?: Json | null
          materials?: string[] | null
          metadata?: Json | null
          min_quantity?: number | null
          name: string
          new_arrival?: boolean | null
          on_sale?: boolean | null
          price?: number
          search_vector?: unknown
          sku: string
          stock?: number | null
          stock_status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          synced_at?: string
          tags?: Json | null
          updated_at?: string
          variations?: Json | null
          video_url?: string | null
        }
        Update: {
          category_id?: number | null
          category_name?: string | null
          colors?: Json | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          featured?: boolean | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_kit?: boolean | null
          kit_items?: Json | null
          materials?: string[] | null
          metadata?: Json | null
          min_quantity?: number | null
          name?: string
          new_arrival?: boolean | null
          on_sale?: boolean | null
          price?: number
          search_vector?: unknown
          sku?: string
          stock?: number | null
          stock_status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          synced_at?: string
          tags?: Json | null
          updated_at?: string
          variations?: Json | null
          video_url?: string | null
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
          role_id: string | null
          signature_url: string | null
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
          role_id?: string | null
          signature_url?: string | null
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
          role_id?: string | null
          signature_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_products: {
        Row: {
          created_at: string
          external_product_id: string
          id: string
          original_price: number | null
          product_name: string
          product_sku: string | null
          promotion_id: string
        }
        Insert: {
          created_at?: string
          external_product_id: string
          id?: string
          original_price?: number | null
          product_name: string
          product_sku?: string | null
          promotion_id: string
        }
        Update: {
          created_at?: string
          external_product_id?: string
          id?: string
          original_price?: number | null
          product_name?: string
          product_sku?: string | null
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "v_active_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_approval_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          quote_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          quote_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          quote_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_approval_tokens_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_history: {
        Row: {
          action: string
          created_at: string
          description: string
          field_changed: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          quote_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          quote_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          quote_id?: string
          user_id?: string
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
          id: string
          notes: string | null
          positions_count: number | null
          quote_item_id: string
          setup_cost: number | null
          technique_id: string | null
          technique_name: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          area_cm2?: number | null
          colors_count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          positions_count?: number | null
          quote_item_id: string
          setup_cost?: number | null
          technique_id?: string | null
          technique_name?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          area_cm2?: number | null
          colors_count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          positions_count?: number | null
          quote_item_id?: string
          setup_cost?: number | null
          technique_id?: string | null
          technique_name?: string | null
          total_cost?: number | null
          unit_cost?: number | null
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
          id: string
          notes: string | null
          personalization_colors: number | null
          personalization_notes: string | null
          personalization_price: number | null
          personalization_type: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          quote_id: string
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
          id?: string
          notes?: string | null
          personalization_colors?: number | null
          personalization_notes?: string | null
          personalization_price?: number | null
          personalization_type?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          quote_id: string
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
          id?: string
          notes?: string | null
          personalization_colors?: number | null
          personalization_notes?: string | null
          personalization_price?: number | null
          personalization_type?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          quote_id?: string
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
      quote_number_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
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
          items_data: Json
          name: string
          notes: string | null
          payment_terms: string | null
          seller_id: string
          template_data: Json
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
          items_data?: Json
          name: string
          notes?: string | null
          payment_terms?: string | null
          seller_id: string
          template_data?: Json
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
          items_data?: Json
          name?: string
          notes?: string | null
          payment_terms?: string | null
          seller_id?: string
          template_data?: Json
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          bitrix_deal_id: string | null
          bitrix_quote_id: string | null
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
          discount_amount: number | null
          discount_percent: number | null
          id: string
          internal_notes: string | null
          notes: string | null
          payment_terms: string | null
          quote_number: string
          seller_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number | null
          synced_at: string | null
          synced_to_bitrix: boolean | null
          total: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          bitrix_deal_id?: string | null
          bitrix_quote_id?: string | null
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
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          payment_terms?: string | null
          quote_number: string
          seller_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number | null
          synced_at?: string | null
          synced_to_bitrix?: boolean | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          bitrix_deal_id?: string | null
          bitrix_quote_id?: string | null
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
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          payment_terms?: string | null
          quote_number?: string
          seller_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number | null
          synced_at?: string | null
          synced_to_bitrix?: boolean | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sales_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          current_conversions: number | null
          current_quotes: number | null
          current_value: number
          end_date: string
          goal_type: string
          id: string
          is_achieved: boolean | null
          start_date: string
          target_conversions: number | null
          target_quotes: number | null
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          current_conversions?: number | null
          current_quotes?: number | null
          current_value?: number
          end_date: string
          goal_type?: string
          id?: string
          is_achieved?: boolean | null
          start_date: string
          target_conversions?: number | null
          target_quotes?: number | null
          target_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          current_conversions?: number | null
          current_quotes?: number | null
          current_value?: number
          end_date?: string
          goal_type?: string
          id?: string
          is_achieved?: boolean | null
          start_date?: string
          target_conversions?: number | null
          target_quotes?: number | null
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          created_at: string
          filters_used: Json | null
          id: string
          results_count: number | null
          search_term: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          filters_used?: Json | null
          id?: string
          results_count?: number | null
          search_term: string
          seller_id: string
        }
        Update: {
          created_at?: string
          filters_used?: Json | null
          id?: string
          results_count?: number | null
          search_term?: string
          seller_id?: string
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      seller_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
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
          seller_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          company_location?: string | null
          company_logo_url?: string | null
          company_name: string
          created_at?: string
          id?: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_location?: string | null
          company_logo_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_gamification: {
        Row: {
          coins: number
          created_at: string
          id: string
          last_activity_date: string | null
          level: number
          streak: number
          total_activities: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number
          streak?: number
          total_activities?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number
          streak?: number
          total_activities?: number
          updated_at?: string
          user_id?: string
          xp?: number
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
          product_data: Json
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
      store_rewards: {
        Row: {
          category: string
          code: string
          coin_cost: number
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          reward_data: Json | null
          reward_type: string
          sort_order: number | null
          stock: number | null
        }
        Insert: {
          category?: string
          code: string
          coin_cost?: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          reward_data?: Json | null
          reward_type?: string
          sort_order?: number | null
          stock?: number | null
        }
        Update: {
          category?: string
          code?: string
          coin_cost?: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          reward_data?: Json | null
          reward_type?: string
          sort_order?: number | null
          stock?: number | null
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          enabled_at: string | null
          id: string
          is_enabled: boolean
          totp_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_allowed_ips: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ip_address: string
          is_active: boolean
          label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_known_devices: {
        Row: {
          browser_name: string | null
          created_at: string
          device_fingerprint: string
          device_type: string | null
          first_seen_at: string
          id: string
          ip_address: string
          is_trusted: boolean | null
          last_seen_at: string
          location: string | null
          os_name: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser_name?: string | null
          created_at?: string
          device_fingerprint: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_address: string
          is_trusted?: boolean | null
          last_seen_at?: string
          location?: string | null
          os_name?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser_name?: string | null
          created_at?: string
          device_fingerprint?: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: string
          is_trusted?: boolean | null
          last_seen_at?: string
          location?: string | null
          os_name?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          completed_steps: string[] | null
          created_at: string
          current_step: number | null
          has_completed_tour: boolean | null
          id: string
          started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: string[] | null
          created_at?: string
          current_step?: number | null
          has_completed_tour?: boolean | null
          id?: string
          started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: string[] | null
          created_at?: string
          current_step?: number | null
          has_completed_tour?: boolean | null
          id?: string
          started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          id: string
          is_active: boolean | null
          purchased_at: string
          reward_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          purchased_at?: string
          reward_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          purchased_at?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "store_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_active_promotions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          end_date: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_date?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          start_date?: string | null
          status?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_date?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          start_date?: string | null
          status?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      v_color_hierarchy: {
        Row: {
          group_hex: string | null
          group_id: string | null
          group_name: string | null
          group_slug: string | null
          group_sort: number | null
          variation_hex: string | null
          variation_id: string | null
          variation_name: string | null
          variation_slug: string | null
          variation_sort: number | null
        }
        Relationships: []
      }
      v_product_novelties: {
        Row: {
          base_price: number | null
          category_id: number | null
          category_name: string | null
          days_remaining: number | null
          detected_at: string | null
          expires_at: string | null
          is_active: boolean | null
          is_highlighted: boolean | null
          novelty_id: string | null
          product_description: string | null
          product_id: string | null
          product_image: string | null
          product_name: string | null
          product_sku: string | null
          status: string | null
          supplier_code: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_product_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_novelties_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_product_novelty: {
        Args: {
          p_days_valid?: number
          p_product_id: string
          p_supplier_code?: string
          p_supplier_product_code?: string
        }
        Returns: string
      }
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      cleanup_expired_novelties: { Args: never; Returns: number }
      get_active_novelties: {
        Args: { p_limit?: number; p_offset?: number; p_supplier_code?: string }
        Returns: {
          days_remaining: number
          detected_at: string
          expires_at: string
          novelty_id: string
          product_id: string
          product_name: string
          product_sku: string
          supplier_code: string
          supplier_product_code: string
        }[]
      }
      get_color_filters: { Args: never; Returns: Json }
      get_novelties_stats: {
        Args: never
        Returns: {
          active_novelties: number
          by_supplier: Json
          expiring_soon: number
          total_novelties: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_products_semantic: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          category_name: string
          colors: Json
          description: string
          id: string
          materials: string[]
          name: string
          price: number
          relevance: number
          sku: string
          subcategory: string
          tags: Json
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "vendedor" | "manager"
      fulfillment_status:
        | "not_started"
        | "picking"
        | "packing"
        | "shipped"
        | "delivered"
      order_status:
        | "pending"
        | "confirmed"
        | "in_production"
        | "ready_for_pickup"
        | "shipped"
        | "delivered"
        | "cancelled"
      quote_status:
        | "draft"
        | "pending"
        | "sent"
        | "approved"
        | "rejected"
        | "expired"
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
      app_role: ["admin", "vendedor", "manager"],
      fulfillment_status: [
        "not_started",
        "picking",
        "packing",
        "shipped",
        "delivered",
      ],
      order_status: [
        "pending",
        "confirmed",
        "in_production",
        "ready_for_pickup",
        "shipped",
        "delivered",
        "cancelled",
      ],
      quote_status: [
        "draft",
        "pending",
        "sent",
        "approved",
        "rejected",
        "expired",
      ],
    },
  },
} as const
