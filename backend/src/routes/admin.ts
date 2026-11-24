import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireDeveloper, requireRole } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';
import { sendEmail } from '../lib/mailer';

const RoleUpdateSchema = z.object({
  role: z.enum(['developer', 'admin', 'retail', 'staff', 'printer', 'customer']),
});

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().optional(),
  account_type: z.enum(['student', 'staff_t']).default('student'),
  app_role: z.enum(['developer', 'admin', 'retail', 'staff', 'printer', 'customer']).default('customer'),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  display_name: z.string().optional(),
  account_type: z.enum(['student', 'staff_t']).optional(),
  app_role: z.enum(['developer', 'admin', 'retail', 'staff', 'printer', 'customer']).optional(),
});

const CreateAdminSchema = z.object({
  user_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  display_name: z.string().optional(),
  role: z.enum(['developer', 'admin', 'retail', 'staff', 'printer']).default('admin'),
});

export const adminRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

adminRouter.use('*', requireAuth);

adminRouter.get('/me', requireRole(['developer', 'admin', 'retail', 'staff', 'printer']), (c) => {
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
    .select('id, display_name, app_role, account_type, created_at, updated_at')
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

adminRouter.post('/users', requireDeveloper, zValidator('json', CreateUserSchema), async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { email, password, display_name, account_type, app_role } = c.req.valid('json');

  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: display_name || email.split('@')[0],
      account_type,
      app_role,
    },
  });

  if (authErr || !authData?.user) {
    return c.json(
      { success: false, error: { code: 'CREATE_FAILED', message: authErr?.message || 'Failed to create user' } },
      400
    );
  }

  const userId = authData.user.id;
  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      email,
      display_name: display_name || email.split('@')[0],
      account_type,
      app_role,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (profErr) {
    return c.json(
      { success: false, error: { code: 'PROFILE_FAILED', message: profErr.message } },
      500
    );
  }

  return c.json(
    {
      success: true,
      data: profile,
      message: 'User created successfully',
    },
    201
  );
});

adminRouter.patch('/users/:id', requireDeveloper, zValidator('json', UpdateUserSchema), async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const targetId = c.req.param('id');
  const payload = c.req.valid('json');

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { data: existing, error: fetchErr } = await adminClient
    .from('profiles')
    .select('id, app_role, account_type, email')
    .eq('id', targetId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404
    );
  }

  if (existing.app_role === 'developer' && payload.app_role && payload.app_role !== 'developer') {
    const { count } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('app_role', 'developer');
    if ((count || 0) <= 1) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot demote the last developer' } },
        400
      );
    }
  }

  const profileUpdate: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.display_name !== undefined) profileUpdate.display_name = payload.display_name.trim();
  if (payload.email !== undefined) profileUpdate.email = payload.email.trim().toLowerCase();
  if (payload.account_type !== undefined) profileUpdate.account_type = payload.account_type;
  if (payload.app_role !== undefined) profileUpdate.app_role = payload.app_role;

  const { data: updatedProfile, error: updateErr } = await adminClient
    .from('profiles')
    .update(profileUpdate)
    .eq('id', targetId)
    .select('*')
    .single();

  if (updateErr) {
    return c.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
      500
    );
  }

  if (adminClient.auth?.admin?.updateUserById) {
    const authUpdate: Record<string, any> = {};
    if (payload.email) {
      authUpdate.email = payload.email.trim().toLowerCase();
      authUpdate.email_confirm = true;
    }
    if (payload.password) {
      authUpdate.password = payload.password;
    }
    if (payload.display_name || payload.account_type || payload.app_role) {
      authUpdate.user_metadata = {
        ...(payload.display_name ? { display_name: payload.display_name.trim() } : {}),
        ...(payload.account_type ? { account_type: payload.account_type } : {}),
        ...(payload.app_role ? { app_role: payload.app_role } : {}),
      };
    }

    if (Object.keys(authUpdate).length > 0) {
      try {
        await adminClient.auth.admin.updateUserById(targetId, authUpdate);
      } catch {}
    }
  }

  return c.json({
    success: true,
    data: updatedProfile,
    message: 'User details updated successfully',
  });
});

adminRouter.delete('/users/:id', requireDeveloper, async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const targetId = c.req.param('id');
  const currentUser = c.get('user');

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  if (targetId === currentUser.id) {
    return c.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Cannot delete your own account' } },
      400
    );
  }

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id, app_role')
    .eq('id', targetId)
    .maybeSingle();

  if (targetProfile?.app_role === 'developer') {
    const { count } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('app_role', 'developer');
    if ((count || 0) <= 1) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete the only developer' } },
        400
      );
    }
  }

  if (adminClient.auth?.admin?.deleteUser) {
    try {
      await adminClient.auth.admin.deleteUser(targetId);
    } catch {}
  }

  await adminClient.from('profiles').delete().eq('id', targetId);

  return c.json({
    success: true,
    message: 'User account removed successfully',
  });
});

adminRouter.post('/admins', requireDeveloper, zValidator('json', CreateAdminSchema), async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const payload = c.req.valid('json');

  if (payload.user_id) {
    const { data: updated, error: updErr } = await adminClient
      .from('profiles')
      .update({
        app_role: payload.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.user_id)
      .select('*')
      .single();

    if (updErr || !updated) {
      return c.json(
        { success: false, error: { code: 'ASSIGN_FAILED', message: updErr?.message || 'User not found' } },
        400
      );
    }

    if (adminClient.auth?.admin?.updateUserById) {
      try {
        await adminClient.auth.admin.updateUserById(payload.user_id, {
          user_metadata: { app_role: payload.role },
        });
      } catch {}
    }

    return c.json({
      success: true,
      data: updated,
      message: `Assigned ${payload.role.toUpperCase()} authority to user`,
    });
  }

  if (!payload.email || !payload.password) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required for new admin' } },
      400
    );
  }

  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      display_name: payload.display_name || payload.email.split('@')[0],
      app_role: payload.role,
      account_type: 'staff_t',
    },
  });

  if (authErr || !authData?.user) {
    return c.json(
      { success: false, error: { code: 'CREATE_FAILED', message: authErr?.message || 'Failed to create admin user' } },
      400
    );
  }

  const { data: newProfile, error: pErr } = await adminClient
    .from('profiles')
    .upsert({
      id: authData.user.id,
      email: payload.email,
      display_name: payload.display_name || payload.email.split('@')[0],
      app_role: payload.role,
      account_type: 'staff_t',
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (pErr) {
    return c.json(
      { success: false, error: { code: 'PROFILE_ERROR', message: pErr.message } },
      500
    );
  }

  return c.json(
    {
      success: true,
      data: newProfile,
      message: `Created new ${payload.role.toUpperCase()} admin successfully`,
    },
    201
  );
});

adminRouter.get('/system/health', requireDeveloper, async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const startTime = Date.now();

  let dbOk = false;
  let dbLatency = 0;
  if (adminClient) {
    const t0 = Date.now();
    const { error } = await adminClient.from('profiles').select('id').limit(1);
    dbLatency = Date.now() - t0;
    dbOk = !error;
  }

  let rzpOk = false;
  let rzpLatency = 0;
  let rzpStatus = 'unconfigured';
  if (c.env.RAZORPAY_KEY_ID && c.env.RAZORPAY_KEY_SECRET) {
    const t0 = Date.now();
    try {
      const basic = btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`);
      const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        headers: { Authorization: `Basic ${basic}` },
      });
      rzpLatency = Date.now() - t0;
      rzpOk = res.ok;
      rzpStatus = res.ok ? 'connected' : `HTTP ${res.status}`;
    } catch (e: any) {
      rzpLatency = Date.now() - t0;
      rzpStatus = e.message;
    }
  }

  const smtpConfigured = Boolean(c.env.SMTP_HOST && c.env.SMTP_USER && c.env.SMTP_PASS);

  return c.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      total_response_time_ms: Date.now() - startTime,
      services: {
        api_root: { status: 'healthy', latency_ms: 1 },
        database: { status: dbOk ? 'healthy' : 'unreachable', latency_ms: dbLatency },
        razorpay_gateway: {
          status: rzpOk ? 'healthy' : c.env.RAZORPAY_KEY_ID ? 'degraded' : 'unconfigured',
          configured: Boolean(c.env.RAZORPAY_KEY_ID),
          message: rzpStatus,
          latency_ms: rzpLatency,
        },
        storage_provider: {
          provider: c.env.STORAGE_PROVIDER || 'supabase',
          status: 'configured',
        },
        smtp_mailer: {
          configured: smtpConfigured,
          host: c.env.SMTP_HOST || null,
          port: c.env.SMTP_PORT || '587',
          user: c.env.SMTP_USER || null,
          from: c.env.SMTP_FROM || c.env.SMTP_USER || null,
          developer_email: c.env.DEVELOPER_EMAIL || c.env.SMTP_USER || null,
          status: smtpConfigured ? 'ready' : 'unconfigured',
        },
      },
      env: {
        environment: c.env.ENVIRONMENT || 'development',
        payment_mode: c.env.PAYMENT_MODE || 'test',
        payment_provider: c.env.PAYMENT_PROVIDER || 'razorpay',
      },
    },
  });
});

adminRouter.get('/system/payments', requireDeveloper, async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);

  let razorpayPayments: any[] = [];
  let rzpError: string | null = null;

  if (c.env.RAZORPAY_KEY_ID && c.env.RAZORPAY_KEY_SECRET) {
    try {
      const basic = btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`);
      const res = await fetch('https://api.razorpay.com/v1/payments?count=25', {
        headers: { Authorization: `Basic ${basic}` },
      });
      if (res.ok) {
        const json = (await res.json()) as any;
        razorpayPayments = json.items || [];
      } else {
        const errText = await res.text();
        rzpError = `Razorpay API HTTP ${res.status}: ${errText}`;
      }
    } catch (e: any) {
      rzpError = e.message;
    }
  } else {
    rzpError = 'Razorpay credentials not set';
  }

  let dbPayments: any[] = [];
  let webhooks: any[] = [];

  if (adminClient) {
    const [pRes, wRes] = await Promise.all([
      adminClient.from('payments').select('*, orders(order_number, total, customer_id)').order('created_at', { ascending: false }).limit(25),
      adminClient.from('payment_webhook_events').select('*').order('created_at', { ascending: false }).limit(25),
    ]);
    dbPayments = pRes.data || [];
    webhooks = wRes.data || [];
  }

  return c.json({
    success: true,
    data: {
      razorpay_gateway_payments: razorpayPayments,
      razorpay_error: rzpError,
      database_payments: dbPayments,
      webhook_events: webhooks,
    },
  });
});

adminRouter.post('/system/test-email', requireDeveloper, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const to = body.to || c.env.DEVELOPER_EMAIL || c.env.SMTP_USER;

  if (!to) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Target email address required' } },
      400
    );
  }

  const result = await sendEmail(c.env, {
    to,
    subject: '[Cafteria CEV] SMTP Diagnostic Verification Test',
    text: `This is a diagnostic verification email from Cafteria CEV Developer Portal.\nTimestamp: ${new Date().toISOString()}\nHost: ${c.env.SMTP_HOST}\nPort: ${c.env.SMTP_PORT || '587'}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eeeeee; border-radius: 12px;">
        <h2 style="color: #F47721;">SMTP Diagnostic Verification Test</h2>
        <p>This email confirms that the Cafteria SMTP mail delivery pipeline is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>SMTP Host:</strong> ${c.env.SMTP_HOST}</p>
        <p><strong>SMTP Port:</strong> ${c.env.SMTP_PORT || '587'}</p>
      </div>
    `,
  });

  return c.json({
    success: result.success,
    data: result,
    message: result.success
      ? `Test email dispatched to ${to}`
      : `Test email dispatch failed: ${result.error}`,
  });
});
