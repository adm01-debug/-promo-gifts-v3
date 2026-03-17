
-- Tokens for public quote approval links
CREATE TABLE public.quote_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  client_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response TEXT,
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_approval_tokens ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own tokens
CREATE POLICY "Users can manage own approval tokens"
  ON public.quote_approval_tokens FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Anon users can read tokens by token value (for public page)
CREATE POLICY "Anyone can read by token"
  ON public.quote_approval_tokens FOR SELECT
  TO anon
  USING (true);

-- Anon users can update response fields
CREATE POLICY "Anyone can update response"
  ON public.quote_approval_tokens FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_approval_tokens_token ON public.quote_approval_tokens(token);
CREATE INDEX idx_approval_tokens_quote ON public.quote_approval_tokens(quote_id);

-- Follow-up reminders for expiring quotes
CREATE TABLE public.follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'expiring',
  scheduled_for TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders"
  ON public.follow_up_reminders FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE INDEX idx_follow_up_pending ON public.follow_up_reminders(is_sent, scheduled_for);
