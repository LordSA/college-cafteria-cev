import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const ProfileUpdateSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_key: z.string().max(300).optional().nullable(),
  teacher_id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\-_]{3,20}$/, 'Teacher ID must be 3-20 characters consisting of letters, numbers, hyphens, or underscores')
    .optional()
    .nullable(),
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

  if (payload.teacher_id !== undefined) {
    const formattedId = payload.teacher_id ? payload.teacher_id.trim().toUpperCase() : null;

    if (formattedId) {
      const { data: existingTeacher } = await adminClient
        .from('profiles')
        .select('id')
        .eq('teacher_id', formattedId)
        .neq('id', user.id)
        .maybeSingle();

      if (existingTeacher) {
        return c.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_TEACHER_ID',
              message: `Teacher ID "${formattedId}" is already registered to another faculty account.`,
            },
          },
          409
        );
      }

      updateFields.teacher_id = formattedId;
      updateFields.requested_account_type = 'staff';
      updateFields.staff_approval_status = 'pending';
    } else {
      updateFields.teacher_id = null;
    }
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
