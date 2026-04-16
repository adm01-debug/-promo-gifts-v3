/**
 * useFollowUpReminders — CRUD de lembretes de follow-up de orçamentos.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FollowUpReminder {
  id: string;
  quote_id: string;
  seller_id: string;
  scheduled_for: string;
  reminder_type: string;
  title: string | null;
  notes: string | null;
  is_completed: boolean;
  is_sent: boolean;
  completed_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export function useFollowUpReminders(quoteId?: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["follow-up-reminders", quoteId ?? "all"],
    queryFn: async (): Promise<FollowUpReminder[]> => {
      let q = supabase.from("follow_up_reminders").select("*").order("scheduled_for", { ascending: true });
      if (quoteId) q = q.eq("quote_id", quoteId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as FollowUpReminder[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Omit<FollowUpReminder, "id" | "created_at" | "is_completed" | "is_sent" | "completed_at" | "sent_at">) => {
      const { data, error } = await supabase.from("follow_up_reminders").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow-up-reminders"] });
      toast.success("Lembrete criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_up_reminders")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-up-reminders"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("follow_up_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-up-reminders"] }),
  });

  return { ...list, create, complete, remove };
}
