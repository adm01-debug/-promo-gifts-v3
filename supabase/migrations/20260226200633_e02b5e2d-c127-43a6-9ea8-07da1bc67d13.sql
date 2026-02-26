
-- Cart templates table for reusable cart configurations
CREATE TABLE public.cart_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart templates"
  ON public.cart_templates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cart templates"
  ON public.cart_templates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart templates"
  ON public.cart_templates FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart templates"
  ON public.cart_templates FOR DELETE USING (auth.uid() = user_id);
