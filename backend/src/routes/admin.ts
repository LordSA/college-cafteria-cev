import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireAdmin, requireDeveloper } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const RoleUpdateSchema = z.object({
  role: z.enum(['developer', 'admin', 'retail', 'staff', 'customer']),
});

export const adminRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

adminRouter.use('*', requireAuth);

adminRouter.get('/me', requireAdmin, (c) => {
  const user = c.get('user');
  const profile = c.get('profile');

  return c.json(
    {
      success: true,
      data: {
        admin: user,
        profile,
        message: 'Administrator privileges confirmed',
      },
    },
    200
  );
});

adminRouter.get('/users', requireDeveloper, async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { data: users, error } = await adminClient
    .from('profiles')
    .select('id, display_name, app_role, account_type, approved_account_type, teacher_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  let results = users || [];

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

adminRouter.patch(
  '/users/:id/role',
  requireDeveloper,
  zValidator('json', RoleUpdateSchema),
  async (c) => {
    const targetUserId = c.req.param('id');
    const { role } = c.req.valid('json');
    const adminClient = getSupabaseAdminClient(c.env);

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    const { data: userProfile, error: fetchErr } = await adminClient
      .from('profiles')
      .select('id, app_role')
      .eq('id', targetUserId)
      .maybeSingle();

    if (fetchErr || !userProfile) {
      return c.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'Target user not found' } },
        404
      );
    }

    const { data: rpcResult, error: rpcErr } = await adminClient.rpc('set_user_role', {
      p_target_user_id: targetUserId,
      p_role: role,
    });

    if (rpcErr) {
      const { data: updatedDirect, error: updateErr } = await adminClient
        .from('profiles')
        .update({ app_role: role, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)
        .select('id, display_name, app_role')
        .single();

      if (updateErr) {
        return c.json(
          { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
          500
        );
      }

      return c.json({
        success: true,
        data: updatedDirect,
      });
    }

    return c.json({
      success: true,
      data: rpcResult,
    });
  }
);

adminRouter.get('/diagnostics', requireDeveloper, async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const [
    { count: totalUsers },
    { count: totalOrders },
    { count: totalMenuItems },
    { count: totalPayments },
    { count: webhookEventsCount },
  ] = await Promise.all([
    adminClient.from('profiles').select('*', { count: 'exact', head: true }),
    adminClient.from('orders').select('*', { count: 'exact', head: true }),
    adminClient.from('menu_items').select('*', { count: 'exact', head: true }),
    adminClient.from('payments').select('*', { count: 'exact', head: true }),
    adminClient.from('payment_webhook_events').select('*', { count: 'exact', head: true }),
  ]);

  return c.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      counts: {
        users: totalUsers || 0,
        orders: totalOrders || 0,
        menu_items: totalMenuItems || 0,
        payments: totalPayments || 0,
        webhook_events: webhookEventsCount || 0,
      },
      configuration: {
        payment_provider: c.env.PAYMENT_PROVIDER || 'razorpay',
        payment_mode: c.env.PAYMENT_MODE || 'test',
        razorpay_configured: Boolean(c.env.RAZORPAY_KEY_ID && c.env.RAZORPAY_KEY_SECRET),
        webhook_configured: Boolean(c.env.RAZORPAY_WEBHOOK_SECRET),
      },
    },
  });
});
