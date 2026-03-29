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
      admin_alerts: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          read_by: string | null
          severity: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          read_by?: string | null
          severity?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          read_by?: string | null
          severity?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_config: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_sensitive: boolean
          key: string
          requires_approval: boolean
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          key: string
          requires_approval?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          key?: string
          requires_approval?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          converted: boolean
          created_at: string
          id: string
          ip_hash: string | null
          referred_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          converted?: boolean
          created_at?: string
          id?: string
          ip_hash?: string | null
          referred_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          converted?: boolean
          created_at?: string
          id?: string
          ip_hash?: string | null
          referred_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          status: string
          subscription_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount?: number
          created_at?: string
          id?: string
          status?: string
          subscription_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          applicant_email: string | null
          applicant_name: string | null
          channel_url: string | null
          commission_rate: number
          created_at: string
          id: string
          platform: string | null
          status: string
          subscriber_count: string | null
          trading_niche: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_code: string
          applicant_email?: string | null
          applicant_name?: string | null
          channel_url?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          platform?: string | null
          status?: string
          subscriber_count?: string | null
          trading_niche?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_code?: string
          applicant_email?: string | null
          applicant_name?: string | null
          channel_url?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          platform?: string | null
          status?: string
          subscriber_count?: string | null
          trading_niche?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          linked_pattern_id: string | null
          metadata: Json | null
          priority: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          linked_pattern_id?: string | null
          metadata?: Json | null
          priority?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          linked_pattern_id?: string | null
          metadata?: Json | null
          priority?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_linked_pattern_id_fkey"
            columns: ["linked_pattern_id"]
            isOneToOne: false
            referencedRelation: "ai_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_patterns: {
        Row: {
          avg_r: number | null
          confidence: number | null
          created_at: string
          description: string | null
          expectancy: number | null
          filters: Json
          id: string
          is_playbook: boolean | null
          last_computed_at: string | null
          pattern_name: string
          pattern_type: string
          recommendation: string | null
          sample_size: number | null
          updated_at: string
          user_id: string
          win_rate: number | null
        }
        Insert: {
          avg_r?: number | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          expectancy?: number | null
          filters?: Json
          id?: string
          is_playbook?: boolean | null
          last_computed_at?: string | null
          pattern_name: string
          pattern_type?: string
          recommendation?: string | null
          sample_size?: number | null
          updated_at?: string
          user_id: string
          win_rate?: number | null
        }
        Update: {
          avg_r?: number | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          expectancy?: number | null
          filters?: Json
          id?: string
          is_playbook?: boolean | null
          last_computed_at?: string | null
          pattern_name?: string
          pattern_type?: string
          recommendation?: string | null
          sample_size?: number | null
          updated_at?: string
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string | null
          feature: string
          id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature: string
          id?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature?: string
          id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      backtest_configs: {
        Row: {
          broker_profile_id: string
          commission_mode: string
          created_at: string
          data_profile_id: string
          id: string
          slippage_mode: string
          spread_mode: string
          symbol: string
          test_end: string
          test_start: string
          timeframe: string
          train_end: string
          train_start: string
          user_id: string
        }
        Insert: {
          broker_profile_id: string
          commission_mode?: string
          created_at?: string
          data_profile_id: string
          id?: string
          slippage_mode?: string
          spread_mode?: string
          symbol: string
          test_end: string
          test_start: string
          timeframe: string
          train_end: string
          train_start: string
          user_id: string
        }
        Update: {
          broker_profile_id?: string
          commission_mode?: string
          created_at?: string
          data_profile_id?: string
          id?: string
          slippage_mode?: string
          spread_mode?: string
          symbol?: string
          test_end?: string
          test_start?: string
          timeframe?: string
          train_end?: string
          train_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backtest_configs_broker_profile_id_fkey"
            columns: ["broker_profile_id"]
            isOneToOne: false
            referencedRelation: "broker_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backtest_configs_data_profile_id_fkey"
            columns: ["data_profile_id"]
            isOneToOne: false
            referencedRelation: "data_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backtest_jobs: {
        Row: {
          attempts: number
          backtest_config_id: string
          created_at: string
          cycle_id: string
          error: string | null
          finished_at: string | null
          id: string
          priority: number
          scheduled_for: string
          started_at: string | null
          status: string
          strategy_version_id: string
          user_id: string
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          backtest_config_id: string
          created_at?: string
          cycle_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          priority?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          strategy_version_id: string
          user_id: string
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          backtest_config_id?: string
          created_at?: string
          cycle_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          priority?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          strategy_version_id?: string
          user_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backtest_jobs_backtest_config_id_fkey"
            columns: ["backtest_config_id"]
            isOneToOne: false
            referencedRelation: "backtest_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backtest_jobs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "rotation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backtest_jobs_strategy_version_id_fkey"
            columns: ["strategy_version_id"]
            isOneToOne: false
            referencedRelation: "strategy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      backtest_trades: {
        Row: {
          created_at: string
          direction: string
          entry_price: number
          entry_time: string
          exit_price: number
          exit_time: string
          fees: number
          id: string
          mae: number | null
          mfe: number | null
          pnl: number
          pnl_pct: number
          quantity: number
          run_id: string
          slippage: number
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          entry_price: number
          entry_time: string
          exit_price: number
          exit_time: string
          fees?: number
          id?: string
          mae?: number | null
          mfe?: number | null
          pnl?: number
          pnl_pct?: number
          quantity?: number
          run_id: string
          slippage?: number
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          entry_price?: number
          entry_time?: string
          exit_price?: number
          exit_time?: string
          fees?: number
          id?: string
          mae?: number | null
          mfe?: number | null
          pnl?: number
          pnl_pct?: number
          quantity?: number
          run_id?: string
          slippage?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      broker_connections: {
        Row: {
          account_id: string | null
          broker_type: string
          created_at: string
          display_name: string | null
          id: string
          last_sync_at: string | null
          metadata: Json | null
          status: string
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          broker_type: string
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          status?: string
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          broker_type?: string
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          status?: string
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      broker_credential_vault: {
        Row: {
          broker_connection_id: string
          created_at: string | null
          encrypted_credentials: string
          encryption_version: number
          id: string
          is_revoked: boolean | null
          key_salt: string
          revoked_at: string | null
          rotated_at: string | null
          rotation_count: number | null
          updated_at: string | null
        }
        Insert: {
          broker_connection_id: string
          created_at?: string | null
          encrypted_credentials: string
          encryption_version?: number
          id?: string
          is_revoked?: boolean | null
          key_salt?: string
          revoked_at?: string | null
          rotated_at?: string | null
          rotation_count?: number | null
          updated_at?: string | null
        }
        Update: {
          broker_connection_id?: string
          created_at?: string | null
          encrypted_credentials?: string
          encryption_version?: number
          id?: string
          is_revoked?: boolean | null
          key_salt?: string
          revoked_at?: string | null
          rotated_at?: string | null
          rotation_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      broker_profiles: {
        Row: {
          avg_spread: number
          broker_name: string
          commission_per_lot: number
          created_at: string
          id: string
          slippage_normal: number
          slippage_worst: number
          spread_p95: number
          symbol: string
          user_id: string
        }
        Insert: {
          avg_spread?: number
          broker_name: string
          commission_per_lot?: number
          created_at?: string
          id?: string
          slippage_normal?: number
          slippage_worst?: number
          spread_p95?: number
          symbol: string
          user_id: string
        }
        Update: {
          avg_spread?: number
          broker_name?: string
          commission_per_lot?: number
          created_at?: string
          id?: string
          slippage_normal?: number
          slippage_worst?: number
          spread_p95?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      broker_requests: {
        Row: {
          asset_classes: string[] | null
          broker_name: string
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          asset_classes?: string[] | null
          broker_name: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          asset_classes?: string[] | null
          broker_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      chosen_strategy_instances: {
        Row: {
          base_strategy_id: string
          created_at: string | null
          id: string
          live_unlocked_at: string | null
          mode: string
          name: string
          overrides: Json | null
          paper_started_at: string | null
          paper_trades_count: number | null
          paper_trading_days: number | null
          risk_ruleset: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_strategy_id: string
          created_at?: string | null
          id?: string
          live_unlocked_at?: string | null
          mode?: string
          name: string
          overrides?: Json | null
          paper_started_at?: string | null
          paper_trades_count?: number | null
          paper_trading_days?: number | null
          risk_ruleset?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_strategy_id?: string
          created_at?: string | null
          id?: string
          live_unlocked_at?: string | null
          mode?: string
          name?: string
          overrides?: Json | null
          paper_started_at?: string | null
          paper_trades_count?: number | null
          paper_trading_days?: number | null
          risk_ruleset?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chosen_strategy_instances_base_strategy_id_fkey"
            columns: ["base_strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      command_center_snapshots: {
        Row: {
          active_strategies: number | null
          allocation_summary: Json | null
          created_at: string
          daily_pnl: number | null
          id: string
          portfolio_value: number | null
          risk_status: string | null
          snapshot_type: string
          top_alerts: Json | null
          top_regimes: Json | null
          top_strategies: Json | null
        }
        Insert: {
          active_strategies?: number | null
          allocation_summary?: Json | null
          created_at?: string
          daily_pnl?: number | null
          id?: string
          portfolio_value?: number | null
          risk_status?: string | null
          snapshot_type?: string
          top_alerts?: Json | null
          top_regimes?: Json | null
          top_strategies?: Json | null
        }
        Update: {
          active_strategies?: number | null
          allocation_summary?: Json | null
          created_at?: string
          daily_pnl?: number | null
          id?: string
          portfolio_value?: number | null
          risk_status?: string | null
          snapshot_type?: string
          top_alerts?: Json | null
          top_regimes?: Json | null
          top_strategies?: Json | null
        }
        Relationships: []
      }
      data_profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      datasets: {
        Row: {
          columns: Json | null
          created_at: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          fingerprint: string | null
          id: string
          last_used_at: string | null
          name: string
          project_id: string | null
          range_from_ts: number | null
          range_to_ts: number | null
          row_count: number | null
          source_name: string | null
          symbol: string | null
          timeframe: string | null
          timezone: string | null
          usage_count: number
          user_id: string
          visibility: string
        }
        Insert: {
          columns?: Json | null
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          fingerprint?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          project_id?: string | null
          range_from_ts?: number | null
          range_to_ts?: number | null
          row_count?: number | null
          source_name?: string | null
          symbol?: string | null
          timeframe?: string | null
          timezone?: string | null
          usage_count?: number
          user_id: string
          visibility?: string
        }
        Update: {
          columns?: Json | null
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          fingerprint?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          project_id?: string | null
          range_from_ts?: number | null
          range_to_ts?: number | null
          row_count?: number | null
          source_name?: string | null
          symbol?: string | null
          timeframe?: string | null
          timezone?: string | null
          usage_count?: number
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ea_library: {
        Row: {
          allowed_symbols: string[] | null
          allowed_timeframes: string[] | null
          created_at: string
          file_name: string
          file_sha256: string | null
          id: string
          name: string
          risk_tier: string
          status: string
          storage_path: string
          strategy_tags: string[] | null
          user_id: string
          version: string
        }
        Insert: {
          allowed_symbols?: string[] | null
          allowed_timeframes?: string[] | null
          created_at?: string
          file_name: string
          file_sha256?: string | null
          id?: string
          name: string
          risk_tier?: string
          status?: string
          storage_path: string
          strategy_tags?: string[] | null
          user_id: string
          version?: string
        }
        Update: {
          allowed_symbols?: string[] | null
          allowed_timeframes?: string[] | null
          created_at?: string
          file_name?: string
          file_sha256?: string | null
          id?: string
          name?: string
          risk_tier?: string
          status?: string
          storage_path?: string
          strategy_tags?: string[] | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      ea_presets: {
        Row: {
          created_at: string
          ea_id: string
          id: string
          inputs_json: Json | null
          name: string
          template_name: string | null
          template_storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ea_id: string
          id?: string
          inputs_json?: Json | null
          name: string
          template_name?: string | null
          template_storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ea_id?: string
          id?: string
          inputs_json?: Json | null
          name?: string
          template_name?: string | null
          template_storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ea_presets_ea_id_fkey"
            columns: ["ea_id"]
            isOneToOne: false
            referencedRelation: "ea_library"
            referencedColumns: ["id"]
          },
        ]
      }
      ea_run_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          run_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          run_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ea_run_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ea_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ea_runs: {
        Row: {
          connection_id: string | null
          created_at: string
          ea_id: string
          id: string
          last_error: string | null
          last_heartbeat_at: string | null
          mode: string
          preset_id: string | null
          risk_limits: Json | null
          slot: number
          started_at: string | null
          status: string
          stopped_at: string | null
          symbol: string
          terminal_id: string | null
          timeframe: string
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          ea_id: string
          id?: string
          last_error?: string | null
          last_heartbeat_at?: string | null
          mode?: string
          preset_id?: string | null
          risk_limits?: Json | null
          slot?: number
          started_at?: string | null
          status?: string
          stopped_at?: string | null
          symbol: string
          terminal_id?: string | null
          timeframe: string
          user_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          ea_id?: string
          id?: string
          last_error?: string | null
          last_heartbeat_at?: string | null
          mode?: string
          preset_id?: string | null
          risk_limits?: Json | null
          slot?: number
          started_at?: string | null
          status?: string
          stopped_at?: string | null
          symbol?: string
          terminal_id?: string | null
          timeframe?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ea_runs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ea_runs_ea_id_fkey"
            columns: ["ea_id"]
            isOneToOne: false
            referencedRelation: "ea_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ea_runs_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "ea_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ea_runs_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "mt5_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_accounts: {
        Row: {
          account_number: string
          broker_name: string
          created_at: string
          id: string
          label: string
          status: string
          user_id: string
        }
        Insert: {
          account_number: string
          broker_name: string
          created_at?: string
          id?: string
          label: string
          status?: string
          user_id: string
        }
        Update: {
          account_number?: string
          broker_name?: string
          created_at?: string
          id?: string
          label?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      factory_backtest_results: {
        Row: {
          avg_trade: number
          cagr: number | null
          consistency_score: number
          created_at: string
          id: string
          job_id: string
          max_dd_pct: number
          net_profit: number
          profit_factor: number
          robust_score: number
          sharpe: number | null
          sortino: number | null
          trades: number
          user_id: string
          win_rate: number
          worst_month: number | null
        }
        Insert: {
          avg_trade?: number
          cagr?: number | null
          consistency_score?: number
          created_at?: string
          id?: string
          job_id: string
          max_dd_pct?: number
          net_profit?: number
          profit_factor?: number
          robust_score?: number
          sharpe?: number | null
          sortino?: number | null
          trades?: number
          user_id: string
          win_rate?: number
          worst_month?: number | null
        }
        Update: {
          avg_trade?: number
          cagr?: number | null
          consistency_score?: number
          created_at?: string
          id?: string
          job_id?: string
          max_dd_pct?: number
          net_profit?: number
          profit_factor?: number
          robust_score?: number
          sharpe?: number | null
          sortino?: number | null
          trades?: number
          user_id?: string
          win_rate?: number
          worst_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "factory_backtest_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "backtest_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_deployments: {
        Row: {
          account_id: string
          created_at: string
          deployed_at: string | null
          error: string | null
          id: string
          last_heartbeat: string | null
          last_trade_at: string | null
          portfolio_member_id: string
          status: string
          terminal_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deployed_at?: string | null
          error?: string | null
          id?: string
          last_heartbeat?: string | null
          last_trade_at?: string | null
          portfolio_member_id: string
          status?: string
          terminal_id: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deployed_at?: string | null
          error?: string | null
          id?: string
          last_heartbeat?: string | null
          last_trade_at?: string | null
          portfolio_member_id?: string
          status?: string
          terminal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_deployments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "factory_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_deployments_portfolio_member_id_fkey"
            columns: ["portfolio_member_id"]
            isOneToOne: false
            referencedRelation: "factory_portfolio_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_deployments_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "factory_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_live_metrics: {
        Row: {
          created_at: string
          daily_pnl: number
          date: string
          dd_pct: number
          deployment_id: string
          drift_score: number
          expectancy: number
          id: string
          trade_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_pnl?: number
          date: string
          dd_pct?: number
          deployment_id: string
          drift_score?: number
          expectancy?: number
          id?: string
          trade_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          daily_pnl?: number
          date?: string
          dd_pct?: number
          deployment_id?: string
          drift_score?: number
          expectancy?: number
          id?: string
          trade_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_live_metrics_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "factory_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_portfolio_members: {
        Row: {
          allocation_pct: number
          created_at: string
          id: string
          kill_dd_pct: number
          kill_loss_streak: number
          portfolio_id: string
          role: string
          strategy_version_id: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Insert: {
          allocation_pct?: number
          created_at?: string
          id?: string
          kill_dd_pct?: number
          kill_loss_streak?: number
          portfolio_id: string
          role?: string
          strategy_version_id: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Update: {
          allocation_pct?: number
          created_at?: string
          id?: string
          kill_dd_pct?: number
          kill_loss_streak?: number
          portfolio_id?: string
          role?: string
          strategy_version_id?: string
          symbol?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "factory_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_portfolio_members_strategy_version_id_fkey"
            columns: ["strategy_version_id"]
            isOneToOne: false
            referencedRelation: "strategy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_portfolios: {
        Row: {
          created_at: string
          cycle_id: string
          id: string
          max_eas: number
          name: string
          risk_budget_pct: number
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          id?: string
          max_eas?: number
          name: string
          risk_budget_pct?: number
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          id?: string
          max_eas?: number
          name?: string
          risk_budget_pct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_portfolios_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "rotation_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_system_events: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          kind: string
          message: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          kind: string
          message: string
          payload?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: string
          message?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      factory_terminals: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          environment: string
          id: string
          is_kill_switch: boolean
          key: string
          name: string
          rollout_percentage: number
          target_groups: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          is_kill_switch?: boolean
          key: string
          name: string
          rollout_percentage?: number
          target_groups?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          is_kill_switch?: boolean
          key?: string
          name?: string
          rollout_percentage?: number
          target_groups?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          deployment_id: string | null
          detail: string | null
          id: string
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          strategy_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          deployment_id?: string | null
          detail?: string | null
          id?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          strategy_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          deployment_id?: string | null
          detail?: string | null
          id?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          strategy_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      investor_daily_reports: {
        Row: {
          created_at: string | null
          drawdown_pct: number | null
          exposure_pct: number | null
          fees_estimate: number | null
          id: string
          instance_id: string
          pnl: number | null
          red_flags: string[] | null
          report_date: string
          return_pct: number | null
          summary: string | null
          trade_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          drawdown_pct?: number | null
          exposure_pct?: number | null
          fees_estimate?: number | null
          id?: string
          instance_id: string
          pnl?: number | null
          red_flags?: string[] | null
          report_date: string
          return_pct?: number | null
          summary?: string | null
          trade_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          drawdown_pct?: number | null
          exposure_pct?: number | null
          fees_estimate?: number | null
          id?: string
          instance_id?: string
          pnl?: number | null
          red_flags?: string[] | null
          report_date?: string
          return_pct?: number | null
          summary?: string | null
          trade_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_daily_reports_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "chosen_strategy_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_executions: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          instance_id: string
          payload: Json | null
          risk_blocked: boolean | null
          risk_reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          instance_id: string
          payload?: Json | null
          risk_blocked?: boolean | null
          risk_reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          instance_id?: string
          payload?: Json | null
          risk_blocked?: boolean | null
          risk_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_executions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "chosen_strategy_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          capital: number
          created_at: string | null
          experience: string | null
          goal_text: string | null
          horizon_days: number
          id: string
          max_drawdown_pct: number
          preferred_assets: string[] | null
          risk_level: string
          target_return_band: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          capital?: number
          created_at?: string | null
          experience?: string | null
          goal_text?: string | null
          horizon_days?: number
          id?: string
          max_drawdown_pct?: number
          preferred_assets?: string[] | null
          risk_level?: string
          target_return_band?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          capital?: number
          created_at?: string | null
          experience?: string | null
          goal_text?: string | null
          horizon_days?: number
          id?: string
          max_drawdown_pct?: number
          preferred_assets?: string[] | null
          risk_level?: string
          target_return_band?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_run_history: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          job_ref_id: string | null
          job_type: string
          output_summary: Json | null
          scheduled_job_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_ref_id?: string | null
          job_type: string
          output_summary?: Json | null
          scheduled_job_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_ref_id?: string | null
          job_type?: string
          output_summary?: Json | null
          scheduled_job_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_run_history_scheduled_job_id_fkey"
            columns: ["scheduled_job_id"]
            isOneToOne: false
            referencedRelation: "scheduled_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          confidence: number | null
          created_at: string
          date: string
          focus_level: number | null
          goals: string | null
          id: string
          lessons: string | null
          overall_mood: string | null
          post_market_review: string | null
          pre_market_plan: string | null
          summary: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          date: string
          focus_level?: number | null
          goals?: string | null
          id?: string
          lessons?: string | null
          overall_mood?: string | null
          post_market_review?: string | null
          pre_market_plan?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          date?: string
          focus_level?: number | null
          goals?: string | null
          id?: string
          lessons?: string | null
          overall_mood?: string | null
          post_market_review?: string | null
          pre_market_plan?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_deployments: {
        Row: {
          account_id: string | null
          broker_type: string
          created_at: string
          current_pnl: number | null
          id: string
          last_heartbeat: string | null
          last_signal_at: string | null
          pause_reason: string | null
          risk_policy_id: string | null
          runtime_config: Json | null
          status: string
          strategy_name: string
          strategy_version_id: string | null
          symbol: string
          timeframe: string
          trades_executed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          broker_type: string
          created_at?: string
          current_pnl?: number | null
          id?: string
          last_heartbeat?: string | null
          last_signal_at?: string | null
          pause_reason?: string | null
          risk_policy_id?: string | null
          runtime_config?: Json | null
          status?: string
          strategy_name: string
          strategy_version_id?: string | null
          symbol: string
          timeframe?: string
          trades_executed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          broker_type?: string
          created_at?: string
          current_pnl?: number | null
          id?: string
          last_heartbeat?: string | null
          last_signal_at?: string | null
          pause_reason?: string | null
          risk_policy_id?: string | null
          runtime_config?: Json | null
          status?: string
          strategy_name?: string
          strategy_version_id?: string | null
          symbol?: string
          timeframe?: string
          trades_executed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_deployments_risk_policy_id_fkey"
            columns: ["risk_policy_id"]
            isOneToOne: false
            referencedRelation: "risk_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string | null
          id: string
          level: string | null
          message: string | null
          meta_json: Json | null
          scope: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: string | null
          message?: string | null
          meta_json?: Json | null
          scope: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string | null
          message?: string | null
          meta_json?: Json | null
          scope?: string
          user_id?: string | null
        }
        Relationships: []
      }
      marketplace_strategies: {
        Row: {
          author_id: string
          category: string
          created_at: string
          description: string | null
          download_count: number | null
          id: string
          is_featured: boolean | null
          is_free: boolean | null
          is_verified: boolean | null
          preview_image_url: string | null
          price: number | null
          rating_avg: number | null
          rating_count: number | null
          strategy_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          category?: string
          created_at?: string
          description?: string | null
          download_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_verified?: boolean | null
          preview_image_url?: string | null
          price?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          strategy_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          category?: string
          created_at?: string
          description?: string | null
          download_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_verified?: boolean | null
          preview_image_url?: string | null
          price?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          strategy_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_strategies_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      monte_carlo_runs: {
        Row: {
          config: Json
          created_at: string
          id: string
          results: Json | null
          source_type: string
          status: string
          strategy_id: string | null
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          results?: Json | null
          source_type?: string
          status?: string
          strategy_id?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          results?: Json | null
          source_type?: string
          status?: string
          strategy_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monte_carlo_runs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_accounts: {
        Row: {
          account_number: string
          broker_name: string
          connection_status: string
          created_at: string
          currency: string | null
          id: string
          is_active: boolean
          last_heartbeat_at: string | null
          last_sync_at: string | null
          leverage: number | null
          metadata: Json | null
          server_name: string | null
          sync_key: string | null
          sync_latency_ms: number | null
          terminal_build: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          broker_name: string
          connection_status?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat_at?: string | null
          last_sync_at?: string | null
          leverage?: number | null
          metadata?: Json | null
          server_name?: string | null
          sync_key?: string | null
          sync_latency_ms?: number | null
          terminal_build?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          broker_name?: string
          connection_status?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat_at?: string | null
          last_sync_at?: string | null
          leverage?: number | null
          metadata?: Json | null
          server_name?: string | null
          sync_key?: string | null
          sync_latency_ms?: number | null
          terminal_build?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mt5_deals: {
        Row: {
          account_id: string
          comment: string | null
          commission: number | null
          deal_ticket: number
          deal_time: string
          deal_type: string
          entry_type: string | null
          fee: number | null
          id: string
          magic_number: number | null
          metadata: Json | null
          order_ticket: number | null
          position_ticket: number | null
          price: number | null
          profit: number | null
          swap: number | null
          symbol: string
          synced_at: string
          user_id: string
          volume: number | null
        }
        Insert: {
          account_id: string
          comment?: string | null
          commission?: number | null
          deal_ticket: number
          deal_time: string
          deal_type: string
          entry_type?: string | null
          fee?: number | null
          id?: string
          magic_number?: number | null
          metadata?: Json | null
          order_ticket?: number | null
          position_ticket?: number | null
          price?: number | null
          profit?: number | null
          swap?: number | null
          symbol: string
          synced_at?: string
          user_id: string
          volume?: number | null
        }
        Update: {
          account_id?: string
          comment?: string | null
          commission?: number | null
          deal_ticket?: number
          deal_time?: string
          deal_type?: string
          entry_type?: string | null
          fee?: number | null
          id?: string
          magic_number?: number | null
          metadata?: Json | null
          order_ticket?: number | null
          position_ticket?: number | null
          price?: number | null
          profit?: number | null
          swap?: number | null
          symbol?: string
          synced_at?: string
          user_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mt5_deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_equity_snapshots: {
        Row: {
          account_id: string
          balance: number
          equity: number
          floating_pl: number | null
          free_margin: number | null
          id: string
          margin: number | null
          margin_level: number | null
          orders_count: number | null
          positions_count: number | null
          snapshot_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          balance: number
          equity: number
          floating_pl?: number | null
          free_margin?: number | null
          id?: string
          margin?: number | null
          margin_level?: number | null
          orders_count?: number | null
          positions_count?: number | null
          snapshot_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          balance?: number
          equity?: number
          floating_pl?: number | null
          free_margin?: number | null
          id?: string
          margin?: number | null
          margin_level?: number | null
          orders_count?: number | null
          positions_count?: number | null
          snapshot_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt5_equity_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_orders: {
        Row: {
          account_id: string
          comment: string | null
          expiration: string | null
          id: string
          magic_number: number | null
          metadata: Json | null
          order_time: string
          order_type: string
          price: number
          state: string | null
          stop_limit: number | null
          stop_loss: number | null
          symbol: string
          synced_at: string
          take_profit: number | null
          ticket: number
          user_id: string
          volume: number
        }
        Insert: {
          account_id: string
          comment?: string | null
          expiration?: string | null
          id?: string
          magic_number?: number | null
          metadata?: Json | null
          order_time: string
          order_type: string
          price: number
          state?: string | null
          stop_limit?: number | null
          stop_loss?: number | null
          symbol: string
          synced_at?: string
          take_profit?: number | null
          ticket: number
          user_id: string
          volume: number
        }
        Update: {
          account_id?: string
          comment?: string | null
          expiration?: string | null
          id?: string
          magic_number?: number | null
          metadata?: Json | null
          order_time?: string
          order_type?: string
          price?: number
          state?: string | null
          stop_limit?: number | null
          stop_loss?: number | null
          symbol?: string
          synced_at?: string
          take_profit?: number | null
          ticket?: number
          user_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt5_orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_positions: {
        Row: {
          account_id: string
          comment: string | null
          commission: number | null
          current_price: number | null
          direction: string
          id: string
          is_open: boolean
          magic_number: number | null
          metadata: Json | null
          open_price: number
          open_time: string
          profit: number | null
          stop_loss: number | null
          swap: number | null
          symbol: string
          synced_at: string
          take_profit: number | null
          ticket: number
          user_id: string
          volume: number
        }
        Insert: {
          account_id: string
          comment?: string | null
          commission?: number | null
          current_price?: number | null
          direction: string
          id?: string
          is_open?: boolean
          magic_number?: number | null
          metadata?: Json | null
          open_price: number
          open_time: string
          profit?: number | null
          stop_loss?: number | null
          swap?: number | null
          symbol: string
          synced_at?: string
          take_profit?: number | null
          ticket: number
          user_id: string
          volume: number
        }
        Update: {
          account_id?: string
          comment?: string | null
          commission?: number | null
          current_price?: number | null
          direction?: string
          id?: string
          is_open?: boolean
          magic_number?: number | null
          metadata?: Json | null
          open_price?: number
          open_time?: string
          profit?: number | null
          stop_loss?: number | null
          swap?: number | null
          symbol?: string
          synced_at?: string
          take_profit?: number | null
          ticket?: number
          user_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt5_positions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_reconciliation: {
        Row: {
          account_id: string
          actual_orders: number
          actual_positions: number
          auto_healed: number
          expected_orders: number
          expected_positions: number
          id: string
          manual_required: number
          metadata: Json | null
          order_mismatches: Json
          position_mismatches: Json
          reconciled_at: string
          severity: string
          user_id: string
        }
        Insert: {
          account_id: string
          actual_orders?: number
          actual_positions?: number
          auto_healed?: number
          expected_orders?: number
          expected_positions?: number
          id?: string
          manual_required?: number
          metadata?: Json | null
          order_mismatches?: Json
          position_mismatches?: Json
          reconciled_at?: string
          severity?: string
          user_id: string
        }
        Update: {
          account_id?: string
          actual_orders?: number
          actual_positions?: number
          auto_healed?: number
          expected_orders?: number
          expected_positions?: number
          id?: string
          manual_required?: number
          metadata?: Json | null
          order_mismatches?: Json
          position_mismatches?: Json
          reconciled_at?: string
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt5_reconciliation_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_risk_config: {
        Row: {
          account_id: string | null
          circuit_breaker_enabled: boolean
          circuit_open_until: string | null
          created_at: string
          current_error_count: number
          error_window_minutes: number
          id: string
          kill_switch_active: boolean
          kill_switch_at: string | null
          kill_switch_reason: string | null
          last_error_at: string | null
          max_consecutive_errors: number
          max_daily_loss_pct: number | null
          max_lot_size: number | null
          max_positions: number | null
          scope: string
          session_window_end: string | null
          session_window_start: string | null
          symbol_whitelist: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          circuit_breaker_enabled?: boolean
          circuit_open_until?: string | null
          created_at?: string
          current_error_count?: number
          error_window_minutes?: number
          id?: string
          kill_switch_active?: boolean
          kill_switch_at?: string | null
          kill_switch_reason?: string | null
          last_error_at?: string | null
          max_consecutive_errors?: number
          max_daily_loss_pct?: number | null
          max_lot_size?: number | null
          max_positions?: number | null
          scope?: string
          session_window_end?: string | null
          session_window_start?: string | null
          symbol_whitelist?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          circuit_breaker_enabled?: boolean
          circuit_open_until?: string | null
          created_at?: string
          current_error_count?: number
          error_window_minutes?: number
          id?: string
          kill_switch_active?: boolean
          kill_switch_at?: string | null
          kill_switch_reason?: string | null
          last_error_at?: string | null
          max_consecutive_errors?: number
          max_daily_loss_pct?: number | null
          max_lot_size?: number | null
          max_positions?: number | null
          scope?: string
          session_window_end?: string | null
          session_window_start?: string | null
          symbol_whitelist?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt5_risk_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_runners: {
        Row: {
          created_at: string
          id: string
          ip_hint: string | null
          last_heartbeat_at: string | null
          last_seen_version: string | null
          name: string
          os: string
          runner_key: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hint?: string | null
          last_heartbeat_at?: string | null
          last_seen_version?: string | null
          name: string
          os?: string
          runner_key?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hint?: string | null
          last_heartbeat_at?: string | null
          last_seen_version?: string | null
          name?: string
          os?: string
          runner_key?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      mt5_sync_log: {
        Row: {
          account_id: string
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          mismatch_count: number | null
          mismatch_severity: string | null
          mismatches: Json | null
          records_created: number | null
          records_deleted: number | null
          records_synced: number | null
          records_updated: number | null
          started_at: string
          status: string
          sync_type: string
          user_id: string
          watermark: Json | null
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          mismatch_count?: number | null
          mismatch_severity?: string | null
          mismatches?: Json | null
          records_created?: number | null
          records_deleted?: number | null
          records_synced?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_type: string
          user_id: string
          watermark?: Json | null
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          mismatch_count?: number | null
          mismatch_severity?: string | null
          mismatches?: Json | null
          records_created?: number | null
          records_deleted?: number | null
          records_synced?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          user_id?: string
          watermark?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mt5_sync_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_terminals: {
        Row: {
          created_at: string
          id: string
          label: string
          last_error: string | null
          last_start_at: string | null
          portable_mode: boolean
          restart_count: number
          runner_id: string
          status: string
          terminal_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          last_error?: string | null
          last_start_at?: string | null
          portable_mode?: boolean
          restart_count?: number
          runner_id: string
          status?: string
          terminal_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_error?: string | null
          last_start_at?: string | null
          portable_mode?: boolean
          restart_count?: number
          runner_id?: string
          status?: string
          terminal_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt5_terminals_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "mt5_runners"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_notes: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          delivery_status: string
          failed_at: string | null
          id: string
          notification_id: string
          provider_response: Json | null
          recipient: string | null
          sent_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          failed_at?: string | null
          id?: string
          notification_id: string
          provider_response?: Json | null
          recipient?: string | null
          sent_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          failed_at?: string | null
          id?: string
          notification_id?: string
          provider_response?: Json | null
          recipient?: string | null
          sent_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          alert_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      optimization_runs: {
        Row: {
          algorithm: string
          best_candidate: Json | null
          candidates: Json | null
          completed_at: string | null
          config: Json
          convergence: Json | null
          created_at: string
          dataset_id: string | null
          error: string | null
          id: string
          progress: number | null
          seed: number | null
          started_at: string | null
          status: string
          strategy_id: string | null
          user_id: string
        }
        Insert: {
          algorithm?: string
          best_candidate?: Json | null
          candidates?: Json | null
          completed_at?: string | null
          config?: Json
          convergence?: Json | null
          created_at?: string
          dataset_id?: string | null
          error?: string | null
          id?: string
          progress?: number | null
          seed?: number | null
          started_at?: string | null
          status?: string
          strategy_id?: string | null
          user_id: string
        }
        Update: {
          algorithm?: string
          best_candidate?: Json | null
          candidates?: Json | null
          completed_at?: string | null
          config?: Json
          convergence?: Json | null
          created_at?: string
          dataset_id?: string | null
          error?: string | null
          id?: string
          progress?: number | null
          seed?: number | null
          started_at?: string | null
          status?: string
          strategy_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_runs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimization_runs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_accounts: {
        Row: {
          balance: number
          created_at: string
          equity: number
          id: string
          initial_balance: number
          mode: string
          name: string
          realized_pnl: number | null
          total_fees: number | null
          unrealized_pnl: number | null
          updated_at: string
          used_margin: number | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          equity?: number
          id?: string
          initial_balance?: number
          mode?: string
          name?: string
          realized_pnl?: number | null
          total_fees?: number | null
          unrealized_pnl?: number | null
          updated_at?: string
          used_margin?: number | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          equity?: number
          id?: string
          initial_balance?: number
          mode?: string
          name?: string
          realized_pnl?: number | null
          total_fees?: number | null
          unrealized_pnl?: number | null
          updated_at?: string
          used_margin?: number | null
          user_id?: string
        }
        Relationships: []
      }
      paper_orders: {
        Row: {
          account_id: string
          avg_fill_price: number | null
          created_at: string
          fees: number | null
          filled_quantity: number | null
          id: string
          order_type: string
          price: number | null
          quantity: number
          side: string
          slippage: number | null
          status: string
          stop_loss: number | null
          stop_price: number | null
          strategy_id: string | null
          symbol: string
          take_profit: number | null
          trailing_stop: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          avg_fill_price?: number | null
          created_at?: string
          fees?: number | null
          filled_quantity?: number | null
          id?: string
          order_type?: string
          price?: number | null
          quantity: number
          side: string
          slippage?: number | null
          status?: string
          stop_loss?: number | null
          stop_price?: number | null
          strategy_id?: string | null
          symbol: string
          take_profit?: number | null
          trailing_stop?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          avg_fill_price?: number | null
          created_at?: string
          fees?: number | null
          filled_quantity?: number | null
          id?: string
          order_type?: string
          price?: number | null
          quantity?: number
          side?: string
          slippage?: number | null
          status?: string
          stop_loss?: number | null
          stop_price?: number | null
          strategy_id?: string | null
          symbol?: string
          take_profit?: number | null
          trailing_stop?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "paper_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_constraint_breaches: {
        Row: {
          affected_entities: Json | null
          breach_type: string
          created_at: string
          current_value: number | null
          detected_at: string
          id: string
          portfolio_id: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          threshold_value: number | null
        }
        Insert: {
          affected_entities?: Json | null
          breach_type: string
          created_at?: string
          current_value?: number | null
          detected_at?: string
          id?: string
          portfolio_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
        }
        Update: {
          affected_entities?: Json | null
          breach_type?: string
          created_at?: string
          current_value?: number | null
          detected_at?: string
          id?: string
          portfolio_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
        }
        Relationships: []
      }
      portfolio_rebalance_runs: {
        Row: {
          created_at: string
          diversification_score_after: number | null
          diversification_score_before: number | null
          executed_at: string | null
          expected_drawdown_after: number | null
          expected_drawdown_before: number | null
          id: string
          new_weights: Json | null
          old_weights: Json | null
          portfolio_id: string
          rebalance_type: string
          status: string
          triggered_by: string | null
          turnover_pct: number | null
        }
        Insert: {
          created_at?: string
          diversification_score_after?: number | null
          diversification_score_before?: number | null
          executed_at?: string | null
          expected_drawdown_after?: number | null
          expected_drawdown_before?: number | null
          id?: string
          new_weights?: Json | null
          old_weights?: Json | null
          portfolio_id: string
          rebalance_type?: string
          status?: string
          triggered_by?: string | null
          turnover_pct?: number | null
        }
        Update: {
          created_at?: string
          diversification_score_after?: number | null
          diversification_score_before?: number | null
          executed_at?: string | null
          expected_drawdown_after?: number | null
          expected_drawdown_before?: number | null
          id?: string
          new_weights?: Json | null
          old_weights?: Json | null
          portfolio_id?: string
          rebalance_type?: string
          status?: string
          triggered_by?: string | null
          turnover_pct?: number | null
        }
        Relationships: []
      }
      premium_trials: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_private_data: {
        Row: {
          created_at: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_public: boolean
          last_seen: string | null
          onboarded_at: string | null
          referral_code: string | null
          trader_goal: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_public?: boolean
          last_seen?: string | null
          onboarded_at?: string | null
          referral_code?: string | null
          trader_goal?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_public?: boolean
          last_seen?: string | null
          onboarded_at?: string | null
          referral_code?: string | null
          trader_goal?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_challenge_daily_snapshots: {
        Row: {
          balance: number | null
          breach_risk_level: string | null
          challenge_id: string
          created_at: string
          daily_loss_used: number | null
          equity: number | null
          id: string
          pass_probability: number | null
          profit_target_progress: number | null
          snapshot_date: string
          total_drawdown_used: number | null
          trading_days_completed: number | null
        }
        Insert: {
          balance?: number | null
          breach_risk_level?: string | null
          challenge_id: string
          created_at?: string
          daily_loss_used?: number | null
          equity?: number | null
          id?: string
          pass_probability?: number | null
          profit_target_progress?: number | null
          snapshot_date: string
          total_drawdown_used?: number | null
          trading_days_completed?: number | null
        }
        Update: {
          balance?: number | null
          breach_risk_level?: string | null
          challenge_id?: string
          created_at?: string
          daily_loss_used?: number | null
          equity?: number | null
          id?: string
          pass_probability?: number | null
          profit_target_progress?: number | null
          snapshot_date?: string
          total_drawdown_used?: number | null
          trading_days_completed?: number | null
        }
        Relationships: []
      }
      prop_firm_challenges: {
        Row: {
          account_id: string | null
          challenge_name: string | null
          created_at: string
          current_balance: number
          dd_mode: string
          end_date: string | null
          firm_name: string
          id: string
          initial_balance: number
          max_daily_dd_pct: number
          max_total_dd_pct: number
          min_trading_days: number | null
          phase: string
          profit_split_pct: number | null
          profit_target_pct: number
          progress_json: Json | null
          rules_config: Json | null
          start_date: string
          status: string
          trading_days_done: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          challenge_name?: string | null
          created_at?: string
          current_balance: number
          dd_mode?: string
          end_date?: string | null
          firm_name: string
          id?: string
          initial_balance: number
          max_daily_dd_pct?: number
          max_total_dd_pct?: number
          min_trading_days?: number | null
          phase?: string
          profit_split_pct?: number | null
          profit_target_pct?: number
          progress_json?: Json | null
          rules_config?: Json | null
          start_date: string
          status?: string
          trading_days_done?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          challenge_name?: string | null
          created_at?: string
          current_balance?: number
          dd_mode?: string
          end_date?: string | null
          firm_name?: string
          id?: string
          initial_balance?: number
          max_daily_dd_pct?: number
          max_total_dd_pct?: number
          min_trading_days?: number | null
          phase?: string
          profit_split_pct?: number | null
          profit_target_pct?: number
          progress_json?: Json | null
          rules_config?: Json | null
          start_date?: string
          status?: string
          trading_days_done?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prop_firm_challenges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prop_firm_challenges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "broker_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      quant_audit_log: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      quant_audit_trail: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      quant_incidents: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          deployment_id: string | null
          detail: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          deployment_id?: string | null
          detail?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          deployment_id?: string | null
          detail?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendation_runs: {
        Row: {
          chosen_strategy_id: string | null
          created_at: string | null
          goal_text: string | null
          id: string
          profile_snapshot: Json
          top_matches: Json
          user_id: string
        }
        Insert: {
          chosen_strategy_id?: string | null
          created_at?: string | null
          goal_text?: string | null
          id?: string
          profile_snapshot?: Json
          top_matches?: Json
          user_id: string
        }
        Update: {
          chosen_strategy_id?: string | null
          created_at?: string | null
          goal_text?: string | null
          id?: string
          profile_snapshot?: Json
          top_matches?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_runs_chosen_strategy_id_fkey"
            columns: ["chosen_strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      regime_snapshots: {
        Row: {
          computed_at: string
          confidence: number
          features: Json
          id: string
          regime: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: number
          features?: Json
          id?: string
          regime: string
          symbol: string
          timeframe?: string
          user_id: string
        }
        Update: {
          computed_at?: string
          confidence?: number
          features?: Json
          id?: string
          regime?: string
          symbol?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: []
      }
      regime_transitions: {
        Row: {
          confidence: number
          from_regime: string
          id: string
          symbol: string
          timeframe: string
          to_regime: string
          transitioned_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          from_regime: string
          id?: string
          symbol: string
          timeframe?: string
          to_regime: string
          transitioned_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          from_regime?: string
          id?: string
          symbol?: string
          timeframe?: string
          to_regime?: string
          transitioned_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_artifacts: {
        Row: {
          artifact_metadata: Json | null
          artifact_path: string | null
          artifact_title: string | null
          artifact_type: string
          created_at: string
          generated_at: string
          id: string
          source_job_id: string | null
          strategy_id: string
        }
        Insert: {
          artifact_metadata?: Json | null
          artifact_path?: string | null
          artifact_title?: string | null
          artifact_type: string
          created_at?: string
          generated_at?: string
          id?: string
          source_job_id?: string | null
          strategy_id: string
        }
        Update: {
          artifact_metadata?: Json | null
          artifact_path?: string | null
          artifact_title?: string | null
          artifact_type?: string
          created_at?: string
          generated_at?: string
          id?: string
          source_job_id?: string | null
          strategy_id?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string | null
          dataset_id: string | null
          id: string
          is_favorite: boolean | null
          name: string | null
          run_id: string | null
          strategy_id: string | null
          strategy_version_id: string | null
          summary_json: Json
          tags: string[] | null
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string | null
          dataset_id?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string | null
          run_id?: string | null
          strategy_id?: string | null
          strategy_version_id?: string | null
          summary_json: Json
          tags?: string[] | null
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string | null
          dataset_id?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string | null
          run_id?: string | null
          strategy_id?: string | null
          strategy_version_id?: string | null
          summary_json?: Json
          tags?: string[] | null
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_strategy_version_id_fkey"
            columns: ["strategy_version_id"]
            isOneToOne: false
            referencedRelation: "strategy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_actions: {
        Row: {
          action_payload: Json | null
          action_type: string
          created_at: string
          executed_at: string | null
          executed_by: string | null
          execution_status: string
          id: string
          risk_incident_id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          created_at?: string
          executed_at?: string | null
          executed_by?: string | null
          execution_status?: string
          id?: string
          risk_incident_id: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          created_at?: string
          executed_at?: string | null
          executed_by?: string | null
          execution_status?: string
          id?: string
          risk_incident_id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_actions_risk_incident_id_fkey"
            columns: ["risk_incident_id"]
            isOneToOne: false
            referencedRelation: "risk_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_breaches: {
        Row: {
          acknowledged: boolean | null
          action_taken: string
          created_at: string
          current_value: number
          deployment_id: string | null
          id: string
          limit_value: number
          policy_id: string | null
          rule_type: string
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          action_taken: string
          created_at?: string
          current_value: number
          deployment_id?: string | null
          id?: string
          limit_value: number
          policy_id?: string | null
          rule_type: string
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          action_taken?: string
          created_at?: string
          current_value?: number
          deployment_id?: string | null
          id?: string
          limit_value?: number
          policy_id?: string | null
          rule_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_breaches_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "risk_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_incidents: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          incident_payload: Json | null
          incident_status: string
          incident_type: string
          metric_value: number | null
          opened_at: string
          portfolio_id: string | null
          resolved_at: string | null
          severity: string
          source: string | null
          strategy_id: string | null
          threshold_value: number | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          incident_payload?: Json | null
          incident_status?: string
          incident_type: string
          metric_value?: number | null
          opened_at?: string
          portfolio_id?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string | null
          strategy_id?: string | null
          threshold_value?: number | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          incident_payload?: Json | null
          incident_status?: string
          incident_type?: string
          metric_value?: number | null
          opened_at?: string
          portfolio_id?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string | null
          strategy_id?: string | null
          threshold_value?: number | null
        }
        Relationships: []
      }
      risk_policies: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          name: string
          rules: Json
          scope: string
          scope_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          name: string
          rules?: Json
          scope?: string
          scope_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          name?: string
          rules?: Json
          scope?: string
          scope_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rotation_cycles: {
        Row: {
          as_of: string
          created_at: string
          cycle_type: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          as_of: string
          created_at?: string
          cycle_type: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          as_of?: string
          created_at?: string
          cycle_type?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      runner_commands: {
        Row: {
          command_type: string
          created_at: string
          id: string
          payload: Json | null
          result: Json | null
          runner_id: string
          status: string
          terminal_id: string | null
          updated_at: string
        }
        Insert: {
          command_type: string
          created_at?: string
          id?: string
          payload?: Json | null
          result?: Json | null
          runner_id: string
          status?: string
          terminal_id?: string | null
          updated_at?: string
        }
        Update: {
          command_type?: string
          created_at?: string
          id?: string
          payload?: Json | null
          result?: Json | null
          runner_id?: string
          status?: string
          terminal_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_commands_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "mt5_runners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runner_commands_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "mt5_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      runner_heartbeats: {
        Row: {
          controller_alive: boolean | null
          cpu: number | null
          created_at: string
          disk_free: number | null
          id: string
          last_tick_at: string | null
          mt5_alive: boolean | null
          payload: Json | null
          ram: number | null
          run_id: string | null
          runner_id: string
          terminal_id: string | null
        }
        Insert: {
          controller_alive?: boolean | null
          cpu?: number | null
          created_at?: string
          disk_free?: number | null
          id?: string
          last_tick_at?: string | null
          mt5_alive?: boolean | null
          payload?: Json | null
          ram?: number | null
          run_id?: string | null
          runner_id: string
          terminal_id?: string | null
        }
        Update: {
          controller_alive?: boolean | null
          cpu?: number | null
          created_at?: string
          disk_free?: number | null
          id?: string
          last_tick_at?: string | null
          mt5_alive?: boolean | null
          payload?: Json | null
          ram?: number | null
          run_id?: string | null
          runner_id?: string
          terminal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runner_heartbeats_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ea_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runner_heartbeats_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "mt5_runners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runner_heartbeats_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "mt5_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          created_at: string | null
          dataset_id: string | null
          fingerprint: string | null
          id: string
          params_json: Json | null
          status: string | null
          strategy_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dataset_id?: string | null
          fingerprint?: string | null
          id?: string
          params_json?: Json | null
          status?: string | null
          strategy_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dataset_id?: string | null
          fingerprint?: string | null
          id?: string
          params_json?: Json | null
          status?: string | null
          strategy_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          job_name: string
          job_payload: Json | null
          job_type: string
          last_run_at: string | null
          last_status: string | null
          next_run_at: string | null
          schedule_expression: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          job_name: string
          job_payload?: Json | null
          job_type: string
          last_run_at?: string | null
          last_status?: string | null
          next_run_at?: string | null
          schedule_expression?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          job_name?: string
          job_payload?: Json | null
          job_type?: string
          last_run_at?: string | null
          last_status?: string | null
          next_run_at?: string | null
          schedule_expression?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sentinel_waitlist: {
        Row: {
          created_at: string
          email: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      shared_datasets: {
        Row: {
          columns_map: Json | null
          created_at: string
          description: string | null
          file_size_bytes: number
          id: string
          is_active: boolean
          name: string
          range_from_ts: number
          range_to_ts: number
          row_count: number
          source_info: string | null
          storage_path: string
          symbol: string
          timeframe: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          columns_map?: Json | null
          created_at?: string
          description?: string | null
          file_size_bytes?: number
          id?: string
          is_active?: boolean
          name: string
          range_from_ts: number
          range_to_ts: number
          row_count?: number
          source_info?: string | null
          storage_path: string
          symbol: string
          timeframe: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          columns_map?: Json | null
          created_at?: string
          description?: string | null
          file_size_bytes?: number
          id?: string
          is_active?: boolean
          name?: string
          range_from_ts?: number
          range_to_ts?: number
          row_count?: number
          source_info?: string | null
          storage_path?: string
          symbol?: string
          timeframe?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      strategies: {
        Row: {
          asset_classes: string[] | null
          category: string | null
          code: string | null
          compatible_timeframes: string[] | null
          created_at: string | null
          default_symbol: string | null
          description: string | null
          expected_trade_frequency: string | null
          export_capabilities: Json | null
          factory_status: string
          id: string
          last_used_at: string | null
          max_recommended_dd_pct: number | null
          min_capital: number | null
          name: string
          notes: string | null
          parameters: Json | null
          project_id: string | null
          risk_profile: string | null
          slug: string | null
          status: string | null
          strategy_logic: Json | null
          style: string | null
          tags: string[] | null
          timeframes: string[]
          typical_hold_time: string | null
          updated_at: string | null
          usage_count: number
          user_id: string
          version: string | null
          visibility: string
        }
        Insert: {
          asset_classes?: string[] | null
          category?: string | null
          code?: string | null
          compatible_timeframes?: string[] | null
          created_at?: string | null
          default_symbol?: string | null
          description?: string | null
          expected_trade_frequency?: string | null
          export_capabilities?: Json | null
          factory_status?: string
          id?: string
          last_used_at?: string | null
          max_recommended_dd_pct?: number | null
          min_capital?: number | null
          name: string
          notes?: string | null
          parameters?: Json | null
          project_id?: string | null
          risk_profile?: string | null
          slug?: string | null
          status?: string | null
          strategy_logic?: Json | null
          style?: string | null
          tags?: string[] | null
          timeframes?: string[]
          typical_hold_time?: string | null
          updated_at?: string | null
          usage_count?: number
          user_id: string
          version?: string | null
          visibility?: string
        }
        Update: {
          asset_classes?: string[] | null
          category?: string | null
          code?: string | null
          compatible_timeframes?: string[] | null
          created_at?: string | null
          default_symbol?: string | null
          description?: string | null
          expected_trade_frequency?: string | null
          export_capabilities?: Json | null
          factory_status?: string
          id?: string
          last_used_at?: string | null
          max_recommended_dd_pct?: number | null
          min_capital?: number | null
          name?: string
          notes?: string | null
          parameters?: Json | null
          project_id?: string | null
          risk_profile?: string | null
          slug?: string | null
          status?: string | null
          strategy_logic?: Json | null
          style?: string | null
          tags?: string[] | null
          timeframes?: string[]
          typical_hold_time?: string | null
          updated_at?: string | null
          usage_count?: number
          user_id?: string
          version?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_deployment_readiness: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          blocking_reasons: Json | null
          created_at: string
          deployment_status: string
          evaluated_at: string | null
          id: string
          latest_backtest_job_id: string | null
          latest_execution_realism_score: number | null
          latest_health_run_id: string | null
          latest_regime_robustness_score: number | null
          latest_robustness_score: number | null
          latest_walkforward_score: number | null
          strategy_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          blocking_reasons?: Json | null
          created_at?: string
          deployment_status?: string
          evaluated_at?: string | null
          id?: string
          latest_backtest_job_id?: string | null
          latest_execution_realism_score?: number | null
          latest_health_run_id?: string | null
          latest_regime_robustness_score?: number | null
          latest_robustness_score?: number | null
          latest_walkforward_score?: number | null
          strategy_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          blocking_reasons?: Json | null
          created_at?: string
          deployment_status?: string
          evaluated_at?: string | null
          id?: string
          latest_backtest_job_id?: string | null
          latest_execution_realism_score?: number | null
          latest_health_run_id?: string | null
          latest_regime_robustness_score?: number | null
          latest_robustness_score?: number | null
          latest_walkforward_score?: number | null
          strategy_id?: string
        }
        Relationships: []
      }
      strategy_downloads: {
        Row: {
          downloaded_at: string
          id: string
          marketplace_strategy_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          marketplace_strategy_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          marketplace_strategy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_downloads_marketplace_strategy_id_fkey"
            columns: ["marketplace_strategy_id"]
            isOneToOne: false
            referencedRelation: "marketplace_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_downloads_marketplace_strategy_id_fkey"
            columns: ["marketplace_strategy_id"]
            isOneToOne: false
            referencedRelation: "marketplace_strategies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_favorites: {
        Row: {
          created_at: string
          id: string
          marketplace_strategy_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketplace_strategy_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketplace_strategy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_favorites_marketplace_strategy_id_fkey"
            columns: ["marketplace_strategy_id"]
            isOneToOne: false
            referencedRelation: "marketplace_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_favorites_marketplace_strategy_id_fkey"
            columns: ["marketplace_strategy_id"]
            isOneToOne: false
            referencedRelation: "marketplace_strategies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_health_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          strategies_processed: number
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          strategies_processed?: number
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          strategies_processed?: number
          triggered_by?: string | null
        }
        Relationships: []
      }
      strategy_health_scores: {
        Row: {
          components: Json
          computed_from: string
          created_at: string
          grade: string
          id: string
          last_computed_at: string
          reasons: string[]
          sample_size: number
          scope: string
          score: number
          strategy_id: string
          symbol: string
          timeframe: string
          updated_at: string
          warnings: string[]
        }
        Insert: {
          components?: Json
          computed_from?: string
          created_at?: string
          grade?: string
          id?: string
          last_computed_at?: string
          reasons?: string[]
          sample_size?: number
          scope?: string
          score?: number
          strategy_id: string
          symbol?: string
          timeframe?: string
          updated_at?: string
          warnings?: string[]
        }
        Update: {
          components?: Json
          computed_from?: string
          created_at?: string
          grade?: string
          id?: string
          last_computed_at?: string
          reasons?: string[]
          sample_size?: number
          scope?: string
          score?: number
          strategy_id?: string
          symbol?: string
          timeframe?: string
          updated_at?: string
          warnings?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "strategy_health_scores_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_intelligence: {
        Row: {
          assets: string[] | null
          backtest_count: number | null
          cagr: number | null
          created_at: string
          description: string | null
          execution_realism_score: number | null
          expectancy: number | null
          id: string
          last_backtest_at: string | null
          last_mc_at: string | null
          last_wf_at: string | null
          markets: string[] | null
          max_drawdown: number | null
          methodology: string | null
          mmc_composite_score: number | null
          name: string
          notes: string | null
          oos_performance: number | null
          parameter_robustness: number | null
          profit_factor: number | null
          readiness: string
          recovery_efficiency: number | null
          regime_suitability: string[] | null
          session_dependency: string | null
          sharpe_ratio: number | null
          sortino_ratio: number | null
          status: string
          strategy_id: string | null
          strategy_type: string
          tags: string[] | null
          timeframes: string[] | null
          updated_at: string
          user_id: string
          walk_forward_stability: number | null
          win_rate: number | null
        }
        Insert: {
          assets?: string[] | null
          backtest_count?: number | null
          cagr?: number | null
          created_at?: string
          description?: string | null
          execution_realism_score?: number | null
          expectancy?: number | null
          id?: string
          last_backtest_at?: string | null
          last_mc_at?: string | null
          last_wf_at?: string | null
          markets?: string[] | null
          max_drawdown?: number | null
          methodology?: string | null
          mmc_composite_score?: number | null
          name: string
          notes?: string | null
          oos_performance?: number | null
          parameter_robustness?: number | null
          profit_factor?: number | null
          readiness?: string
          recovery_efficiency?: number | null
          regime_suitability?: string[] | null
          session_dependency?: string | null
          sharpe_ratio?: number | null
          sortino_ratio?: number | null
          status?: string
          strategy_id?: string | null
          strategy_type?: string
          tags?: string[] | null
          timeframes?: string[] | null
          updated_at?: string
          user_id: string
          walk_forward_stability?: number | null
          win_rate?: number | null
        }
        Update: {
          assets?: string[] | null
          backtest_count?: number | null
          cagr?: number | null
          created_at?: string
          description?: string | null
          execution_realism_score?: number | null
          expectancy?: number | null
          id?: string
          last_backtest_at?: string | null
          last_mc_at?: string | null
          last_wf_at?: string | null
          markets?: string[] | null
          max_drawdown?: number | null
          methodology?: string | null
          mmc_composite_score?: number | null
          name?: string
          notes?: string | null
          oos_performance?: number | null
          parameter_robustness?: number | null
          profit_factor?: number | null
          readiness?: string
          recovery_efficiency?: number | null
          regime_suitability?: string[] | null
          session_dependency?: string | null
          sharpe_ratio?: number | null
          sortino_ratio?: number | null
          status?: string
          strategy_id?: string | null
          strategy_type?: string
          tags?: string[] | null
          timeframes?: string[] | null
          updated_at?: string
          user_id?: string
          walk_forward_stability?: number | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_intelligence_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_ratings: {
        Row: {
          created_at: string
          id: string
          is_helpful_count: number | null
          marketplace_strategy_id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_helpful_count?: number | null
          marketplace_strategy_id: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_helpful_count?: number | null
          marketplace_strategy_id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_ratings_marketplace_strategy_id_fkey"
            columns: ["marketplace_strategy_id"]
            isOneToOne: false
            referencedRelation: "marketplace_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_ratings_marketplace_strategy_id_fkey"
            columns: ["marketplace_strategy_id"]
            isOneToOne: false
            referencedRelation: "marketplace_strategies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_regime_compat: {
        Row: {
          computed_at: string
          deployable: boolean
          expectancy: number
          id: string
          max_drawdown: number
          regime: string
          strategy_id: string
          trade_count: number
          user_id: string
          win_rate: number
        }
        Insert: {
          computed_at?: string
          deployable?: boolean
          expectancy?: number
          id?: string
          max_drawdown?: number
          regime: string
          strategy_id: string
          trade_count?: number
          user_id: string
          win_rate?: number
        }
        Update: {
          computed_at?: string
          deployable?: boolean
          expectancy?: number
          id?: string
          max_drawdown?: number
          regime?: string
          strategy_id?: string
          trade_count?: number
          user_id?: string
          win_rate?: number
        }
        Relationships: []
      }
      strategy_regime_snapshots: {
        Row: {
          asset_symbol: string
          confidence_score: number | null
          created_at: string
          detected_at: string
          id: string
          indicator_payload: Json | null
          regime_label: string
          timeframe: string
          trend_state: string | null
          volatility_state: string | null
        }
        Insert: {
          asset_symbol: string
          confidence_score?: number | null
          created_at?: string
          detected_at?: string
          id?: string
          indicator_payload?: Json | null
          regime_label: string
          timeframe: string
          trend_state?: string | null
          volatility_state?: string | null
        }
        Update: {
          asset_symbol?: string
          confidence_score?: number | null
          created_at?: string
          detected_at?: string
          id?: string
          indicator_payload?: Json | null
          regime_label?: string
          timeframe?: string
          trend_state?: string | null
          volatility_state?: string | null
        }
        Relationships: []
      }
      strategy_replacement_events: {
        Row: {
          account_id: string | null
          action_status: string
          created_at: string
          id: string
          new_rank: number | null
          new_score: number | null
          new_strategy_id: string
          old_rank: number | null
          old_score: number | null
          old_strategy_id: string
          portfolio_id: string
          replaced_at: string | null
          trigger_payload: Json | null
          trigger_type: string
        }
        Insert: {
          account_id?: string | null
          action_status?: string
          created_at?: string
          id?: string
          new_rank?: number | null
          new_score?: number | null
          new_strategy_id: string
          old_rank?: number | null
          old_score?: number | null
          old_strategy_id: string
          portfolio_id: string
          replaced_at?: string | null
          trigger_payload?: Json | null
          trigger_type: string
        }
        Update: {
          account_id?: string | null
          action_status?: string
          created_at?: string
          id?: string
          new_rank?: number | null
          new_score?: number | null
          new_strategy_id?: string
          old_rank?: number | null
          old_score?: number | null
          old_strategy_id?: string
          portfolio_id?: string
          replaced_at?: string | null
          trigger_payload?: Json | null
          trigger_type?: string
        }
        Relationships: []
      }
      strategy_scores: {
        Row: {
          created_at: string
          cycle_id: string
          id: string
          notes: string | null
          rank: number
          robust_score: number
          strategy_version_id: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          id?: string
          notes?: string | null
          rank: number
          robust_score: number
          strategy_version_id: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          id?: string
          notes?: string | null
          rank?: number
          robust_score?: number
          strategy_version_id?: string
          symbol?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_scores_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "rotation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_scores_strategy_version_id_fkey"
            columns: ["strategy_version_id"]
            isOneToOne: false
            referencedRelation: "strategy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_selection_decisions: {
        Row: {
          correlation_score: number | null
          created_at: string
          decision: string
          execution_realism_score: number | null
          id: string
          mmc_score: number | null
          notes: string | null
          rank_at_time: number | null
          regime_fit_score: number | null
          rejection_reasons: Json | null
          selection_reasons: Json | null
          selection_run_id: string
          strategy_id: string
        }
        Insert: {
          correlation_score?: number | null
          created_at?: string
          decision: string
          execution_realism_score?: number | null
          id?: string
          mmc_score?: number | null
          notes?: string | null
          rank_at_time?: number | null
          regime_fit_score?: number | null
          rejection_reasons?: Json | null
          selection_reasons?: Json | null
          selection_run_id: string
          strategy_id: string
        }
        Update: {
          correlation_score?: number | null
          created_at?: string
          decision?: string
          execution_realism_score?: number | null
          id?: string
          mmc_score?: number | null
          notes?: string | null
          rank_at_time?: number | null
          regime_fit_score?: number | null
          rejection_reasons?: Json | null
          selection_reasons?: Json | null
          selection_run_id?: string
          strategy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_selection_decisions_selection_run_id_fkey"
            columns: ["selection_run_id"]
            isOneToOne: false
            referencedRelation: "strategy_selection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_selection_runs: {
        Row: {
          challenge_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          filters_payload: Json | null
          id: string
          input_payload: Json | null
          portfolio_id: string | null
          rejected_count: number | null
          run_type: string
          selected_count: number | null
          selection_version: string | null
          started_at: string | null
          status: string
          total_candidates: number | null
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          filters_payload?: Json | null
          id?: string
          input_payload?: Json | null
          portfolio_id?: string | null
          rejected_count?: number | null
          run_type?: string
          selected_count?: number | null
          selection_version?: string | null
          started_at?: string | null
          status?: string
          total_candidates?: number | null
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          filters_payload?: Json | null
          id?: string
          input_payload?: Json | null
          portfolio_id?: string | null
          rejected_count?: number | null
          run_type?: string
          selected_count?: number | null
          selection_version?: string | null
          started_at?: string | null
          status?: string
          total_candidates?: number | null
        }
        Relationships: []
      }
      strategy_tags: {
        Row: {
          created_at: string | null
          id: string
          strategy_id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          strategy_id: string
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: string
          strategy_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_tags_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_versions: {
        Row: {
          artifact_path: string | null
          artifact_type: string
          change_summary: string | null
          changelog: string | null
          code: string | null
          created_at: string
          id: string
          notes: string | null
          parameters: Json | null
          sha256: string | null
          strategy_id: string
          user_id: string
          version: string
        }
        Insert: {
          artifact_path?: string | null
          artifact_type?: string
          change_summary?: string | null
          changelog?: string | null
          code?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          parameters?: Json | null
          sha256?: string | null
          strategy_id: string
          user_id: string
          version: string
        }
        Update: {
          artifact_path?: string | null
          artifact_type?: string
          change_summary?: string | null
          changelog?: string | null
          code?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          parameters?: Json | null
          sha256?: string | null
          strategy_id?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_versions_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          month_reset_at: string | null
          plan: string
          started_at: string | null
          status: string
          trade_count_this_month: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          month_reset_at?: string | null
          plan?: string
          started_at?: string | null
          status?: string
          trade_count_this_month?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          month_reset_at?: string | null
          plan?: string
          started_at?: string | null
          status?: string
          trade_count_this_month?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      symbol_metadata: {
        Row: {
          asset_class: string
          base_currency: string | null
          broker_mappings: Json | null
          contract_multiplier: number
          created_at: string
          display_name: string
          exchange: string | null
          id: string
          leverage_style: string | null
          lot_step: number
          max_quantity: number | null
          min_quantity: number
          price_precision: number
          quantity_precision: number
          quote_currency: string
          session_close: string | null
          session_open: string | null
          status: string
          symbol: string
          tick_size: number
          trading_timezone: string
        }
        Insert: {
          asset_class?: string
          base_currency?: string | null
          broker_mappings?: Json | null
          contract_multiplier?: number
          created_at?: string
          display_name: string
          exchange?: string | null
          id?: string
          leverage_style?: string | null
          lot_step?: number
          max_quantity?: number | null
          min_quantity?: number
          price_precision?: number
          quantity_precision?: number
          quote_currency?: string
          session_close?: string | null
          session_open?: string | null
          status?: string
          symbol: string
          tick_size?: number
          trading_timezone?: string
        }
        Update: {
          asset_class?: string
          base_currency?: string | null
          broker_mappings?: Json | null
          contract_multiplier?: number
          created_at?: string
          display_name?: string
          exchange?: string | null
          id?: string
          leverage_style?: string | null
          lot_step?: number
          max_quantity?: number | null
          min_quantity?: number
          price_precision?: number
          quantity_precision?: number
          quote_currency?: string
          session_close?: string | null
          session_open?: string | null
          status?: string
          symbol?: string
          tick_size?: number
          trading_timezone?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          approved: boolean
          content: string
          created_at: string
          id: string
          stats_text: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean
          content: string
          created_at?: string
          id?: string
          stats_text?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean
          content?: string
          created_at?: string
          id?: string
          stats_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trade_alerts: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_read: boolean | null
          last_triggered_at: string | null
          last_triggered_day: string | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          message: string | null
          metadata: Json | null
          severity: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          last_triggered_at?: string | null
          last_triggered_day?: string | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          message?: string | null
          metadata?: Json | null
          severity?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          last_triggered_at?: string | null
          last_triggered_day?: string | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          message?: string | null
          metadata?: Json | null
          severity?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_screenshots: {
        Row: {
          caption: string | null
          created_at: string
          file_size: number | null
          id: string
          storage_path: string
          trade_id: string
          type: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          storage_path: string
          trade_id: string
          type: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          storage_path?: string
          trade_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_screenshots_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string | null
          broker_trade_id: string | null
          created_at: string
          direction: string
          emotions: string[] | null
          entry_price: number
          entry_time: string
          exit_price: number | null
          exit_time: string | null
          fees: number | null
          grade_details: Json | null
          id: string
          import_source: string | null
          lot_size: number | null
          metadata: Json | null
          mindset_rating: number | null
          net_pnl: number | null
          notes: string | null
          pnl: number | null
          pnl_pips: number | null
          quality_score: number | null
          quantity: number
          r_multiple: number | null
          risk_reward: number | null
          session_tag: string | null
          setup_type: string | null
          status: string
          stop_loss: number | null
          strategy_tag: string | null
          symbol: string
          tags: string[] | null
          take_profit: number | null
          timeframe: string | null
          trade_grade: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          broker_trade_id?: string | null
          created_at?: string
          direction: string
          emotions?: string[] | null
          entry_price: number
          entry_time: string
          exit_price?: number | null
          exit_time?: string | null
          fees?: number | null
          grade_details?: Json | null
          id?: string
          import_source?: string | null
          lot_size?: number | null
          metadata?: Json | null
          mindset_rating?: number | null
          net_pnl?: number | null
          notes?: string | null
          pnl?: number | null
          pnl_pips?: number | null
          quality_score?: number | null
          quantity?: number
          r_multiple?: number | null
          risk_reward?: number | null
          session_tag?: string | null
          setup_type?: string | null
          status?: string
          stop_loss?: number | null
          strategy_tag?: string | null
          symbol: string
          tags?: string[] | null
          take_profit?: number | null
          timeframe?: string | null
          trade_grade?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          broker_trade_id?: string | null
          created_at?: string
          direction?: string
          emotions?: string[] | null
          entry_price?: number
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          fees?: number | null
          grade_details?: Json | null
          id?: string
          import_source?: string | null
          lot_size?: number | null
          metadata?: Json | null
          mindset_rating?: number | null
          net_pnl?: number | null
          notes?: string | null
          pnl?: number | null
          pnl_pips?: number | null
          quality_score?: number | null
          quantity?: number
          r_multiple?: number | null
          risk_reward?: number | null
          session_tag?: string | null
          setup_type?: string | null
          status?: string
          stop_loss?: number | null
          strategy_tag?: string | null
          symbol?: string
          tags?: string[] | null
          take_profit?: number | null
          timeframe?: string | null
          trade_grade?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "broker_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          progress: number
          unlocked: boolean
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          progress?: number
          unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          progress?: number
          unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_playbook_patterns: {
        Row: {
          created_at: string
          expectancy: number | null
          filters: Json
          id: string
          is_saved: boolean
          notify_on_match: boolean
          pattern_key: string
          pattern_name: string
          pattern_type: string
          sample_size: number | null
          updated_at: string
          user_id: string
          win_rate: number | null
        }
        Insert: {
          created_at?: string
          expectancy?: number | null
          filters?: Json
          id?: string
          is_saved?: boolean
          notify_on_match?: boolean
          pattern_key: string
          pattern_name: string
          pattern_type?: string
          sample_size?: number | null
          updated_at?: string
          user_id: string
          win_rate?: number | null
        }
        Update: {
          created_at?: string
          expectancy?: number | null
          filters?: Json
          id?: string
          is_saved?: boolean
          notify_on_match?: boolean
          pattern_key?: string
          pattern_name?: string
          pattern_type?: string
          sample_size?: number | null
          updated_at?: string
          user_id?: string
          win_rate?: number | null
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
      walk_forward_runs: {
        Row: {
          config: Json
          created_at: string
          dataset_id: string | null
          diagnostics: Json | null
          id: string
          status: string
          strategy_id: string | null
          user_id: string
          windows: Json | null
        }
        Insert: {
          config?: Json
          created_at?: string
          dataset_id?: string | null
          diagnostics?: Json | null
          id?: string
          status?: string
          strategy_id?: string | null
          user_id: string
          windows?: Json | null
        }
        Update: {
          config?: Json
          created_at?: string
          dataset_id?: string | null
          diagnostics?: Json | null
          id?: string
          status?: string
          strategy_id?: string | null
          user_id?: string
          windows?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "walk_forward_runs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_forward_runs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_activity_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          email_hash: string | null
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token_hash: string
          used_at: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          email_hash?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token_hash: string
          used_at?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          email_hash?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token_hash?: string
          used_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_settings_safe: {
        Row: {
          id: string | null
          key: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      broker_connections_safe: {
        Row: {
          account_id: string | null
          broker_type: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          last_sync_at: string | null
          metadata: Json | null
          status: string | null
          token_expiry: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          broker_type?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          status?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          broker_type?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          status?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      marketplace_strategies_public: {
        Row: {
          author_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          id: string | null
          is_featured: boolean | null
          is_free: boolean | null
          is_verified: boolean | null
          preview_image_url: string | null
          price: number | null
          rating_avg: number | null
          rating_count: number | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          id?: string | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_verified?: boolean | null
          preview_image_url?: string | null
          price?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          id?: string | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_verified?: boolean | null
          preview_image_url?: string | null
          price?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_edit_workspace: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      create_workspace_invite: {
        Args: {
          p_email: string
          p_role?: Database["public"]["Enums"]["workspace_role"]
          p_workspace_id: string
        }
        Returns: Json
      }
      get_broker_access_token: {
        Args: { p_broker_type: string; p_user_id: string }
        Returns: string
      }
      get_broker_access_token_secure: {
        Args: { p_broker_type: string; p_user_id: string }
        Returns: string
      }
      get_broker_credentials: {
        Args: { p_broker_connection_id: string }
        Returns: Json
      }
      get_daily_ai_usage: {
        Args: { _feature: string; _user_id: string }
        Returns: number
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
      has_active_trial: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_dataset_usage: {
        Args: { p_dataset_id: string }
        Returns: undefined
      }
      increment_strategy_usage: {
        Args: { p_strategy_id: string }
        Returns: undefined
      }
      is_premium_user: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      list_workspace_invites: {
        Args: { p_workspace_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          redacted_email: string
          role: Database["public"]["Enums"]["workspace_role"]
          used_at: string
        }[]
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_after_data?: Json
          p_before_data?: Json
          p_entity_id?: string
          p_entity_type: string
          p_reason?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: { p_event_type: string; p_metadata?: Json; p_user_id: string }
        Returns: undefined
      }
      redact_email: { Args: { email: string }; Returns: string }
      redeem_workspace_invite: { Args: { p_token: string }; Returns: Json }
      revoke_broker_credentials: {
        Args: { p_broker_connection_id: string }
        Returns: boolean
      }
      rotate_broker_credentials: {
        Args: {
          p_broker_connection_id: string
          p_new_access_token?: string
          p_new_api_key?: string
          p_new_refresh_token?: string
        }
        Returns: boolean
      }
      store_broker_credentials: {
        Args: {
          p_access_token?: string
          p_api_key?: string
          p_broker_connection_id: string
          p_refresh_token?: string
        }
        Returns: boolean
      }
      verify_invite_token: { Args: { p_token: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user" | "premium"
      workspace_role: "owner" | "admin" | "editor" | "viewer"
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
      app_role: ["admin", "user", "premium"],
      workspace_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
