/**
 * FollowUpRemindersPanel — painel para criar e gerenciar lembretes de follow-up de um orçamento.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCircle2, Trash2, Clock } from "lucide-react";
import { useFollowUpReminders } from "@/hooks/useFollowUpReminders";
import { supabase } from "@/integrations/supabase/client";

interface FollowUpRemindersPanelProps {
  quoteId: string;
}

export function FollowUpRemindersPanel({ quoteId }: FollowUpRemindersPanelProps) {
  const { data, isLoading, create, complete, remove } = useFollowUpReminders(quoteId);
  const [scheduledFor, setScheduledFor] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async () => {
    if (!scheduledFor) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    create.mutate({
      quote_id: quoteId,
      seller_id: u.user.id,
      scheduled_for: new Date(scheduledFor).toISOString(),
      reminder_type: "manual",
      title: title || null,
      notes: notes || null,
    });
    setScheduledFor("");
    setTitle("");
    setNotes("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Lembretes de follow-up
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Data e hora</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Ligar para o cliente" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label>Notas (opcional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button onClick={submit} disabled={!scheduledFor || create.isPending} size="sm">
          Criar lembrete
        </Button>

        {isLoading ? (
          <Skeleton className="h-16" />
        ) : data?.length ? (
          <ul className="space-y-2">
            {data.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-2 text-sm"
              >
                <div>
                  <p className="font-medium inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {new Date(r.scheduled_for).toLocaleString("pt-BR")}
                  </p>
                  {r.title && <p className="text-muted-foreground">{r.title}</p>}
                </div>
                <div className="flex gap-1">
                  {!r.is_completed && (
                    <Button size="icon" variant="ghost" onClick={() => complete.mutate(r.id)} aria-label="Concluir">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)} aria-label="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sem lembretes ainda.</p>
        )}
      </CardContent>
    </Card>
  );
}
