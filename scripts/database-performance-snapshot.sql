-- scripts/database-performance-snapshot.sql
-- Weekly performance snapshot and EXPLAIN analysis
-- Should be run via a cron job or admin dashboard

-- 1. Identify slow queries in the last week (requires pg_stat_statements)
SELECT 
    substring(query, 1, 100) as query_preview,
    calls,
    total_exec_time / 1000 as total_seconds,
    mean_exec_time as mean_ms,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- 2. Analyze table sizes and bloat
SELECT
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    pg_size_pretty(pg_relation_size(relid)) as data_size,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- 3. Check for missing indexes (high seq scan vs index scan)
SELECT 
    relname as table_name,
    seq_scan,
    idx_scan,
    n_live_tup as approx_rows
FROM pg_stat_user_tables
WHERE seq_scan > 1000 AND idx_scan < seq_scan
ORDER BY seq_scan DESC;

-- 4. EXPLAIN snapshot for top 5 most critical tables
-- (To be executed manually for specific queries in the application)
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM products WHERE id = '...';
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM quotes WHERE organization_id = '...';
