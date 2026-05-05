-- Add unique constraint for upsert
ALTER TABLE public.user_search_history 
ADD CONSTRAINT unique_user_query_type UNIQUE (user_id, query_text, history_type);
