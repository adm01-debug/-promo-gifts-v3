/**
 * useOptimizationQueue
 * --------------------------------------------------------------
 * Gerencia a fila automática de otimizações:
 *   - lista os itens (auto-refresh 10s)
 *   - enfileira novos itens
 *   - executa uma de cada vez via `claim_next_optimization` + `complete_optimization`
 *   - respeita o guardrail (`check_telemetry_regression`): se status = 'regression',
 *     o item é marcado como 'blocked' e a fila pausa.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OptimizationItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: number;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped' | 'blocked';
  result: Record<string, unknown> | null;
  error: string | null;
  guardrail_status: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

const QUEUE_KEY = ['admin', 'optimization-queue'];

export function useOptimizationQueue() {
  const queryClient = useQueryClient();
  const [autoRun, setAutoRun] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const stopRef = useRef(false);

  const { data: items = [], isLoading, refetch } = useQuery<OptimizationItem[]>({
    queryKey: QUEUE_KEY,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optimization_queue' as never)
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OptimizationItem[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUEUE_KEY });

  const enqueue = useCallback(
    async (input: { title: string; description?: string; category?: string; priority?: number }) => {
      const { error } = await supabase.rpc('enqueue_optimization' as never, {
        _title: input.title,
        _description: input.description ?? null,
        _category: input.category ?? 'performance',
        _priority: input.priority ?? 100,
      } as never);
      if (error) {
        toast.error(`Falha ao enfileirar: ${error.message}`);
        return false;
      }
      toast.success('Otimização enfileirada');
      invalidate();
      return true;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('optimization_queue' as never).delete().eq('id', id);
    if (error) {
      toast.error(`Falha ao remover: ${error.message}`);
      return;
    }
    invalidate();
  }, []);

  const resetStuck = useCallback(async () => {
    const { error } = await supabase.rpc('reset_optimization_queue' as never, { _only_running: false } as never);
    if (error) {
      toast.error(`Falha ao resetar: ${error.message}`);
      return;
    }
    toast.success('Fila resetada');
    invalidate();
  }, []);

  /** Executa um item: simula trabalho leve + checa guardrail. */
  const runOne = useCallback(async (): Promise<'done' | 'blocked' | 'empty' | 'error'> => {
    const { data: claimed, error: claimErr } = await supabase.rpc('claim_next_optimization' as never);
    if (claimErr) {
      toast.error(`Falha ao reivindicar: ${claimErr.message}`);
      return 'error';
    }
    if (!claimed || (Array.isArray(claimed) && claimed.length === 0)) {
      return 'empty';
    }
    const item = (Array.isArray(claimed) ? claimed[0] : claimed) as OptimizationItem;
    invalidate();

    // Aguarda janela curta para guardrail medir possíveis regressões pós-execução.
    await new Promise(r => setTimeout(r, 1500));

    // Checa guardrail
    const { data: guardrail } = await supabase.rpc('check_telemetry_regression' as never);
    const guardrailStatus = (guardrail as { status?: string } | null)?.status ?? 'insufficient_data';

    let finalStatus: 'done' | 'blocked' = 'done';
    let notes = `Executado automaticamente · guardrail=${guardrailStatus}`;
    let errorMsg: string | null = null;

    if (guardrailStatus === 'regression') {
      finalStatus = 'blocked';
      errorMsg = 'KPIs pioraram (guardrail=regression). Execução pausada.';
      notes = errorMsg;
    }

    await supabase.rpc('complete_optimization' as never, {
      _id: item.id,
      _status: finalStatus,
      _notes: notes,
      _guardrail_status: guardrailStatus,
      _result: { executed_at: new Date().toISOString() } as never,
      _error: errorMsg,
    } as never);

    invalidate();
    return finalStatus === 'blocked' ? 'blocked' : 'done';
  }, []);

  /** Loop sequencial: executa enquanto houver pending e o guardrail permitir. */
  const startAuto = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setAutoRun(true);
    stopRef.current = false;
    try {
      while (!stopRef.current) {
        const result = await runOne();
        if (result === 'empty') {
          toast.success('Fila concluída ✓');
          break;
        }
        if (result === 'blocked') {
          toast.error('Execução pausada por regressão de KPIs');
          break;
        }
        if (result === 'error') {
          break;
        }
        await new Promise(r => setTimeout(r, 800));
      }
    } finally {
      setIsExecuting(false);
      setAutoRun(false);
    }
  }, [isExecuting, runOne]);

  const stopAuto = useCallback(() => {
    stopRef.current = true;
    setAutoRun(false);
  }, []);

  useEffect(() => () => { stopRef.current = true; }, []);

  const pending = items.filter(i => i.status === 'pending').length;
  const done = items.filter(i => i.status === 'done').length;
  const blocked = items.filter(i => i.status === 'blocked' || i.status === 'failed').length;

  return {
    items, isLoading, refetch,
    enqueue, remove, resetStuck,
    runOne, startAuto, stopAuto,
    isExecuting, autoRun,
    counts: { pending, done, blocked, total: items.length },
  };
}
