import { createMiddleware } from 'hono/factory';
import type { Env, AuthContextVariables } from '../types/env';
import { verifySupabaseToken } from '../lib/supabase';

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or malformed Authorization header. Expected Bearer <token>',
        },
      },
      401
    );
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Bearer token string is empty',
        },
      },
      401
    );
  }

  const result = await verifySupabaseToken(token, c.env);

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      },
      result.statusCode
    );
  }

  c.set('user', result.user);
  c.set('profile', result.profile);

  return await next();
});

export const requireAdmin = createMiddleware<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>(async (c, next) => {
  const profile = c.get('profile');

  if (!profile) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      },
      401
    );
  }

  if (profile.app_role !== 'admin') {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Administrator privileges required',
        },
      },
      403
    );
  }

  return await next();
});
