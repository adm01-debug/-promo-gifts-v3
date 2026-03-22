/**
 * Meus Kits Page
 * Lista kits salvos com ações de editar, duplicar e excluir
 * P1: Filtros avançados por status, tipo, preço
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Copy, Trash2, Pencil, Search, Loader2, FileText, Calendar, Layers, Filter, X, TrendingUp, Share2, GitCompare, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/kit-builder';
import { toast } from 'sonner';
import { useKitShare } from '@/hooks/useKitShare';
import { KitComparisonDialog } from '@/components/kit-builder/KitComparisonDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomKit {
  id: string;
  name: string;
  kit_type: string;
  status: string;
  box_data: any;
  items_data: any[];
  personalization_data: any;
  kit_quantity: number;
  box_price: number;
  items_price: number;
  personalization_price: number;
  total_price: number;
  volume_usage_percent: number;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  saved: { label: 'Salvo', variant: 'default' },
  complete: { label: 'Completo', variant: 'default' },
  quoted: { label: 'Orçado', variant: 'outline' },
};

const TYPE_MAP: Record<string, string> = {
  montado: 'Montado',
  original: 'Original',
  simples: 'Simples',
};

type SortOption = 'recent' | 'name' | 'price-asc' | 'price-desc';

export default function MeusKitsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const { generateShareLink, isLoading: shareLoading } = useKitShare();
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      else toast.error('Máximo 3 kits para comparação');
      return next;
    });
  };

  const { data: kits = [], isLoading } = useQuery({
    queryKey: ['custom-kits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_kits')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CustomKit[];
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_kits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kits'] });
      toast.success('Kit excluído com sucesso');
      setDeleteId(null);
    },
    onError: () => toast.error('Erro ao excluir kit'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (kit: CustomKit) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { id, created_at, updated_at, ...rest } = kit;
      const { error } = await supabase.from('custom_kits').insert({
        ...rest,
        user_id: user.id,
        name: `${kit.name} (cópia)`,
        status: 'draft',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kits'] });
      toast.success('Kit duplicado com sucesso');
    },
    onError: () => toast.error('Erro ao duplicar kit'),
  });

  const filtered = useMemo(() => {
    let result = kits;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(k => k.name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(k => k.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(k => k.kit_type === typeFilter);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        result = [...result].sort((a, b) => Number(a.total_price) - Number(b.total_price));
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => Number(b.total_price) - Number(a.total_price));
        break;
      case 'recent':
      default:
        // Already sorted by updated_at desc from query
        break;
    }

    return result;
  }, [kits, search, statusFilter, typeFilter, sortBy]);

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all';

  const getItemCount = (kit: CustomKit): number => {
    if (!Array.isArray(kit.items_data)) return 0;
    return kit.items_data.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  };

  const getBoxName = (kit: CustomKit): string => {
    if (!kit.box_data) return 'Sem caixa';
    return (kit.box_data as any).name || 'Caixa';
  };

  // Stats
  const totalValue = kits.reduce((sum, k) => sum + Number(k.total_price), 0);
  const draftCount = kits.filter(k => k.status === 'draft').length;

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Meus Kits
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {kits.length} kit{kits.length !== 1 ? 's' : ''} salvo{kits.length !== 1 ? 's' : ''}
            {draftCount > 0 && ` • ${draftCount} rascunho${draftCount > 1 ? 's' : ''}`}
            {totalValue > 0 && ` • ${formatCurrency(totalValue)} total`}
          </p>
        </div>
        <Button onClick={() => navigate('/montar-kit')} className="gap-2">
          <Plus className="h-4 w-4" />
          Montar Novo Kit
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar kits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="complete">Completo</SelectItem>
            <SelectItem value="saved">Salvo</SelectItem>
            <SelectItem value="quoted">Orçado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="montado">Montado</SelectItem>
            <SelectItem value="original">Original</SelectItem>
            <SelectItem value="simples">Simples</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="name">Nome A-Z</SelectItem>
            <SelectItem value="price-asc">Preço ↑</SelectItem>
            <SelectItem value="price-desc">Preço ↓</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">
              {search || hasActiveFilters ? 'Nenhum kit encontrado' : 'Nenhum kit salvo'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search || hasActiveFilters
                ? 'Ajuste os filtros para ver resultados.'
                : 'Monte seu primeiro kit para vê-lo aqui.'}
            </p>
            {!search && !hasActiveFilters && (
              <Button onClick={() => navigate('/montar-kit')} className="gap-2">
                <Plus className="h-4 w-4" />
                Montar Kit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((kit) => {
            const statusInfo = STATUS_MAP[kit.status] || STATUS_MAP.draft;
            return (
              <Card key={kit.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Icon */}
                    <div className="hidden sm:flex w-14 h-14 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                      <Package className="h-7 w-7 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{kit.name}</h3>
                        <Badge variant={statusInfo.variant} className="text-[10px]">
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_MAP[kit.kit_type] || kit.kit_type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {getBoxName(kit)} • {getItemCount(kit)} ite{getItemCount(kit) === 1 ? 'm' : 'ns'}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {kit.kit_quantity} kit{kit.kit_quantity > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(kit.updated_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(Number(kit.total_price))}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatCurrency(Number(kit.total_price) / Math.max(kit.kit_quantity, 1))}/kit
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Compartilhar apresentação"
                        onClick={async () => {
                          const link = await generateShareLink(kit.id);
                          if (link) {
                            await navigator.clipboard.writeText(link);
                            toast.success("Link copiado para a área de transferência!");
                          }
                        }}
                        disabled={shareLoading}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => navigate(`/montar-kit?kit=${kit.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Duplicar"
                        disabled={duplicateMutation.isPending}
                        onClick={() => duplicateMutation.mutate(kit)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(kit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir kit?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O kit será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
