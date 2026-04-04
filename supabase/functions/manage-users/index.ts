import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";

const uuidSchema = z.string().uuid();
const emailSchema = z.string().email().max(255);
const roleSchema = z.enum(['admin', 'manager', 'vendedor']);

const CreateSchema = z.object({
  action: z.literal('create'),
  email: emailSchema,
  password: z.string().min(8).max(128),
  full_name: z.string().max(200).optional().default(''),
  role: roleSchema.optional(),
});

const UpdateEmailSchema = z.object({
  action: z.literal('update_email'),
  user_id: uuidSchema,
  new_email: emailSchema,
});

const UpdatePasswordSchema = z.object({
  action: z.literal('update_password'),
  user_id: uuidSchema,
  new_password: z.string().min(8).max(128),
});

const DeleteSchema = z.object({
  action: z.literal('delete'),
  user_id: uuidSchema,
});

const PayloadSchema = z.discriminatedUnion('action', [
  CreateSchema,
  UpdateEmailSchema,
  UpdatePasswordSchema,
  DeleteSchema,
]);

function jsonRes(corsHeaders: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonRes(corsHeaders, { error: 'Não autorizado' }, 401);
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return jsonRes(corsHeaders, { error: 'Não autorizado' }, 401);
    }

    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (callerRole?.role !== 'admin') {
      return jsonRes(corsHeaders, { error: 'Apenas administradores podem gerenciar usuários' }, 403);
    }

    // Validate input with Zod
    const rawBody = await req.json();
    const parsed = PayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonRes(corsHeaders, { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, 400);
    }

    const payload = parsed.data;

    if (payload.action === 'create') {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: { full_name: payload.full_name || '' },
      });

      if (createError) {
        return jsonRes(corsHeaders, { error: createError.message }, 400);
      }

      if (payload.role && payload.role !== 'vendedor' && newUser.user) {
        await supabaseAdmin
          .from('user_roles')
          .update({ role: payload.role })
          .eq('user_id', newUser.user.id);
      }

      return jsonRes(corsHeaders, { success: true, user_id: newUser.user?.id });
    }

    if (payload.action === 'update_email') {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        payload.user_id,
        { email: payload.new_email }
      );

      if (updateError) {
        return jsonRes(corsHeaders, { error: updateError.message }, 400);
      }

      await supabaseAdmin.from('profiles').update({ email: payload.new_email }).eq('user_id', payload.user_id);
      return jsonRes(corsHeaders, { success: true });
    }

    if (payload.action === 'update_password') {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        payload.user_id,
        { password: payload.new_password }
      );

      if (updateError) {
        return jsonRes(corsHeaders, { error: updateError.message }, 400);
      }

      return jsonRes(corsHeaders, { success: true });
    }

    if (payload.action === 'delete') {
      if (payload.user_id === caller.id) {
        return jsonRes(corsHeaders, { error: 'Não é possível excluir seu próprio usuário' }, 400);
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(payload.user_id);

      if (deleteError) {
        return jsonRes(corsHeaders, { error: deleteError.message }, 400);
      }

      return jsonRes(corsHeaders, { success: true });
    }

    return jsonRes(corsHeaders, { error: 'Ação inválida' }, 400);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    return jsonRes(corsHeaders, { error: msg }, 500);
  }
});
