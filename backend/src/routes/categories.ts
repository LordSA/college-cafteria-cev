import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  daily_reset: z.boolean().default(false),
});

const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  daily_reset: z.boolean().optional(),
});

export const publicCategoriesRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

export const adminCategoriesRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

publicCategoriesRouter.get('/', async (c) => {
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
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  return c.json({ success: true, data: data || [] });
});

adminCategoriesRouter.use('*', requireAuth);
adminCategoriesRouter.use('*', requireRole(['developer', 'admin', 'staff']));

adminCategoriesRouter.get('/', async (c) => {
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
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  return c.json({ success: true, data: data || [] });
});

adminCategoriesRouter.post(
  '/',
  zValidator('json', CategoryCreateSchema),
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
      .from('categories')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return c.json(
        {
          success: false,
          error: { code: 'INSERT_FAILED', message: error.message },
        },
        error.code === '23505' ? 409 : 500
      );
    }

    return c.json({ success: true, data }, 201);
  }
);

adminCategoriesRouter.patch(
  '/:id',
  zValidator('json', CategoryUpdateSchema),
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
      .from('categories')
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
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        404
      );
    }

    return c.json({ success: true, data });
  }
);

adminCategoriesRouter.delete('/:id', async (c) => {
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

  const { count, error: countErr } = await adminClient
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countErr) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: countErr.message } },
      500
    );
  }

  if (count && count > 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'CATEGORY_IN_USE',
          message: `Cannot remove category: ${count} menu item(s) are currently assigned to it. Please reassign or delete those dishes first, or toggle this category inactive.`,
        },
      },
      400
    );
  }

  const { data, error } = await adminClient
    .from('categories')
    .delete()
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
      { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
      404
    );
  }

  return c.json({
    success: true,
    message: 'Category removed successfully',
    data,
  });
});
