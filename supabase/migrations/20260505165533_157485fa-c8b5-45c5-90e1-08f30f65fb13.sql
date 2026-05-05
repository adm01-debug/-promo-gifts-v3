-- Create user search history table
CREATE TABLE IF NOT EXISTS public.user_search_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    history_type TEXT NOT NULL DEFAULT 'general',
    result_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON public.user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_type ON public.user_search_history(history_type);
CREATE INDEX IF NOT EXISTS idx_user_search_history_pinned ON public.user_search_history(is_pinned);

-- Enable RLS
ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own search history"
ON public.user_search_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_search_history_updated_at
BEFORE UPDATE ON public.user_search_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to limit search history per user and type
CREATE OR REPLACE FUNCTION public.cleanup_user_search_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.user_search_history
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id,
                   row_number() OVER (
                       PARTITION BY user_id, history_type 
                       ORDER BY is_pinned DESC, created_at DESC
                   ) as rn
            FROM public.user_search_history
            WHERE user_id = NEW.user_id AND history_type = NEW.history_type
        ) s
        WHERE rn > 50 -- Keep top 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER limit_user_search_history
AFTER INSERT ON public.user_search_history
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_user_search_history();
