/**
 * useCommercialAgenda — Hook para agenda comercial com lembretes de follow-up.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AgendaItem {
  id: string;
  quote_id: string;
  seller_id: string;
  reminder_type: string;
  scheduled_for: string;
  is_sent: boolean;
  is_completed: boolean;
  completed_at: string | null;
  title: string;
  notes: string | null;
  created_at: string;
}

export function useCommercialAgenda() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["commercial-agenda", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_reminders")
        .select("*")
        .eq("seller_id", user!.id)
        .order("scheduled_for", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as AgendaItem[];
    },
    enabled: !!user?.id,
  });

  const createReminder = useMutation({
    mutationFn: async (input: {
      title: string;
      scheduled_for: string;
      reminder_type?: string;
      notes?: string;
      quote_id?: string;
    }) => {
      const { error } = await supabase.from("follow_up_reminders").insert({
        seller_id: user!.id,
        title: input.title,
        scheduled_for: input.scheduled_for,
        reminder_type: input.reminder_type || "manual",
        notes: input.notes || null,
        quote_id: input.quote_id || "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commercial-agenda"] });
      toast.success("Lembrete criado!");
    },
    onError: () => toast.error("Erro ao criar lembrete"),
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("follow_up_reminders")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .eq("seller_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commercial-agenda"] });
    },
    onError: () => toast.error("Erro ao atualizar lembrete"),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_up_reminders")
        .delete()
        .eq("id", id)
        .eq("seller_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commercial-agenda"] });
      toast.success("Lembrete removido");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const items = query.data || [];
  const today = new Date().toISOString().split("T")[0];

  const pending = items.filter((i) => !i.is_completed);
  const overdue = pending.filter((i) => i.scheduled_for < today);
  const todayItems = pending.filter((i) => i.scheduled_for.startsWith(today));
  const upcoming = pending.filter(
    (i) => i.scheduled_for > today
  );
  const completed = items.filter((i) => i.is_completed);

  return {
    items,
    pending,
    overdue,
    todayItems,
    upcoming,
    completed,
    isLoading: query.isLoading,
    createReminder,
    toggleComplete,
    deleteReminder,
    refetch: query.refetch,
  };
}
