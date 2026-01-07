-- Tabela para rascunhos de mockup (auto-save híbrido)
CREATE TABLE public.mockup_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  draft_key VARCHAR(50) NOT NULL DEFAULT 'default',
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  technique_name TEXT,
  client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE SET NULL,
  client_name TEXT,
  personalization_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_data TEXT, -- base64 ou URL do logo
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, draft_key)
);

-- Enable RLS
ALTER TABLE public.mockup_drafts ENABLE ROW LEVEL SECURITY;

-- RLS policies - cada usuário só vê/edita seus próprios rascunhos
CREATE POLICY "Users can view their own mockup drafts"
ON public.mockup_drafts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mockup drafts"
ON public.mockup_drafts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mockup drafts"
ON public.mockup_drafts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mockup drafts"
ON public.mockup_drafts
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_mockup_drafts_updated_at
BEFORE UPDATE ON public.mockup_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para busca rápida
CREATE INDEX idx_mockup_drafts_user ON public.mockup_drafts(user_id, draft_key);