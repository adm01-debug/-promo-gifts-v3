/**
 * Kit Library — Biblioteca unificada de kits do vendedor + sugeridos pelo sistema.
 * Substitui MeusKitsPage com 3 abas (Meus / Sugeridos / Favoritos).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Library, Sparkles, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { PageSEO } from '@/components/seo/PageSEO';
import { KitCard, type KitCardData } from '@/components/kit-library/KitCard';
import { useKitTemplates, type KitTemplateRow } from '@/hooks/useKitTemplates';
import type { CustomKitRow } from '@/hooks/useCustomKitPersistence';

function getItemsCount(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum: number, it: unknown) => {
    const obj = it as { quantity?: number };
    return sum + (obj.quantity || 1);
  }, 0);
}

export default function KitLibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'mine' | 'suggested' | 'favorites'>('mine');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Mine
  const { data: myKits = [], isLoading: loadingMine } = useQuery({
    queryKey: ['custom-kits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_kits')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CustomKitRow[];
    },
    enabled: !!user?.id,
  });

  // Suggested
  const { templates, isLoading: loadingTemplates, cloneTemplate, isCloning } = useKitTemplates();

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_kits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kits'] });
      toast.success('Kit excluído');
      setDeleteId(null);
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          update: (v: Record<string, unknown>) => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      }).from('custom_kits').update({ is_favorite: value }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-kits'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (kit: CustomKitRow) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { id, created_at, updated_at, ...rest } = kit;
      const { error } = await supabase.from('custom_kits').insert({
        ...rest, user_id: user.id, name: `${kit.name} (cópia)`, status: 'draft',
      } as unknown as Record<string, unknown>);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kits'] });
      toast.success('Kit duplicado');
    },
    onError: () => toast.error('Erro ao duplicar'),
  });

  // Filter
  const q = search.trim().toLowerCase();
  const matchKit = (k: CustomKitRow) =>
    !q || k.name.toLowerCase().includes(q) || (k.tag || '').toLowerCase().includes(q);
  const matchTpl = (t: KitTemplateRow) =>
    !q || t.name.toLowerCase().includes(q) || (t.tag || '').toLowerCase().includes(q) ||
    t.category.toLowerCase().includes(q);

  const filteredMine = useMemo(() => myKits.filter(matchKit), [myKits, q]);
  const filteredFavs = useMemo(() => myKits.filter(k => k.is_favorite && matchKit(k)), [myKits, q]);
  const filteredTpls = useMemo(() => templates.filter(matchTpl), [templates, q]);

  const toCard = (k: CustomKitRow): KitCardData => ({
    id: k.id, name: k.name, description: k.description, tag: k.tag,
    color: k.color || '#3B82F6', icon: k.icon || 'Package',
    totalPrice: Number(k.total_price), itemsCount: getItemsCount(k.items_data),
    isFavorite: k.is_favorite,
  });

  const tplToCard = (t: KitTemplateRow): KitCardData => ({
    id: t.id, name: t.name, description: t.description, tag: t.tag,
    color: t.color, icon: t.icon,
    totalPrice: Number(t.total_price), itemsCount: getItemsCount(t.items_data),
    badge: t.category,
  });

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
      <PageSEO title="Biblioteca de Kits" description="Seus kits salvos e templates sugeridos pelo sistema." path="/meus-kits" noIndex />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <Library className="h-7 w-7 text-primary" />
            Biblioteca de Kits
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesse seus kits salvos ou clone um template do sistema para acelerar sua rotina.
          </p>
        </div>
        <Button onClick={() => navigate('/montar-kit')} className="gap-2">
          <Plus className="h-4 w-4" /> Montar novo kit
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, etiqueta ou categoria…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine" className="gap-2">
            <Library className="h-4 w-4" /> Meus Kits
            <span className="ml-1 text-[10px] opacity-60">({myKits.length})</span>
          </TabsTrigger>
          <TabsTrigger value="suggested" className="gap-2">
            <Sparkles className="h-4 w-4" /> Sugeridos
            <span className="ml-1 text-[10px] opacity-60">({templates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            <Star className="h-4 w-4" /> Favoritos
            <span className="ml-1 text-[10px] opacity-60">({myKits.filter(k => k.is_favorite).length})</span>
          </TabsTrigger>
        </TabsList>

        {/* MINE */}
        <TabsContent value="mine">
          {loadingMine ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredMine.length === 0 ? (
            <EmptyState
              icon={<Library className="h-10 w-10" />}
              title={q ? 'Nenhum kit encontrado' : 'Você ainda não criou kits'}
              description={q ? 'Tente outra busca.' : 'Comece montando o seu primeiro kit personalizado.'}
              action={!q ? <Button onClick={() => navigate('/montar-kit')} className="gap-2"><Plus className="h-4 w-4" /> Montar kit</Button> : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMine.map(k => (
                <KitCard
                  key={k.id} variant="mine" data={toCard(k)}
                  onEdit={() => navigate(`/montar-kit?kit=${k.id}`)}
                  onDuplicate={() => duplicateMutation.mutate(k)}
                  onDelete={() => setDeleteId(k.id)}
                  onToggleFavorite={() => favoriteMutation.mutate({ id: k.id, value: !k.is_favorite })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* SUGGESTED */}
        <TabsContent value="suggested">
          {loadingTemplates ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredTpls.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-10 w-10" />}
              title="Nenhum template encontrado"
              description="Tente outra busca ou aguarde novos templates do sistema."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTpls.map(t => (
                <KitCard
                  key={t.id} variant="template" data={tplToCard(t)}
                  isBusy={isCloning}
                  onUseTemplate={async () => {
                    const created = await cloneTemplate(t);
                    if (created && typeof created === 'object' && 'id' in created) {
                      navigate(`/montar-kit?kit=${(created as { id: string }).id}`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* FAVORITES */}
        <TabsContent value="favorites">
          {filteredFavs.length === 0 ? (
            <EmptyState
              icon={<Star className="h-10 w-10" />}
              title="Sem favoritos ainda"
              description="Marque seus kits favoritos com a estrela para acessá-los rapidamente."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFavs.map(k => (
                <KitCard
                  key={k.id} variant="mine" data={toCard(k)}
                  onEdit={() => navigate(`/montar-kit?kit=${k.id}`)}
                  onDuplicate={() => duplicateMutation.mutate(k)}
                  onDelete={() => setDeleteId(k.id)}
                  onToggleFavorite={() => favoriteMutation.mutate({ id: k.id, value: !k.is_favorite })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir kit?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-16 text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
        <h3 className="font-display font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
