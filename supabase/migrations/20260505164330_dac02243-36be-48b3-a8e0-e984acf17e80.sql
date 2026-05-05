-- Tabela para persistência do histórico de vistos recentemente
CREATE TABLE IF NOT EXISTS public.recently_viewed_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id)
);

-- Habilitar RLS
ALTER TABLE public.recently_viewed_products ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view their own recently viewed products"
ON public.recently_viewed_products
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recently viewed products"
ON public.recently_viewed_products
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recently viewed products"
ON public.recently_viewed_products
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recently viewed products"
ON public.recently_viewed_products
FOR UPDATE
USING (auth.uid() = user_id);

-- Função para garantir limite de N produtos por usuário
CREATE OR REPLACE FUNCTION public.limit_recently_viewed_products()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove os itens mais antigos se passar de 50
    DELETE FROM public.recently_viewed_products
    WHERE id IN (
        SELECT id
        FROM public.recently_viewed_products
        WHERE user_id = NEW.user_id
        ORDER BY viewed_at DESC
        OFFSET 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para aplicar o limite após inserção
CREATE TRIGGER trigger_limit_recently_viewed_products
AFTER INSERT ON public.recently_viewed_products
FOR EACH ROW
EXECUTE FUNCTION public.limit_recently_viewed_products();

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_at ON public.recently_viewed_products (user_id, viewed_at DESC);
