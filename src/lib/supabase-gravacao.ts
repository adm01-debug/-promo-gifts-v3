// Cliente Supabase para banco externo de Gravação (Promobrind)
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/gravacao-database';

const SUPABASE_URL = 'https://doufsxqlfjyuvxuezpln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWZzeHFsZmp5dXZ4dWV6cGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODY2NDMsImV4cCI6MjA4Mjk2MjY0M30.JVpFMOxMHgG4vSt4scDn_LkiLJrZP1R4hoGHZnQMDhM';

export const supabaseGravacao = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Exportar URL para uso em outros lugares se necessário
export const GRAVACAO_SUPABASE_URL = SUPABASE_URL;
