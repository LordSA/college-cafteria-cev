import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { authRouter } from './auth';
import { adminRouter } from './admin';

export const apiV1Router = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

apiV1Router.route('/auth', authRouter);
apiV1Router.route('/admin', adminRouter);

apiV1Router.get('/', (c) => {
  return c.json(
    {
      name: 'Cafteria REST API',
      version: '1.1.0',
      status: 'active',
      phase: 'Phase 2 - Authentication, Authorization & Database Security',
      endpoints: {
        health: '/health',
        apiV1: '/api/v1',
        authMe: '/api/v1/auth/me',
        adminMe: '/api/v1/admin/me',
      },
    },
    200
  );
});
