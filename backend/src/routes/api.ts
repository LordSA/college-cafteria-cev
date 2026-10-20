import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { staffRequestsRouter } from './staffRequests';
import { publicCategoriesRouter, adminCategoriesRouter } from './categories';
import { publicMenuRouter, adminMenuRouter } from './menu';
import { uploadsRouter } from './uploads';

export const apiV1Router = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

apiV1Router.route('/auth', authRouter);
apiV1Router.route('/admin', adminRouter);
apiV1Router.route('/admin/staff-requests', staffRequestsRouter);
apiV1Router.route('/categories', publicCategoriesRouter);
apiV1Router.route('/admin/categories', adminCategoriesRouter);
apiV1Router.route('/menu', publicMenuRouter);
apiV1Router.route('/admin/menu', adminMenuRouter);
apiV1Router.route('/uploads', uploadsRouter);

apiV1Router.get('/', (c) => {
  return c.json(
    {
      name: 'Cafteria REST API',
      version: '1.2.0',
      status: 'active',
      phase: 'Phase 3 - Menu Management, Staff Approval & Account Recovery',
      endpoints: {
        health: '/health',
        apiV1: '/api/v1',
        authMe: '/api/v1/auth/me',
        adminMe: '/api/v1/admin/me',
        staffRequests: '/api/v1/admin/staff-requests',
        categories: '/api/v1/categories',
        adminCategories: '/api/v1/admin/categories',
        menu: '/api/v1/menu',
        adminMenu: '/api/v1/admin/menu',
        presignUpload: '/api/v1/uploads/presign',
      },
    },
    200
  );
});
