import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';

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
