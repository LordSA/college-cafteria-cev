import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { generatePresignedUploadUrl } from '../lib/storage';

const PresignRequestSchema = z.object({
  file_type: z.enum(['food_image', 'profile_image']),
  content_type: z.string().min(1),
  file_size: z.number().int().positive(),
});

export const uploadsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

uploadsRouter.post(
  '/presign',
  requireAuth,
  zValidator('json', PresignRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.error.errors.map((e) => e.message).join(', '),
          },
        },
        400
      );
    }
  }),
  async (c) => {
    const user = c.get('user');
    const profile = c.get('profile');
    const payload = c.req.valid('json');

    const isAdmin = profile.app_role === 'admin';

    const result = await generatePresignedUploadUrl(payload, user.id, isAdmin, c.env);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: result.code,
            message: result.message,
          },
        },
        result.statusCode as any
      );
    }

    return c.json({
      success: true,
      data: result.data,
    });
  }
);

uploadsRouter.put('/mock-sink', async (c) => {
  const key = c.req.query('key') || 'mock-file';
  return c.json({
    success: true,
    message: 'Mock file upload accepted in local development environment',
    key,
  });
});
