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
      acionamento_mock: {
        Row: {
          created_at: string
          data: string
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      ai_faq: {
        Row: {
          active: boolean
          answer: string
          category: string
          created_at: string
          id: string
          question: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          active?: boolean
          answer: string
          category: string
          created_at?: string
          id?: string
          question: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          active?: boolean
          answer?: string
          category?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      daily_vehicle_offers: {
        Row: {
          available_at: string | null
          compatible_products: string[] | null
          created_at: string | null
          current_location: string | null
          date: string
          driver_id: string | null
          id: string
          offer_status: string | null
          suggested_clients: Json | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          available_at?: string | null
          compatible_products?: string[] | null
          created_at?: string | null
          current_location?: string | null
          date: string
          driver_id?: string | null
          id?: string
          offer_status?: string | null
          suggested_clients?: Json | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          available_at?: string | null
          compatible_products?: string[] | null
          created_at?: string | null
          current_location?: string | null
          date?: string
          driver_id?: string | null
          id?: string
          offer_status?: string | null
          suggested_clients?: Json | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_vehicle_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_receipts: {
        Row: {
          created_at: string
          delivery_date: string | null
          delivery_time: string | null
          id: string
          image_url: string
          observations: string | null
          ocr_raw_data: Json | null
          receiver_name: string | null
          receiver_signature: string | null
          shipment_id: string | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          delivery_time?: string | null
          id?: string
          image_url: string
          observations?: string | null
          ocr_raw_data?: Json | null
          receiver_name?: string | null
          receiver_signature?: string | null
          shipment_id?: string | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          delivery_time?: string | null
          id?: string
          image_url?: string
          observations?: string | null
          ocr_raw_data?: Json | null
          receiver_name?: string | null
          receiver_signature?: string | null
          shipment_id?: string | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          created_at: string
          document_number: string | null
          document_type: string
          driver_id: string
          expiry_date: string | null
          id: string
          image_url: string
          issue_date: string | null
          issuing_agency: string | null
          ocr_raw_data: Json | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          document_number?: string | null
          document_type: string
          driver_id: string
          expiry_date?: string | null
          id?: string
          image_url: string
          issue_date?: string | null
          issuing_agency?: string | null
          ocr_raw_data?: Json | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          document_number?: string | null
          document_type?: string
          driver_id?: string
          expiry_date?: string | null
          id?: string
          image_url?: string
          issue_date?: string | null
          issuing_agency?: string | null
          ocr_raw_data?: Json | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      driver_field_config: {
        Row: {
          created_at: string
          display_name: string
          display_order: number | null
          field_name: string
          field_type: string | null
          id: string
          updated_at: string
          visible_in_card: boolean | null
          visible_in_table: boolean | null
        }
        Insert: {
          created_at?: string
          display_name: string
          display_order?: number | null
          field_name: string
          field_type?: string | null
          id?: string
          updated_at?: string
          visible_in_card?: boolean | null
          visible_in_table?: boolean | null
        }
        Update: {
          created_at?: string
          display_name?: string
          display_order?: number | null
          field_name?: string
          field_type?: string | null
          id?: string
          updated_at?: string
          visible_in_card?: boolean | null
          visible_in_table?: boolean | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          availability_status: string | null
          city: string | null
          cpf: string | null
          created_at: string
          current_location: string | null
          email: string | null
          id: string
          last_freight_date: string | null
          last_update: string | null
          metadata: Json | null
          name: string
          phone: string | null
          registered_at: string | null
          state: string | null
          status: string | null
          trailer_plate_1: string | null
          trailer_plate_2: string | null
          trailer_plate_3: string | null
          truck_plate: string | null
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          availability_status?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          current_location?: string | null
          email?: string | null
          id?: string
          last_freight_date?: string | null
          last_update?: string | null
          metadata?: Json | null
          name: string
          phone?: string | null
          registered_at?: string | null
          state?: string | null
          status?: string | null
          trailer_plate_1?: string | null
          trailer_plate_2?: string | null
          trailer_plate_3?: string | null
          truck_plate?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          availability_status?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          current_location?: string | null
          email?: string | null
          id?: string
          last_freight_date?: string | null
          last_update?: string | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          registered_at?: string | null
          state?: string | null
          status?: string | null
          trailer_plate_1?: string | null
          trailer_plate_2?: string | null
          trailer_plate_3?: string | null
          truck_plate?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      embarques: {
        Row: {
          actual_arrival_time: string | null
          cargo_type: string | null
          client_name: string | null
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          delivery_date: string | null
          delivery_window_end: string | null
          delivery_window_start: string | null
          destination: string | null
          driver_id: string | null
          driver_value: number | null
          email_content: string | null
          email_id: string | null
          id: string
          last_location_update: string | null
          manual_review_completed: boolean | null
          needs_manual_review: boolean | null
          origin: string
          pickup_date: string | null
          rejected_drivers_count: number | null
          route_states: string | null
          status: string
          total_value: number | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          actual_arrival_time?: string | null
          cargo_type?: string | null
          client_name?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          delivery_date?: string | null
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          destination?: string | null
          driver_id?: string | null
          driver_value?: number | null
          email_content?: string | null
          email_id?: string | null
          id?: string
          last_location_update?: string | null
          manual_review_completed?: boolean | null
          needs_manual_review?: boolean | null
          origin: string
          pickup_date?: string | null
          rejected_drivers_count?: number | null
          route_states?: string | null
          status?: string
          total_value?: number | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          actual_arrival_time?: string | null
          cargo_type?: string | null
          client_name?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          delivery_date?: string | null
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          destination?: string | null
          driver_id?: string | null
          driver_value?: number | null
          email_content?: string | null
          email_id?: string | null
          id?: string
          last_location_update?: string | null
          manual_review_completed?: boolean | null
          needs_manual_review?: boolean | null
          origin?: string
          pickup_date?: string | null
          rejected_drivers_count?: number | null
          route_states?: string | null
          status?: string
          total_value?: number | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "embarques_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      frota_mock: {
        Row: {
          created_at: string
          data: string
          disponiveis: number
          id: string
          produto: string
          rota: string
        }
        Insert: {
          created_at?: string
          data: string
          disponiveis: number
          id?: string
          produto: string
          rota: string
        }
        Update: {
          created_at?: string
          data?: string
          disponiveis?: number
          id?: string
          produto?: string
          rota?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          message_text: string
          name: string
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          message_text: string
          name: string
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          message_text?: string
          name?: string
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      operational_alerts: {
        Row: {
          action_required: string | null
          alert_type: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          title: string
        }
        Insert: {
          action_required?: string | null
          alert_type: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          action_required?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_activity: {
        Row: {
          activity_type: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          operator_id: string | null
        }
        Insert: {
          activity_type?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          operator_id?: string | null
        }
        Update: {
          activity_type?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          operator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_activity_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_performance: {
        Row: {
          alerts_resolved: number | null
          created_at: string | null
          date: string
          documents_reviewed: number | null
          id: string
          last_heartbeat: string | null
          operator_id: string | null
          session_end: string | null
          session_start: string | null
          shipments_created: number | null
          shipments_updated: number | null
          status_changes: number | null
          total_online_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          alerts_resolved?: number | null
          created_at?: string | null
          date: string
          documents_reviewed?: number | null
          id?: string
          last_heartbeat?: string | null
          operator_id?: string | null
          session_end?: string | null
          session_start?: string | null
          shipments_created?: number | null
          shipments_updated?: number | null
          status_changes?: number | null
          total_online_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          alerts_resolved?: number | null
          created_at?: string | null
          date?: string
          documents_reviewed?: number | null
          id?: string
          last_heartbeat?: string | null
          operator_id?: string | null
          session_end?: string | null
          session_start?: string | null
          shipments_created?: number | null
          shipments_updated?: number | null
          status_changes?: number | null
          total_online_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_performance_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: number | null
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          receipt_type: string | null
          shipment_id: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          receipt_type?: string | null
          shipment_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          receipt_type?: string | null
          shipment_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ranking_rules: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          parameters: Json | null
          rule_type: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          parameters?: Json | null
          rule_type: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          parameters?: Json | null
          rule_type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      rotas_mock: {
        Row: {
          created_at: string
          data: string
          id: string
          produto: string
          quantidade: number
          rota: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          produto: string
          quantidade: number
          rota: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          produto?: string
          quantidade?: number
          rota?: string
        }
        Relationships: []
      }
      route_analytics: {
        Row: {
          avg_lead_time: unknown
          avg_value: number | null
          created_at: string | null
          destination: string
          fleet_reuse_percentage: number | null
          id: string
          last_calculated_at: string | null
          origin: string
          product_type: string | null
          profitability_score: number | null
          successful_trips: number | null
          total_revenue: number | null
        }
        Insert: {
          avg_lead_time?: unknown
          avg_value?: number | null
          created_at?: string | null
          destination: string
          fleet_reuse_percentage?: number | null
          id?: string
          last_calculated_at?: string | null
          origin: string
          product_type?: string | null
          profitability_score?: number | null
          successful_trips?: number | null
          total_revenue?: number | null
        }
        Update: {
          avg_lead_time?: unknown
          avg_value?: number | null
          created_at?: string | null
          destination?: string
          fleet_reuse_percentage?: number | null
          id?: string
          last_calculated_at?: string | null
          origin?: string
          product_type?: string | null
          profitability_score?: number | null
          successful_trips?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      shipment_documents: {
        Row: {
          created_at: string | null
          document_title: string
          document_type: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          shipment_id: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_title: string
          document_type?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          shipment_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_title?: string
          document_type?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          shipment_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_vehicle_matching: {
        Row: {
          compatibility_level: string | null
          compatibility_score: number | null
          created_at: string | null
          driver_id: string | null
          embarque_id: string | null
          factors: Json | null
          id: string
          offered_at: string | null
          response_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          compatibility_level?: string | null
          compatibility_score?: number | null
          created_at?: string | null
          driver_id?: string | null
          embarque_id?: string | null
          factors?: Json | null
          id?: string
          offered_at?: string | null
          response_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          compatibility_level?: string | null
          compatibility_score?: number | null
          created_at?: string | null
          driver_id?: string | null
          embarque_id?: string | null
          factors?: Json | null
          id?: string
          offered_at?: string | null
          response_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_vehicle_matching_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_vehicle_matching_embarque_id_fkey"
            columns: ["embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_availability_forecast: {
        Row: {
          created_at: string | null
          current_embarque_id: string | null
          driver_id: string | null
          estimated_available_at: string | null
          estimated_location: string | null
          forecast_updated_at: string | null
          id: string
          match_score: number | null
          next_suggested_embarque_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_embarque_id?: string | null
          driver_id?: string | null
          estimated_available_at?: string | null
          estimated_location?: string | null
          forecast_updated_at?: string | null
          id?: string
          match_score?: number | null
          next_suggested_embarque_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_embarque_id?: string | null
          driver_id?: string | null
          estimated_available_at?: string | null
          estimated_location?: string | null
          forecast_updated_at?: string | null
          id?: string
          match_score?: number | null
          next_suggested_embarque_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_availability_forecast_current_embarque_id_fkey"
            columns: ["current_embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_availability_forecast_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_availability_forecast_next_suggested_embarque_id_fkey"
            columns: ["next_suggested_embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_journeys: {
        Row: {
          actual_arrival: string | null
          actual_lead_time: unknown
          created_at: string | null
          current_status: string | null
          delay_justification: string | null
          delay_reason: string | null
          departure_time: string | null
          driver_id: string | null
          embarque_id: string | null
          estimated_arrival: string | null
          id: string
          is_on_time: boolean | null
          justification_added_at: string | null
          justification_added_by: string | null
          route_lead_time: unknown
          updated_at: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_lead_time?: unknown
          created_at?: string | null
          current_status?: string | null
          delay_justification?: string | null
          delay_reason?: string | null
          departure_time?: string | null
          driver_id?: string | null
          embarque_id?: string | null
          estimated_arrival?: string | null
          id?: string
          is_on_time?: boolean | null
          justification_added_at?: string | null
          justification_added_by?: string | null
          route_lead_time?: unknown
          updated_at?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_lead_time?: unknown
          created_at?: string | null
          current_status?: string | null
          delay_justification?: string | null
          delay_reason?: string | null
          departure_time?: string | null
          driver_id?: string | null
          embarque_id?: string | null
          estimated_arrival?: string | null
          id?: string
          is_on_time?: boolean | null
          justification_added_at?: string | null
          justification_added_by?: string | null
          route_lead_time?: unknown
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_journeys_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_journeys_embarque_id_fkey"
            columns: ["embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_journeys_justification_added_by_fkey"
            columns: ["justification_added_by"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_responsavel: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "responsavel" | "user"
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
      app_role: ["admin", "responsavel", "user"],
    },
  },
} as const
