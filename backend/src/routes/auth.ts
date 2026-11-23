import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const ProfileUpdateSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_key: z.string().max(300).optional().nullable(),
});

export const authRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

authRouter.use('*', requireAuth);

authRouter.get('/me', (c) => {
  const user = c.get('user');
  const profile = c.get('profile');

  return c.json(
    {
      success: true,
      data: {
        user,
        profile,
      },
    },
    200
  );
});

authRouter.patch('/me/profile', zValidator('json', ProfileUpdateSchema), async (c) => {
  const user = c.get('user');
  const payload = c.req.valid('json');
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.display_name !== undefined) {
    updateFields.display_name = payload.display_name.trim();
  }

  if (payload.avatar_key !== undefined) {
    updateFields.avatar_key = payload.avatar_key ? payload.avatar_key.trim() : null;
  }

  const { data: updatedProfile, error: updateErr } = await adminClient
    .from('profiles')
    .update(updateFields)
    .eq('id', user.id)
    .select('*')
    .single();

  if (updateErr) {
    return c.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
      500
    );
  }

  return c.json({
    success: true,
    data: updatedProfile,
  });
});
