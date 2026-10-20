import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { generatePresignedUploadUrl, getStorageProvider } from '../lib/storage';

const PresignRequestSchema = z.object({
  file_type: z.enum(['food_image', 'profile_image']),
  content_type: z.string().min(1),
  file_size: z.number().int().positive(),
});

const VerifyRequestSchema = z.object({
  object_key: z.string().min(1),
  file_type: z.enum(['food_image', 'profile_image']),
});

export const uploadsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

uploadsRouter.post(
  '/presign',
  requireAuth,
  zValidator('json', PresignRequestSchema),
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

uploadsRouter.post(
  '/verify',
  requireAuth,
  zValidator('json', VerifyRequestSchema),
  async (c) => {
    const user = c.get('user');
    const profile = c.get('profile');
    const { object_key, file_type } = c.req.valid('json');

    if (file_type === 'food_image' && profile.app_role !== 'admin') {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can verify food images',
          },
        },
        403
      );
    }

    if (file_type === 'profile_image') {
      const expectedPrefix = `profiles/${user.id}/`;
      if (!object_key.startsWith(expectedPrefix) && profile.app_role !== 'admin') {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Users can only verify their own profile images',
            },
          },
          403
        );
      }
    }

    try {
      const provider = getStorageProvider(c.env);
      const bucket = file_type === 'food_image' ? 'food-images' : 'profile-images';
      const metadata = await provider.verifyObject(bucket, object_key);

      if (!metadata) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Storage object not found or not yet uploaded',
            },
          },
          404
        );
      }

      const displayUrl = await provider.getDisplayUrl({
        objectKey: object_key,
        fileType: file_type,
      });

      return c.json({
        success: true,
        data: {
          verified: true,
          metadata,
          display_url: displayUrl,
        },
      });
    } catch (err: any) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VERIFY_ERROR',
            message: err.message || 'Failed to verify storage object',
          },
        },
        500
      );
    }
  }
);

uploadsRouter.get('/avatar', requireAuth, async (c) => {
  const user = c.get('user');
  const profile = c.get('profile');

  if (!profile.avatar_key) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No avatar key associated with user profile',
        },
      },
      404
    );
  }

  try {
    const provider = getStorageProvider(c.env);
    const signedUrl = await provider.getDisplayUrl({
      objectKey: profile.avatar_key,
      fileType: 'profile_image',
      expiresIn: 3600,
    });

    return c.json({
      success: true,
      data: {
        avatar_key: profile.avatar_key,
        display_url: signedUrl,
      },
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: {
          code: 'URL_RESOLUTION_FAILED',
          message: err.message || 'Failed to resolve avatar URL',
        },
      },
      500
    );
  }
});

uploadsRouter.put('/mock-sink', async (c) => {
  const key = c.req.query('key') || 'mock-file';
  const bucket = c.req.query('bucket') || 'mock-bucket';
  return c.json({
    success: true,
    message: 'Mock file upload accepted in local development environment',
    key,
    bucket,
  });
});
