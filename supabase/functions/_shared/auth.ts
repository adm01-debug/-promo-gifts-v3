// supabase/functions/_shared/auth.ts
// Centralized authentication for Edge Functions

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

export interface AuthResult {
  userId: string;
  userRole: string;
  localServiceClient: SupabaseClient;
}

/**
 * Authenticate a request using the Authorization header (JWT).
 * Returns the user ID, role, and a service-role client for further queries.
 * Throws an object with { status, message } on failure.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw { status: 401, message: 'Token de autenticação ausente' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Validate token using getUser (works with all supabase-js versions)
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error } = await userClient.auth.getUser();

  if (error || !userData?.user) {
    throw { status: 401, message: 'Token inválido ou expirado' };
  }

  const userId = userData.user.id;

  // Fetch role using service role client (bypasses RLS)
  const localServiceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: userRoles, error: roleError } = await localServiceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (roleError) {
    console.error('[auth] Error fetching user roles:', roleError.message);
  }

  const userRole = userRoles?.[0]?.role || 'vendedor';

  return { userId, userRole, localServiceClient };
}

/**
 * Require the user to have a specific role. 
 * Throws { status: 403, message } if the role doesn't match.
 */
export function requireRole(auth: AuthResult, requiredRole: string): void {
  if (auth.userRole !== requiredRole && auth.userRole !== 'admin') {
    throw { status: 403, message: `Acesso restrito ao papel '${requiredRole}'` };
  }
}

/**
 * Helper to create a JSON error response from auth errors.
 */
export function authErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>
): Response {
  const status = (err as any)?.status || 500;
  const message = (err as any)?.message || 'Erro de autenticação';
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
