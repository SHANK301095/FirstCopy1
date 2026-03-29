
-- =============================================
-- HEADLESS MT5 RUNNER INFRASTRUCTURE
-- Phase 1-4: Complete schema
-- =============================================

-- 1) mt5_runners: VPS runner machines
CREATE TABLE public.mt5_runners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  os TEXT NOT NULL DEFAULT 'windows',
  ip_hint TEXT,
  runner_key UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','error','disabled')),
  last_heartbeat_at TIMESTAMPTZ,
  last_seen_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mt5_runners ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mt5_runners_user ON public.mt5_runners(user_id);
CREATE INDEX idx_mt5_runners_status ON public.mt5_runners(status);

CREATE POLICY "Users can manage own runners" ON public.mt5_runners
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) mt5_terminals: MT5 instances per runner
CREATE TABLE public.mt5_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES public.mt5_runners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  terminal_path TEXT,
  portable_mode BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','running','error','restarting')),
  last_start_at TIMESTAMPTZ,
  last_error TEXT,
  restart_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mt5_terminals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mt5_terminals_runner ON public.mt5_terminals(runner_id);
CREATE INDEX idx_mt5_terminals_user ON public.mt5_terminals(user_id);

CREATE POLICY "Users can manage own terminals" ON public.mt5_terminals
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) ea_library: compiled EA binaries + metadata
CREATE TABLE public.ea_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  strategy_tags TEXT[] DEFAULT '{}',
  version TEXT NOT NULL DEFAULT '1.0.0',
  file_name TEXT NOT NULL,
  file_sha256 TEXT,
  storage_path TEXT NOT NULL,
  allowed_symbols TEXT[],
  allowed_timeframes TEXT[],
  risk_tier TEXT NOT NULL DEFAULT 'med' CHECK (risk_tier IN ('low','med','high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deprecated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ea_library ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ea_library_user ON public.ea_library(user_id);
CREATE INDEX idx_ea_library_status ON public.ea_library(status);

CREATE POLICY "Users can manage own EAs" ON public.ea_library
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) ea_presets: preset configs for EAs
CREATE TABLE public.ea_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ea_id UUID NOT NULL REFERENCES public.ea_library(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_name TEXT,
  template_storage_path TEXT,
  inputs_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ea_presets ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ea_presets_ea ON public.ea_presets(ea_id);
CREATE INDEX idx_ea_presets_user ON public.ea_presets(user_id);

CREATE POLICY "Users can manage own presets" ON public.ea_presets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) ea_runs: run instances
CREATE TABLE public.ea_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  connection_id UUID REFERENCES public.mt5_accounts(id),
  terminal_id UUID REFERENCES public.mt5_terminals(id),
  ea_id UUID NOT NULL REFERENCES public.ea_library(id),
  preset_id UUID REFERENCES public.ea_presets(id),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  slot INT NOT NULL DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'paper' CHECK (mode IN ('live','paper')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','starting','running','stopping','stopped','error')),
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  last_error TEXT,
  risk_limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ea_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ea_runs_user ON public.ea_runs(user_id);
CREATE INDEX idx_ea_runs_status ON public.ea_runs(status);
CREATE INDEX idx_ea_runs_terminal ON public.ea_runs(terminal_id);
CREATE INDEX idx_ea_runs_created ON public.ea_runs(created_at DESC);

CREATE POLICY "Users can manage own runs" ON public.ea_runs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6) ea_run_events: event log
CREATE TABLE public.ea_run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ea_runs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ea_run_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ea_run_events_run ON public.ea_run_events(run_id);
CREATE INDEX idx_ea_run_events_created ON public.ea_run_events(created_at DESC);

CREATE POLICY "Users can view own run events" ON public.ea_run_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ea_runs WHERE ea_runs.id = ea_run_events.run_id AND ea_runs.user_id = auth.uid()));

CREATE POLICY "System can insert run events" ON public.ea_run_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ea_runs WHERE ea_runs.id = ea_run_events.run_id AND ea_runs.user_id = auth.uid()));

-- 7) runner_heartbeats: telemetry
CREATE TABLE public.runner_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES public.mt5_runners(id) ON DELETE CASCADE,
  terminal_id UUID REFERENCES public.mt5_terminals(id),
  run_id UUID REFERENCES public.ea_runs(id),
  cpu FLOAT,
  ram FLOAT,
  disk_free FLOAT,
  mt5_alive BOOLEAN DEFAULT false,
  controller_alive BOOLEAN DEFAULT false,
  last_tick_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runner_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_runner_heartbeats_runner ON public.runner_heartbeats(runner_id);
CREATE INDEX idx_runner_heartbeats_created ON public.runner_heartbeats(created_at DESC);

CREATE POLICY "Users can view own heartbeats" ON public.runner_heartbeats
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mt5_runners WHERE mt5_runners.id = runner_heartbeats.runner_id AND mt5_runners.user_id = auth.uid()));

-- 8) runner_commands: command queue
CREATE TABLE public.runner_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES public.mt5_runners(id) ON DELETE CASCADE,
  terminal_id UUID REFERENCES public.mt5_terminals(id),
  command_type TEXT NOT NULL CHECK (command_type IN ('START_RUN','STOP_RUN','RESTART_MT5','APPLY_TEMPLATE','HEALTH_CHECK','PANIC_STOP')),
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','acked','done','error')),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runner_commands ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_runner_commands_runner_status ON public.runner_commands(runner_id, status);
CREATE INDEX idx_runner_commands_created ON public.runner_commands(created_at DESC);

CREATE POLICY "Users can view own commands" ON public.runner_commands
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mt5_runners WHERE mt5_runners.id = runner_commands.runner_id AND mt5_runners.user_id = auth.uid()));

CREATE POLICY "Users can create commands for own runners" ON public.runner_commands
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.mt5_runners WHERE mt5_runners.id = runner_commands.runner_id AND mt5_runners.user_id = auth.uid()));

-- Storage buckets for EA files
INSERT INTO storage.buckets (id, name, public) VALUES ('ea-binaries', 'ea-binaries', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('ea-templates', 'ea-templates', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('controller-binaries', 'controller-binaries', false);

-- Storage RLS: users can manage their own folder
CREATE POLICY "Users can upload own EA binaries" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ea-binaries' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own EA binaries" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ea-binaries' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own EA binaries" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ea-binaries' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own EA templates" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ea-templates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own EA templates" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ea-templates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own EA templates" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ea-templates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload controller binaries" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'controller-binaries' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read controller binaries" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'controller-binaries' AND (storage.foldername(name))[1] = auth.uid()::text);
