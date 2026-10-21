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
import { customerWalletRouter } from './wallet';
import { adminWalletRouter } from './adminWallet';

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
apiV1Router.route('/wallet', customerWalletRouter);
apiV1Router.route('/admin/wallets', adminWalletRouter);

apiV1Router.get('/', (c) => {
  return c.json(
    {
      name: 'Cafteria REST API',
      version: '1.4.1',
      status: 'active',
      phase: 'Phase 4.1 - Testing Wallet, QR Order Verification & Bill Printing',
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
        walletMe: '/api/v1/wallet/me',
        walletTx: '/api/v1/wallet/transactions',
        adminWallets: '/api/v1/admin/wallets',
        verifyQr: '/api/v1/admin/orders/verify-qr',
        collectOrder: '/api/v1/admin/orders/:id/collect',
      },
    },
    200
  );
});
