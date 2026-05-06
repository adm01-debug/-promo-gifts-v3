-- Add control columns to collections if they don't exist
DO $$ BEGIN
    ALTER TABLE public.collections ADD COLUMN is_deleted BOOLEAN DEFAULT false NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.collections ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Ensure collection_items has added_at
DO $$ BEGIN
    ALTER TABLE public.collection_items ADD COLUMN added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Favorites Table (Atomic creation)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL,
    variant_info JSONB,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
    CREATE POLICY "Users can manage their own favorites"
    ON public.favorites
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS favorites_updated_at ON public.favorites;
CREATE TRIGGER favorites_updated_at BEFORE UPDATE ON public.favorites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS collections_updated_at ON public.collections;
CREATE TRIGGER collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
