
-- mockup_drafts table for auto-save functionality
CREATE TABLE public.mockup_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_key text NOT NULL DEFAULT 'default',
  product_id text,
  product_name text,
  technique_id text,
  technique_name text,
  client_id text,
  client_name text,
  personalization_areas jsonb DEFAULT '[]'::jsonb,
  logo_data text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, draft_key)
);
ALTER TABLE public.mockup_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own drafts" ON public.mockup_drafts FOR ALL USING (user_id = auth.uid());

-- magic_up_generations table
CREATE TABLE public.magic_up_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text,
  scene_title text,
  scene_category text,
  client_name text,
  generated_image_url text,
  is_favorite boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.magic_up_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own generations" ON public.magic_up_generations FOR ALL USING (user_id = auth.uid());
