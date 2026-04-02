-- Create scheduled reports table
CREATE TABLE public.scheduled_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'sales',
  frequency text NOT NULL DEFAULT 'weekly',
  email_to text NOT NULL,
  report_name text NOT NULL DEFAULT 'Relatório',
  filters jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT valid_report_type CHECK (report_type IN ('sales', 'quotes', 'clients', 'products', 'orders'))
);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scheduled reports"
  ON public.scheduled_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scheduled reports"
  ON public.scheduled_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled reports"
  ON public.scheduled_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled reports"
  ON public.scheduled_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Index for cron job lookups
CREATE INDEX idx_scheduled_reports_next_run ON public.scheduled_reports(next_run_at) WHERE is_active = true;