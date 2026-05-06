-- Partitioning admin_audit_log by created_at
BEGIN;

-- 1. Create the partitioned table
CREATE TABLE public.admin_audit_log_new (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    request_id TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    status TEXT,
    payload_summary JSONB,
    source TEXT,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 2. Create initial partitions
CREATE TABLE public.admin_audit_log_y2025m12 PARTITION OF public.admin_audit_log_new
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE public.admin_audit_log_y2026m01 PARTITION OF public.admin_audit_log_new
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE public.admin_audit_log_y2026m02 PARTITION OF public.admin_audit_log_new
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE public.admin_audit_log_y2026m03 PARTITION OF public.admin_audit_log_new
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE public.admin_audit_log_y2026m04 PARTITION OF public.admin_audit_log_new
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE public.admin_audit_log_y2026m05 PARTITION OF public.admin_audit_log_new
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE public.admin_audit_log_y2026m06 PARTITION OF public.admin_audit_log_new
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- 3. Copy data
INSERT INTO public.admin_audit_log_new SELECT * FROM public.admin_audit_log;

-- 4. Swap tables
ALTER TABLE public.admin_audit_log RENAME TO admin_audit_log_old;
ALTER TABLE public.admin_audit_log_new RENAME TO admin_audit_log;

-- 5. Restore RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" 
ON public.admin_audit_log 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- 6. Clean up (optional, keeping old table for safety for now)
-- DROP TABLE public.admin_audit_log_old;

COMMIT;
