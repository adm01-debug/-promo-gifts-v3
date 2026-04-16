-- ========== mockup_templates ==========
CREATE TABLE IF NOT EXISTS public.mockup_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_id TEXT,
  product_name TEXT,
  technique_id TEXT,
  technique_name TEXT,
  personalization_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mockup_templates_user ON public.mockup_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_mockup_templates_product ON public.mockup_templates(product_id);

ALTER TABLE public.mockup_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mockup templates"
  ON public.mockup_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own mockup templates"
  ON public.mockup_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own mockup templates"
  ON public.mockup_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own mockup templates"
  ON public.mockup_templates FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_mockup_templates_updated_at
  BEFORE UPDATE ON public.mockup_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== art_file_attachments ==========
CREATE TABLE IF NOT EXISTS public.art_file_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mockup_id UUID,
  quote_id UUID,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  file_extension TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_art_files_user ON public.art_file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_art_files_mockup ON public.art_file_attachments(mockup_id);
CREATE INDEX IF NOT EXISTS idx_art_files_quote ON public.art_file_attachments(quote_id);

ALTER TABLE public.art_file_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own art files"
  ON public.art_file_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own art files"
  ON public.art_file_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own art files"
  ON public.art_file_attachments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own art files"
  ON public.art_file_attachments FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_art_files_updated_at
  BEFORE UPDATE ON public.art_file_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== Storage bucket para arquivos vetoriais ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('mockup-art-files', 'mockup-art-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view own art files in storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own art files to storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own art files in storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own art files in storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);