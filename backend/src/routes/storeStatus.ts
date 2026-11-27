import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const StoreStatusUpdateSchema = z.object({
  is_open: z.boolean(),
  message: z.string().max(300).optional(),
});

export const publicStoreStatusRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

export const adminStoreStatusRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

publicStoreStatusRouter.get('/', async (c) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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
    .from('store_settings')
    .select('*')
    .eq('key', 'canteen_status')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return c.json({
      success: true,
      data: {
        is_open: true,
        message: 'Canteen is open for orders',
        updated_at: new Date().toISOString(),
      },
    });
  }

  const settingValue = (data?.value as Record<string, any>) || {};
  const isOpen = settingValue.is_open !== undefined ? Boolean(settingValue.is_open) : true;
  const message = settingValue.message || (isOpen ? 'Canteen is open for orders' : 'We are currently closed.');

  try {
    const nowIst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (settingValue.last_daily_reset_date && settingValue.last_daily_reset_date !== nowIst) {
      await adminClient.rpc('reset_daily_category_stock');
    }
  } catch {}

  return c.json({
    success: true,
    data: {
      is_open: isOpen,
      message,
      updated_at: data?.updated_at || new Date().toISOString(),
    },
  });
});

adminStoreStatusRouter.use('*', requireAuth);
adminStoreStatusRouter.use('*', requireRole(['developer', 'admin', 'staff']));

adminStoreStatusRouter.get('/', async (c) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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

  const { data } = await adminClient
    .from('store_settings')
    .select('*')
    .eq('key', 'canteen_status')
    .maybeSingle();

  const settingValue = (data?.value as Record<string, any>) || {};
  const isOpen = settingValue.is_open !== undefined ? Boolean(settingValue.is_open) : true;
  const message = settingValue.message || (isOpen ? 'Canteen is open for orders' : 'We are currently closed.');

  return c.json({
    success: true,
    data: {
      is_open: isOpen,
      message,
      last_daily_reset_date: settingValue.last_daily_reset_date || '',
      updated_at: data?.updated_at || new Date().toISOString(),
    },
  });
});

adminStoreStatusRouter.patch(
  '/',
  zValidator('json', StoreStatusUpdateSchema),
  async (c) => {
    const adminClient = getSupabaseAdminClient(c.env);
    const user = c.get('user');

    if (!adminClient) {
      return c.json(
        {
          success: false,
          error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' },
        },
        500
      );
    }

    const payload = c.req.valid('json');

    const { data: existing } = await adminClient
      .from('store_settings')
      .select('value')
      .eq('key', 'canteen_status')
      .maybeSingle();

    const existingValue = (existing?.value as Record<string, any>) || {};
    const nextValue = {
      ...existingValue,
      is_open: payload.is_open,
      message: payload.message || (payload.is_open ? 'Canteen is open for orders' : 'We are currently closed.'),
    };

    const { data, error } = await adminClient
      .from('store_settings')
      .upsert({
        key: 'canteen_status',
        value: nextValue,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return c.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: error.message } },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        is_open: nextValue.is_open,
        message: nextValue.message,
        updated_at: data.updated_at,
      },
    });
  }
);
