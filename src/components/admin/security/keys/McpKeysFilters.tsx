/**
 * Barra de filtros + contadores da tela de chaves MCP.
 */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ShieldAlert } from "lucide-react";
import type { StatusFilter, SortKey } from "./useMcpKeys";

interface Props {
  search: string;
  status: StatusFilter;
  onlyFull: boolean;
  sort: SortKey;
  counts: { total: number; active: number; expired: number; revoked: number; full: number };
  onChange: (patch: Partial<{ search: string; status: StatusFilter; onlyFull: boolean; sort: SortKey }>) => void;
}

export function McpKeysFilters({ search, status, onlyFull, sort, counts, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">Total: <strong>{counts.total}</strong></Badge>
        <Badge variant="outline" className="gap-1 text-success border-success/30">Ativas: <strong>{counts.active}</strong></Badge>
        <Badge variant="outline" className="gap-1">Expiradas: <strong>{counts.expired}</strong></Badge>
        <Badge variant="outline" className="gap-1">Revogadas: <strong>{counts.revoked}</strong></Badge>
        {counts.full > 0 && (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" /> FULL ativas: <strong>{counts.full}</strong>
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Buscar por nome, prefixo ou email do criador…"
            className="pl-8"
            aria-label="Buscar chaves"
          />
        </div>

        <Select value={status} onValueChange={(v) => onChange({ status: v as StatusFilter })}>
          <SelectTrigger className="w-[160px]" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="expired">Expiradas</SelectItem>
            <SelectItem value="revoked">Revogadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => onChange({ sort: v as SortKey })}>
          <SelectTrigger className="w-[200px]" aria-label="Ordenação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Mais recentes</SelectItem>
            <SelectItem value="expires_asc">Próximas a expirar</SelectItem>
            <SelectItem value="last_used_desc">Último uso</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={onlyFull ? "destructive" : "outline"}
          size="sm"
          onClick={() => onChange({ onlyFull: !onlyFull })}
          aria-pressed={onlyFull}
        >
          <ShieldAlert className="h-4 w-4 mr-1" /> Somente FULL
        </Button>
      </div>
    </div>
  );
}
