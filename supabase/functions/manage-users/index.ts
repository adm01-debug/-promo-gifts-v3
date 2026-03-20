import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
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
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (callerRole?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem gerenciar usuários' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, ...payload } = await req.json();

    if (action === 'create') {
      const { email, password, full_name, role } = payload;

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create user via admin API (auto-confirms email)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || '' },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // The trigger handle_new_user creates profile and assigns 'vendedor' role.
      // If a different role was requested, update it.
      if (role && role !== 'vendedor' && newUser.user) {
        await supabaseAdmin
          .from('user_roles')
          .update({ role })
          .eq('user_id', newUser.user.id);
      }

      console.log(`User created: ${email} by admin ${caller.email}`);
      return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update_email') {
      const { user_id, new_email } = payload;

      if (!user_id || !new_email) {
        return new Response(JSON.stringify({ error: 'user_id e new_email são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, { email: new_email });

      if (updateError) {
        console.error('Error updating email:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update profile email too
      await supabaseAdmin.from('profiles').update({ email: new_email }).eq('user_id', user_id);

      console.log(`User ${user_id} email updated to ${new_email} by admin ${caller.email}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update_password') {
      const { user_id, new_password } = payload;

      if (!user_id || !new_password) {
        return new Response(JSON.stringify({ error: 'user_id e new_password são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: new_password });

      if (updateError) {
        console.error('Error updating password:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`User ${user_id} password updated by admin ${caller.email}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'delete') {
      const { user_id } = payload;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Prevent self-deletion
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: 'Não é possível excluir seu próprio usuário' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Delete from auth (cascades to profiles and user_roles due to FK)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`User ${user_id} deleted by admin ${caller.email}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in manage-users:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
