import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';
import { getPublicImageUrl } from '../lib/storage';

const MenuItemCreateSchema = z.object({
  category_id: z.string().uuid('Invalid category ID format'),
  name: z.string().min(1, 'Item name is required').max(150),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().int().min(0, 'Price must be a positive integer in paise'),
  image_key: z.string().max(300).optional().nullable(),
  is_available: z.boolean().default(true),
});

const MenuItemUpdateSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().int().min(0).optional(),
  image_key: z.string().max(300).optional().nullable(),
  is_available: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export const publicMenuRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

export const adminMenuRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

publicMenuRouter.get('/', async (c) => {
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

  const categoryId = c.req.query('category_id');
  const search = c.req.query('search');

  let query = adminClient
    .from('menu_items')
    .select('*, categories(name)')
    .eq('is_archived', false)
    .order('name', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  const enriched = (data || []).map((item: any) => ({
    ...item,
    category_name: item.categories?.name,
    image_url: item.image_key ? getPublicImageUrl(item.image_key, c.env) : null,
  }));

  return c.json({ success: true, data: enriched });
});

adminMenuRouter.use('*', requireAuth);
adminMenuRouter.use('*', requireAdmin);

adminMenuRouter.get('/', async (c) => {
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
    .from('menu_items')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  const enriched = (data || []).map((item: any) => ({
    ...item,
    category_name: item.categories?.name,
    image_url: item.image_key ? getPublicImageUrl(item.image_key, c.env) : null,
  }));

  return c.json({ success: true, data: enriched });
});

adminMenuRouter.post(
  '/',
  zValidator('json', MenuItemCreateSchema),
  async (c) => {
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

    const payload = c.req.valid('json');

    const { data, error } = await adminClient
      .from('menu_items')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return c.json(
        { success: false, error: { code: 'INSERT_FAILED', message: error.message } },
        500
      );
    }

    return c.json(
      {
        success: true,
        data: {
          ...data,
          image_url: data.image_key ? getPublicImageUrl(data.image_key, c.env) : null,
        },
      },
      201
    );
  }
);

adminMenuRouter.patch(
  '/:id',
  zValidator('json', MenuItemUpdateSchema),
  async (c) => {
    const adminClient = getSupabaseAdminClient(c.env);
    const id = c.req.param('id');
    const payload = c.req.valid('json');

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
      .from('menu_items')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return c.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: error.message } },
        500
      );
    }

    if (!data) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Menu item not found' } },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        ...data,
        image_url: data.image_key ? getPublicImageUrl(data.image_key, c.env) : null,
      },
    });
  }
);

adminMenuRouter.delete('/:id', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const id = c.req.param('id');

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
    .from('menu_items')
    .update({ is_archived: true, is_available: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return c.json(
      { success: false, error: { code: 'DELETE_FAILED', message: error.message } },
      500
    );
  }

  if (!data) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Menu item not found' } },
      404
    );
  }

  return c.json({
    success: true,
    message: 'Menu item archived successfully',
    data,
  });
});
