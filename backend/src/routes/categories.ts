import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
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
adminCategoriesRouter.use('*', requireAdmin);

adminCategoriesRouter.get('/', async (c) => {
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
