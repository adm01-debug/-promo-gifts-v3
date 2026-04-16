/**
 * CommercialAgendaPage — Agenda comercial com follow-ups e lembretes.
 */
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Plus, Check, Trash2, Clock, AlertTriangle,
  CheckCircle2, ArrowUpRight,
} from "lucide-react";
import { useCommercialAgenda } from "@/hooks/useCommercialAgenda";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CommercialAgendaPage() {
  const {
    overdue, todayItems, upcoming, completed,
    isLoading, createReminder, toggleComplete, deleteReminder,
  } = useCommercialAgenda();

  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newNotes, setNewNotes] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const handleCreate = () => {
    if (!newTitle.trim() || !newDate) return;
    createReminder.mutate({
      title: newTitle.trim(),
      scheduled_for: newDate.toISOString(),
      notes: newNotes.trim() || undefined,
    });
    setNewTitle("");
    setNewDate(undefined);
    setNewNotes("");
    setShowForm(false);
  };

  return (
    <MainLayout>
      <PageSEO title="Agenda Comercial" description="Gerencie follow-ups e lembretes." path="/agenda" noIndex />

      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              Agenda Comercial
            </h1>
            <p className="text-muted-foreground mt-1">
              {overdue.length > 0
                ? `⚠️ ${overdue.length} tarefa(s) atrasada(s)`
                : "Seus follow-ups e lembretes"}
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-2" />Novo Lembrete
          </Button>
        </div>

        {/* New reminder form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-primary/30">
                <CardContent className="pt-4 space-y-3">
                  <Input
                    placeholder="Título do lembrete..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-40", !newDate && "text-muted-foreground")}>
                          <CalendarDays className="h-3.5 w-3.5 mr-2" />
                          {newDate ? format(newDate, "dd/MM/yyyy") : "Data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newDate}
                          onSelect={setNewDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      placeholder="Notas (opcional)"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="flex-1 min-w-[200px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreate} disabled={!newTitle.trim() || !newDate || createReminder.isPending}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Criar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI row */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MiniKPI label="Atrasadas" value={overdue.length} icon={AlertTriangle} color="text-destructive bg-destructive/10" />
          <MiniKPI label="Hoje" value={todayItems.length} icon={Clock} color="text-warning bg-warning/10" />
          <MiniKPI label="Próximas" value={upcoming.length} icon={ArrowUpRight} color="text-primary bg-primary/10" />
          <MiniKPI label="Concluídas" value={completed.length} icon={CheckCircle2} color="text-success bg-success/10" />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {overdue.length > 0 && (
              <AgendaSection title="Atrasadas" items={overdue} variant="overdue" onToggle={toggleComplete.mutate} onDelete={deleteReminder.mutate} />
            )}
            {todayItems.length > 0 && (
              <AgendaSection title="Hoje" items={todayItems} variant="today" onToggle={toggleComplete.mutate} onDelete={deleteReminder.mutate} />
            )}
            {upcoming.length > 0 && (
              <AgendaSection title="Próximas" items={upcoming} variant="upcoming" onToggle={toggleComplete.mutate} onDelete={deleteReminder.mutate} />
            )}

            {overdue.length === 0 && todayItems.length === 0 && upcoming.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum lembrete pendente</p>
                  <p className="text-xs mt-1">Crie lembretes para acompanhar seus orçamentos</p>
                </CardContent>
              </Card>
            )}

            {completed.length > 0 && (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setShowCompleted(!showCompleted)} className="mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {showCompleted ? "Ocultar" : "Mostrar"} concluídas ({completed.length})
                </Button>
                {showCompleted && (
                  <AgendaSection title="" items={completed.slice(0, 20)} variant="completed" onToggle={toggleComplete.mutate} onDelete={deleteReminder.mutate} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function MiniKPI({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AgendaSection({ title, items, variant, onToggle, onDelete }: {
  title: string;
  items: Array<{ id: string; title: string; scheduled_for: string; notes: string | null; is_completed: boolean }>;
  variant: "overdue" | "today" | "upcoming" | "completed";
  onToggle: (args: { id: string; completed: boolean }) => void;
  onDelete: (id: string) => void;
}) {
  const borderColor = {
    overdue: "border-l-destructive",
    today: "border-l-warning",
    upcoming: "border-l-primary",
    completed: "border-l-success",
  }[variant];

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="px-2 pb-2 space-y-1">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg border-l-[3px] hover:bg-muted/50 transition-colors",
              borderColor,
              item.is_completed && "opacity-50"
            )}
          >
            <button
              onClick={() => onToggle({ id: item.id, completed: !item.is_completed })}
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                item.is_completed
                  ? "bg-success border-success text-success-foreground"
                  : "border-muted-foreground/40 hover:border-primary"
              )}
            >
              {item.is_completed && <Check className="h-3 w-3" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium truncate", item.is_completed && "line-through")}>
                {item.title || "Sem título"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(item.scheduled_for), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                </span>
                {item.notes && (
                  <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                    · {item.notes}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100 text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
