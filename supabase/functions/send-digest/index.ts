import { createClient } from "npm:@supabase/supabase-js@2.49.4";

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch all users with unread notifications in the last 24h
    const { data: unreadNotifs, error } = await supabase
      .from('workspace_notifications')
      .select('user_id, title, message, category, created_at')
      .eq('is_read', false)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    if (!unreadNotifs || unreadNotifs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, digests_sent: 0, message: 'No unread notifications' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Group by user
    const byUser = new Map<string, typeof unreadNotifs>();
    for (const notif of unreadNotifs) {
      const list = byUser.get(notif.user_id) || [];
      list.push(notif);
      byUser.set(notif.user_id, list);
    }

    // For each user with 3+ unread, log digest info (email sending requires RESEND_API_KEY)
    const results = [];
    for (const [userId, notifs] of byUser) {
      if (notifs.length < 3) continue;

      // Group by category
      const byCategory: Record<string, typeof notifs> = {};
      for (const n of notifs) {
        const cat = n.category || 'system';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(n);
      }

      console.log(`Digest for user ${userId}: ${notifs.length} unread notifications`);
      results.push({ user_id: userId, count: notifs.length, categories: Object.keys(byCategory) });
    }

    return new Response(
      JSON.stringify({ success: true, digests_prepared: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Digest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
