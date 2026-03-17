
-- Create quote_comments table with thread support
CREATE TABLE public.quote_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.quote_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_comments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all comments (team collaboration)
CREATE POLICY "Authenticated users can read comments"
ON public.quote_comments
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments"
ON public.quote_comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.quote_comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete own comments, admins can delete any
CREATE POLICY "Users can delete own comments"
ON public.quote_comments
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_quote_comments_quote_id ON public.quote_comments(quote_id);
CREATE INDEX idx_quote_comments_parent_id ON public.quote_comments(parent_id);
CREATE INDEX idx_quote_comments_user_id ON public.quote_comments(user_id);
CREATE INDEX idx_quote_comments_created_at ON public.quote_comments(created_at DESC);
