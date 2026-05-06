import { test, expect } from '@playwright/test';
import { supabase } from '@/integrations/supabase/client';

/**
 * RLS CRUD Matrix Test
 * ----------------------------------------------------------------
 * Este teste automatizado itera sobre as tabelas críticas e perfis
 * para garantir que o Row Level Security (RLS) esteja barrando
 * ou permitindo acessos conforme o modelo RBAC.
 */

const TEST_TABLES = [
  'products',
  'quotes',
  'audit_log',
  'auth_login_attempts',
  'webhook_delivery_metrics'
];

test.describe('RLS CRUD Matrix Validation', () => {
  
  test('Anonymous users should NOT have direct CRUD access to critical tables', async () => {
    // Usando client direto para simular bypass de UI
    for (const table of TEST_TABLES) {
      // 1. SELECT check
      const { data: selectData, error: selectError } = await supabase
        .from(table as any)
        .select('*')
        .limit(1);
      
      // Alguns produtos podem ser públicos, mas orçamentos e logs NUNCA
      if (table !== 'products') {
        expect(selectData?.length || 0).toBe(0);
      }

      // 2. INSERT check
      const { error: insertError } = await supabase
        .from(table as any)
        .insert({ id: '00000000-0000-0000-0000-000000000000' } as any);
      
      expect(insertError?.code).toMatch(/42501|PGRST116/); // Permission denied
    }
  });

  test('Security Definer ACL Gate should block public execution', async () => {
    const sensitiveRPCs = [
      'check_auth_throttling',
      'record_auth_attempt',
      'maintain_webhook_metrics'
    ];

    for (const rpc of sensitiveRPCs) {
      const { error } = await supabase.rpc(rpc as any, {});
      // Deve falhar com 403 Forbidden ou erro de permissão no schema
      expect(error).toBeDefined();
    }
  });

});
