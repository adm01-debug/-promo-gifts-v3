import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecretsManager, type RotationHistoryEntry } from "@/hooks/useSecretsManager";
import { History } from "lucide-react";

interface Props {
  secretName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "há instantes";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const d = Math.floor(hr / 24);
  return `há ${d}d`;
}

export function RotationHistoryDialog({ secretName, open, onOpenChange }: Props) {
  const { getRotationHistory } = useSecretsManager();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<RotationHistoryEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getRotationHistory(secretName).then((data) => {
      if (cancelled) return;
      setEntries(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, secretName, getRotationHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de rotações
          </DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">{secretName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma rotação registrada para este secret ainda.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">
                      <div>{formatRelative(e.rotated_at)}</div>
                      <div className="text-muted-foreground">{formatDateTime(e.rotated_at)}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.previous_suffix ? `••••${e.previous_suffix}` : <span className="text-muted-foreground">(env / vazio)</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.new_suffix ? `••••${e.new_suffix}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.rotated_by_email ?? <span className="text-muted-foreground font-mono">{e.rotated_by?.slice(0, 8) ?? "—"}…</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
