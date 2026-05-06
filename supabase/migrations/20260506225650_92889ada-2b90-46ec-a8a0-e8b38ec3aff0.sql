CREATE OR REPLACE FUNCTION public.get_app_health_summary(_minutes integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_since timestamptz := now() - make_interval(mins => GREATEST(1, LEAST(_minutes, 1440)));
  v_kpis jsonb;
  v_routes jsonb;
  v_webhooks jsonb;
  v_edges jsonb;
  v_vitals jsonb;
BEGIN
  -- Authorization: admin or dev only
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- 1) KPIs globais
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'req_per_min', ROUND((COUNT(*)::numeric / GREATEST(1, _minutes))::numeric, 2),
    'pct_4xx', CASE WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND((COUNT(*) FILTER (WHERE http_status BETWEEN 400 AND 499))::numeric * 100.0 / COUNT(*), 2) END,
    'pct_5xx', CASE WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND((COUNT(*) FILTER (WHERE http_status >= 500))::numeric * 100.0 / COUNT(*), 2) END,
    'p95_ms', COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0),
    'p99_ms', COALESCE(percentile_disc(0.99) WITHIN GROUP (ORDER BY duration_ms), 0),
    'window_minutes', _minutes,
    'since', v_since
  )
  INTO v_kpis
  FROM public.webhook_delivery_metrics
  WHERE occurred_at >= v_since;

  -- 2) Top rotas por erro
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_routes
  FROM (
    SELECT
      endpoint,
      direction,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE http_status BETWEEN 400 AND 499) AS count_4xx,
      COUNT(*) FILTER (WHERE http_status >= 500) AS count_5xx,
      ROUND((COUNT(*) FILTER (WHERE http_status >= 400))::numeric * 100.0
            / NULLIF(COUNT(*),0), 2) AS error_rate_pct,
      MAX(occurred_at) FILTER (WHERE http_status >= 400) AS last_error_at
    FROM public.webhook_delivery_metrics
    WHERE occurred_at >= v_since
      AND endpoint IS NOT NULL
    GROUP BY endpoint, direction
    HAVING COUNT(*) FILTER (WHERE http_status >= 400) > 0
    ORDER BY (COUNT(*) FILTER (WHERE http_status >= 400)) DESC
    LIMIT 20
  ) r;

  -- 3) Webhooks por source
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_webhooks
  FROM (
    SELECT
      source,
      direction,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE NOT success) AS failures,
      ROUND((COUNT(*) FILTER (WHERE NOT success))::numeric * 100.0
            / NULLIF(COUNT(*),0), 2) AS failure_rate_pct,
      COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_ms,
      MAX(occurred_at) FILTER (WHERE NOT success) AS last_failure_at
    FROM public.webhook_delivery_metrics
    WHERE occurred_at >= v_since
    GROUP BY source, direction
    ORDER BY failures DESC, total DESC
    LIMIT 30
  ) r;

  -- 4) Edge functions por p95 latency
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_edges
  FROM (
    SELECT
      source AS edge_function,
      COUNT(*) AS total,
      COALESCE(percentile_disc(0.50) WITHIN GROUP (ORDER BY duration_ms), 0) AS p50_ms,
      COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_ms,
      COALESCE(percentile_disc(0.99) WITHIN GROUP (ORDER BY duration_ms), 0) AS p99_ms,
      ROUND(AVG(duration_ms)::numeric, 0) AS avg_ms,
      MAX(duration_ms) AS max_ms
    FROM public.webhook_delivery_metrics
    WHERE occurred_at >= v_since
    GROUP BY source
    ORDER BY p95_ms DESC NULLS LAST
    LIMIT 30
  ) r;

  -- 5) Core Web Vitals (P75 + breakdown)
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_vitals
  FROM (
    SELECT
      metric_name AS name,
      COUNT(*) AS total,
      COALESCE(percentile_disc(0.75) WITHIN GROUP (ORDER BY metric_value), 0) AS p75,
      COUNT(*) FILTER (WHERE rating = 'good') AS count_good,
      COUNT(*) FILTER (WHERE rating = 'needs-improvement') AS count_needs_improvement,
      COUNT(*) FILTER (WHERE rating = 'poor') AS count_poor,
      ROUND((COUNT(*) FILTER (WHERE rating = 'good'))::numeric * 100.0 / NULLIF(COUNT(*), 0), 1) AS good_pct
    FROM public.app_vitals
    WHERE created_at >= v_since
    GROUP BY metric_name
    ORDER BY metric_name ASC
  ) r;

  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'top_routes_by_error', v_routes,
    'webhooks_by_source', v_webhooks,
    'edges_by_latency', v_edges,
    'web_vitals', v_vitals
  );
END;
$function$;
