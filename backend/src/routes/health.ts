import { Hono } from 'hono';
import type { Env } from '../types/env';

export const healthRouter = new Hono<{ Bindings: Env }>();

healthRouter.get('/', (c) => {
  return c.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'cafteria-backend',
      version: '1.0.0',
      environment: c.env?.ENVIRONMENT ?? 'development',
    },
    200
  );
});
