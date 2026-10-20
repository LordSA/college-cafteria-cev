import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const adminRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

adminRouter.get('/me', requireAuth, requireAdmin, (c) => {
  const user = c.get('user');
  const profile = c.get('profile');

  return c.json(
    {
      success: true,
      data: {
        admin: user,
        profile,
        message: 'Administrator privileges confirmed',
      },
    },
    200
  );
});
