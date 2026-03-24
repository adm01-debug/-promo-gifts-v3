/**
 * NewCategoryDialog — Dialog for creating a new product category
 */
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface NewCategoryDialogProps {
  onCreated: (id: string) => void;
}

export function NewCategoryDialog({ onCreated }: NewCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parent_id: string | null }>>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const loadCategories = async () => {
    if (categories.length > 0) return;
    setLoadingCats(true);
    try {
      const { invokeExternalDb } = await import('@/lib/external-db');
      const result = await invokeExternalDb<{ id: string; name: string; parent_id: string | null }>({
        table: 'categories',
        operation: 'select',
        filters: { is_active: true },
        orderBy: 'name',
      });
      setCategories(result || []);
    } catch {
      // silent
    } finally {
      setLoadingCats(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const map = new Map(categories.map(c => [c.id, c]));
    const getPath = (id: string): string => {
      const parts: string[] = [];
      let current = map.get(id);
      while (current) {
        parts.unshift(current.name);
        current = current.parent_id ? map.get(current.parent_id) : undefined;
      }
      return parts.join(' › ');
    };
    return categories
      .map(c => ({ id: c.id, label: getPath(c.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { invokeExternalDbSingle } = await import('@/lib/external-db');
      const result = await invokeExternalDbSingle<{ id: string }>({
        table: 'categories',
        operation: 'insert',
        data: {
          name: name.trim(),
          slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          is_active: true,
          parent_id: parentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
      if (result?.id) {
        onCreated(result.id);
        toast.success(`Categoria "${name.trim()}" criada com sucesso`);
        setOpen(false);
        setName('');
        setParentId(null);
        setCategories([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar categoria');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadCategories(); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
          <Plus className="h-3.5 w-3.5" />
          Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Categoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="new-category-parent" className="text-xs font-semibold">Categoria Pai</Label>
            <select
              id="new-category-parent"
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              disabled={loadingCats}
            >
              <option value="">Nenhuma (raiz)</option>
              {categoryOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">Deixe vazio para criar na raiz</p>
          </div>
          <div>
            <Label htmlFor="new-category-name" className="text-xs font-semibold">
              Nome da Categoria <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Canecas Térmicas"
              className="mt-1.5 h-9"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" size="sm" disabled={!name.trim() || saving} onClick={handleCreate} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Criar Categoria
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
