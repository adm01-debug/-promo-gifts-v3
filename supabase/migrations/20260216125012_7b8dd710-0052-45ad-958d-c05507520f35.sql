
-- Create mockup_templates table for synced custom templates
CREATE TABLE public.mockup_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mockup_templates ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own templates
CREATE POLICY "Users can view own templates"
  ON public.mockup_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON public.mockup_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.mockup_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.mockup_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_mockup_templates_updated_at
  BEFORE UPDATE ON public.mockup_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add annotations column to generated_mockups
ALTER TABLE public.generated_mockups 
  ADD COLUMN annotations JSONB DEFAULT '[]'::jsonb;
