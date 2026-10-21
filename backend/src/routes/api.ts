import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { staffRequestsRouter } from './staffRequests';
import { publicCategoriesRouter, adminCategoriesRouter } from './categories';
import { publicMenuRouter, adminMenuRouter } from './menu';
import { uploadsRouter } from './uploads';
import { customerOrdersRouter } from './orders';
import { adminOrdersRouter } from './adminOrders';
import { adminInventoryRouter } from './adminInventory';

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
apiV1Router.route('/orders', customerOrdersRouter);
apiV1Router.route('/admin/orders', adminOrdersRouter);
apiV1Router.route('/admin/inventory', adminInventoryRouter);

apiV1Router.get('/', (c) => {
  return c.json(
    {
      name: 'Cafteria REST API',
      version: '1.4.0',
      status: 'active',
      phase: 'Phase 4 - Cart, Order Management & Inventory Control',
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
        verifyUpload: '/api/v1/uploads/verify',
        avatarUrl: '/api/v1/uploads/avatar',
        orders: '/api/v1/orders',
        ordersMe: '/api/v1/orders/me',
        adminOrders: '/api/v1/admin/orders',
        adminInventory: '/api/v1/admin/inventory',
      },
    },
    200
  );
});
