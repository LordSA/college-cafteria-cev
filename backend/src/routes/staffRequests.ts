import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

export const staffRequestsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

staffRequestsRouter.use('*', requireAuth);
staffRequestsRouter.use('*', requireRole(['developer', 'admin']));

staffRequestsRouter.get('/', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database connection unconfigured',
        },
      },
      500
    );
  }

  const statusFilter = c.req.query('status') || 'pending';

  let query = adminClient
    .from('profiles')
    .select('id, display_name, avatar_key, account_type, requested_account_type, approved_account_type, staff_approval_status, reviewed_by, reviewed_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('staff_approval_status', statusFilter);
  } else {
    query = query.in('staff_approval_status', ['pending', 'approved', 'rejected']);
  }

  const { data, error } = await query;

  if (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error.message,
        },
      },
      500
    );
  }

  let results = data || [];

  if (results.length > 0 && adminClient.auth?.admin?.listUsers) {
    try {
      const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (userList?.users) {
        const emailMap = new Map<string, string>();
        for (const u of userList.users) {
          if (u.id && u.email) {
            emailMap.set(u.id, u.email);
          }
        }
        results = results.map((p: any) => ({
          ...p,
          email: emailMap.get(p.id) || p.email || null,
        }));
      }
    } catch {}
  }

  return c.json({
    success: true,
    data: results,
  });
});

staffRequestsRouter.post('/:id/approve', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const adminUser = c.get('user');
  const targetId = c.req.param('id');

  if (!adminClient) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database connection unconfigured',
        },
      },
      500
    );
  }

  const { data: existing, error: checkError } = await adminClient
    .from('profiles')
    .select('id, staff_approval_status, requested_account_type')
    .eq('id', targetId)
    .maybeSingle();

  if (checkError || !existing) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Target user profile not found',
        },
      },
      404
    );
  }

  const targetAccountType = 'staff_t';

  const { data, error } = await adminClient
    .from('profiles')
    .update({
      approved_account_type: targetAccountType,
      account_type: targetAccountType,
      staff_approval_status: 'approved',
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .select('id, display_name, account_type, requested_account_type, approved_account_type, staff_approval_status, reviewed_by, reviewed_at, created_at, updated_at')
    .single();

  if (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
      },
      500
    );
  }

  return c.json({
    success: true,
    data,
    message: 'Staff request approved successfully',
  });
});

staffRequestsRouter.post('/:id/reject', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const adminUser = c.get('user');
  const targetId = c.req.param('id');

  if (!adminClient) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database connection unconfigured',
        },
      },
      500
    );
  }

  const { data: existing, error: checkError } = await adminClient
    .from('profiles')
    .select('id, staff_approval_status')
    .eq('id', targetId)
    .maybeSingle();

  if (checkError || !existing) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Target user profile not found',
        },
      },
      404
    );
  }

  const { data, error } = await adminClient
    .from('profiles')
    .update({
      staff_approval_status: 'rejected',
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .select('id, display_name, account_type, requested_account_type, approved_account_type, staff_approval_status, reviewed_by, reviewed_at, created_at, updated_at')
    .single();

  if (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
      },
      500
    );
  }

  return c.json({
    success: true,
    data,
    message: 'Staff request rejected',
  });
});

staffRequestsRouter.get('/teachers/list', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' },
      },
      500
    );
  }

  const { data, error } = await adminClient
    .from('profiles')
    .select('id, display_name, email, account_type, approved_account_type, staff_approval_status, created_at, updated_at')
    .or('account_type.eq.staff_t,approved_account_type.eq.staff_t')
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  let results = data || [];
  if (results.length > 0 && adminClient.auth?.admin?.listUsers) {
    try {
      const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (userList?.users) {
        const emailMap = new Map<string, string>();
        for (const u of userList.users) {
          if (u.id && u.email) {
            emailMap.set(u.id, u.email);
          }
        }
        results = results.map((p: any) => ({
          ...p,
          email: emailMap.get(p.id) || p.email || null,
        }));
      }
    } catch {}
  }

  return c.json({
    success: true,
    data: results,
  });
});

staffRequestsRouter.get('/teachers/candidates', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' },
      },
      500
    );
  }

  const { data, error } = await adminClient
    .from('profiles')
    .select('id, display_name, email, account_type, approved_account_type, created_at')
    .neq('account_type', 'staff_t')
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  let results = data || [];
  if (results.length > 0 && adminClient.auth?.admin?.listUsers) {
    try {
      const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (userList?.users) {
        const emailMap = new Map<string, string>();
        for (const u of userList.users) {
          if (u.id && u.email) {
            emailMap.set(u.id, u.email);
          }
        }
        results = results.map((p: any) => ({
          ...p,
          email: emailMap.get(p.id) || p.email || null,
        }));
      }
    } catch {}
  }

  return c.json({
    success: true,
    data: results,
  });
});

staffRequestsRouter.post('/teachers/create', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' },
      },
      500
    );
  }

  const body = await c.req.json();
  const { email, password, display_name } = body;

  if (!email || !password) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
      },
      400
    );
  }

  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: display_name || email.split('@')[0],
      account_type: 'staff_t',
    },
  });

  if (authErr || !authData?.user) {
    return c.json(
      {
        success: false,
        error: { code: 'CREATE_USER_FAILED', message: authErr?.message || 'Failed to create user' },
      },
      400
    );
  }

  const userId = authData.user.id;
  await adminClient.from('profiles').upsert({
    id: userId,
    email,
    display_name: display_name || email.split('@')[0],
    account_type: 'staff_t',
    approved_account_type: 'staff_t',
    staff_approval_status: 'approved',
    updated_at: new Date().toISOString(),
  });

  return c.json({
    success: true,
    data: {
      id: userId,
      email,
      display_name,
    },
    message: 'Teacher created successfully',
  });
});

staffRequestsRouter.post('/teachers/assign', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' },
      },
      500
    );
  }

  const body = await c.req.json();
  const { user_id } = body;

  if (!user_id) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'User ID is required' },
      },
      400
    );
  }

  const { data, error } = await adminClient
    .from('profiles')
    .update({
      account_type: 'staff_t',
      approved_account_type: 'staff_t',
      staff_approval_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user_id)
    .select('id, display_name, email, account_type, approved_account_type, staff_approval_status')
    .single();

  if (error) {
    return c.json(
      {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      },
      500
    );
  }

  return c.json({
    success: true,
    data,
    message: 'User assigned as teacher successfully',
  });
});

staffRequestsRouter.post('/teachers/revoke', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' },
      },
      500
    );
  }

  const body = await c.req.json();
  const { user_id } = body;

  if (!user_id) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'User ID is required' },
      },
      400
    );
  }

  const { data, error } = await adminClient
    .from('profiles')
    .update({
      account_type: 'student',
      approved_account_type: 'student',
      staff_approval_status: 'not_requested',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user_id)
    .select('id, display_name, email, account_type, approved_account_type')
    .single();

  if (error) {
    return c.json(
      {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      },
      500
    );
  }

  return c.json({
    success: true,
    data,
    message: 'Teacher role revoked successfully',
  });
});
