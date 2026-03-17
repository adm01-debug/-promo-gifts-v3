
-- Table for user saved filter presets
CREATE TABLE public.saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  context TEXT NOT NULL DEFAULT 'catalog',
  is_default BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own filters"
  ON public.saved_filters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own filters"
  ON public.saved_filters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own filters"
  ON public.saved_filters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own filters"
  ON public.saved_filters FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_saved_filters_user_context ON public.saved_filters(user_id, context);
