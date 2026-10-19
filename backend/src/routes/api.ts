import { Hono } from 'hono';
import type { Env } from '../types/env';

export const apiV1Router = new Hono<{ Bindings: Env }>();

apiV1Router.get('/', (c) => {
  return c.json(
    {
      name: 'Cafteria REST API',
      version: '1.0.0',
      status: 'active',
      phase: 'Phase 1 - Project Foundation',
      endpoints: {
        health: '/health',
        apiV1: '/api/v1',
      },
    },
    200
  );
});
