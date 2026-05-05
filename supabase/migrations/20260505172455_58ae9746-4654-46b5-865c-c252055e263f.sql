-- Garantir que a tabela tenha uma restrição de unicidade para o upsert funcionar corretamente
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'recently_viewed_products_user_id_product_id_key'
    ) THEN
        ALTER TABLE public.recently_viewed_products 
        ADD CONSTRAINT recently_viewed_products_user_id_product_id_key 
        UNIQUE (user_id, product_id);
    END IF;
END $$;

-- Função para limitar o número de itens por usuário
CREATE OR REPLACE FUNCTION public.limit_recently_viewed_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove os itens que excederem o limite de 100 por usuário
    DELETE FROM public.recently_viewed_products
    WHERE id IN (
        SELECT id
        FROM public.recently_viewed_products
        WHERE user_id = NEW.user_id
        ORDER BY viewed_at DESC
        OFFSET 100
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar a limpeza após cada inserção ou atualização
DROP TRIGGER IF EXISTS trigger_limit_recently_viewed ON public.recently_viewed_products;
CREATE TRIGGER trigger_limit_recently_viewed
AFTER INSERT OR UPDATE ON public.recently_viewed_products
FOR EACH ROW
EXECUTE FUNCTION public.limit_recently_viewed_items();

-- Garantir índice para performance nas consultas e ordenação
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed_at 
ON public.recently_viewed_products (user_id, viewed_at DESC);