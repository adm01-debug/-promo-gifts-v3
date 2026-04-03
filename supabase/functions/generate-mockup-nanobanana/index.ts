import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
// ============================================================
// EDGE FUNCTION: generate-mockup-nanobanana
// Geração de Mockups com IA usando Nano Banana API
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.49.4"

