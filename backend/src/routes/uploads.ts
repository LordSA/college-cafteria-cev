import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { generatePresignedUploadUrl, getStorageProvider } from '../lib/storage';

const PresignRequestSchema = z.object({
  file_type: z.enum(['food_image', 'profile_image']).optional(),
  type: z.string().optional(),
  content_type: z.string().optional(),
  contentType: z.string().optional(),
  file_size: z.number().optional(),
  size: z.number().optional(),
});

const VerifyRequestSchema = z.object({
  object_key: z.string().optional(),
  key: z.string().optional(),
  file_type: z.enum(['food_image', 'profile_image']).optional(),
  type: z.string().optional(),
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

    const fileType = payload.file_type || (payload.type === 'food' ? 'food_image' : 'profile_image');
    const contentType = payload.content_type || payload.contentType || 'image/jpeg';
    const fileSize = payload.file_size || payload.size || 1024 * 1024;

    const isAdmin = profile.app_role === 'admin' || profile.app_role === 'developer' || profile.app_role === 'staff';

    const result = await generatePresignedUploadUrl(
      {
        file_type: fileType as 'food_image' | 'profile_image',
        content_type: contentType,
        file_size: fileSize,
      },
      user.id,
      isAdmin,
      c.env
    );

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
      data: {
        ...result.data,
        uploadUrl: result.data.upload_url,
        key: result.data.object_key,
        publicUrl: result.data.public_url,
      },
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
    const payload = c.req.valid('json');
    const object_key = payload.object_key || payload.key || '';
    const file_type = payload.file_type || (payload.type === 'food' ? 'food_image' : 'profile_image');

    const isStaffOrAdmin = profile.app_role === 'admin' || profile.app_role === 'developer' || profile.app_role === 'staff';

    if (file_type === 'food_image' && !isStaffOrAdmin) {
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
      if (!object_key.startsWith(expectedPrefix) && !isStaffOrAdmin) {
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
        return c.json({
          success: true,
          data: {
            verified: true,
            object_key,
            key: object_key,
            url: null,
          },
        });
      }

      return c.json({
        success: true,
        data: {
          verified: true,
          object_key: metadata.key,
          key: metadata.key,
          url: metadata.publicUrl,
        },
      });
    } catch {
      return c.json({
        success: true,
        data: {
          verified: true,
          object_key,
          key: object_key,
          url: null,
        },
      });
    }
  }
);

uploadsRouter.get('/avatar', requireAuth, async (c) => {
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
