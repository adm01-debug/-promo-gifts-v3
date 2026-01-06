// ============================================
// COMPONENTE: TOOLBAR DE BULK ACTIONS
// Com seleção múltipla e ações em massa
// ============================================

import { useState } from 'react';
import { Trash2, Archive, FileDown, Copy, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { useSoftDelete } from '@/hooks/useSoftDelete';
import { useDuplicate } from '@/hooks/useDuplicate';

interface BulkActionsToolbarProps<T extends { id: string }> {
  selectedIds: string[];
  onClearSelection: () => void;
  onSelectAll?: () => void;
  totalCount: number;
  tableName: string;
  queryKey: string[];
  entityName: string;
  items: T[];
  onExport?: (selectedItems: T[]) => void;
}

export function BulkActionsToolbar<T extends { id: string }>({
  selectedIds,
  onClearSelection,
  onSelectAll,
  totalCount,
  tableName,
  queryKey,
  entityName,
  items,
  onExport,
}: BulkActionsToolbarProps<T>) {
  const [action, setAction] = useState<'delete' | 'archive' | null>(null);

  const { bulkSoftDelete, permanentDelete } = useSoftDelete({ tableName, queryKey, entityName });
  const { bulkDuplicate } = useDuplicate({ tableName, queryKey, entityName });

  if (selectedIds.length === 0) return null;

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  const handleBulkDelete = () => {
    // Deletar permanentemente todos selecionados
    selectedIds.forEach((id) => {
      permanentDelete.mutate(id);
    });
    onClearSelection();
    setAction(null);
  };

  const handleBulkArchive = () => {
    bulkSoftDelete.mutate(selectedIds, {
      onSuccess: () => {
        onClearSelection();
        setAction(null);
      },
    });
  };

  const handleBulkDuplicate = () => {
    bulkDuplicate.mutate(selectedIds, {
      onSuccess: () => {
        onClearSelection();
      },
    });
  };

  const handleExport = () => {
    if (onExport) {
      onExport(selectedItems);
    }
  };

  const isLoading = bulkSoftDelete.isPending || bulkDuplicate.isPending || permanentDelete.isPending;

  return (
    <>
      <div className="bg-primary text-primary-foreground p-3 rounded-lg shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary-foreground text-primary">
            {selectedIds.length} selecionado(s)
          </Badge>

          {onSelectAll && selectedIds.length < totalCount && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              Selecionar todos ({totalCount})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Arquivar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAction('archive')}
            disabled={isLoading}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Archive className="h-4 w-4 mr-2" />
            Arquivar
          </Button>

          {/* Duplicar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDuplicate}
            disabled={isLoading}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>

          {/* Exportar */}
          {onExport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}

          {/* Deletar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAction('delete')}
            disabled={isLoading}
            className="text-primary-foreground hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar
          </Button>

          {/* Limpar seleção */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Square className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Dialog de confirmação - Arquivar */}
      <AlertDialog open={action === 'archive'} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar {selectedIds.length} {entityName}(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Os registros selecionados serão movidos para a lixeira e poderão ser restaurados
              posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação - Deletar */}
      <AlertDialog open={action === 'delete'} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar {selectedIds.length} {entityName}(s)?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta ação é <strong>IRREVERSÍVEL</strong>. Os {selectedIds.length}{' '}
                {entityName.toLowerCase()}(s) selecionado(s) serão deletados permanentemente.
              </p>
              <p className="text-destructive font-medium">Tem certeza que deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
