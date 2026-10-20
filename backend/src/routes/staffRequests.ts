import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

export const staffRequestsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

staffRequestsRouter.use('*', requireAuth);
staffRequestsRouter.use('*', requireAdmin);

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

  return c.json({
    success: true,
    data: data || [],
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
      approved_account_type: 'staff',
      account_type: 'staff',
      staff_approval_status: 'approved',
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .select()
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
      approved_account_type: 'student',
      account_type: 'student',
      staff_approval_status: 'rejected',
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .select()
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
    message: 'Staff request rejected successfully',
  });
});
