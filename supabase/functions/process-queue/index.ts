import { createClient } from "npm:@supabase/supabase-js@2.49.4";

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process follow-up reminders that are due
    const now = new Date().toISOString();
    const { data: dueReminders, error: fetchError } = await supabase
      .from('follow_up_reminders')
      .select('*')
      .lte('scheduled_for', now)
      .eq('is_sent', false)
      .limit(100);

    if (fetchError) throw fetchError;

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending reminders' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const reminder of dueReminders) {
      try {
        // Create a workspace notification for the seller
        const { error: notifError } = await supabase
          .from('workspace_notifications')
          .insert({
            user_id: reminder.seller_id,
            title: reminder.reminder_type === 'expiring' 
              ? '⏰ Orçamento expirando' 
              : '📋 Lembrete de follow-up',
            message: `Lembrete para acompanhar o orçamento ${reminder.quote_id}`,
            type: 'warning',
            category: 'reminders',
            action_url: `/orcamentos/${reminder.quote_id}`,
            metadata: { quote_id: reminder.quote_id, reminder_type: reminder.reminder_type },
          });

        if (notifError) throw notifError;

        // Mark reminder as sent
        await supabase
          .from('follow_up_reminders')
          .update({ is_sent: true, sent_at: now })
          .eq('id', reminder.id);

        results.push({ id: reminder.id, status: 'sent' });
      } catch (err) {
        console.error(`Error processing reminder ${reminder.id}:`, err);
        results.push({ id: reminder.id, status: 'error' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Queue processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
