import { Hono } from 'hono';
import type { Env, AuthContextVariables } from './types/env';
import { requestLogger } from './middleware/logger';
import { configureCors } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error';
import { healthRouter } from './routes/health';
import { apiV1Router } from './routes/api';
import { getSupabaseAdminClient } from './lib/supabase';

const app = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

app.use('*', requestLogger);
app.use('*', configureCors());

app.route('/health', healthRouter);
app.route('/api/v1', apiV1Router);

app.get('/', (c) => {
  return c.json({
    message: 'Fuck u Bitches',
    health: '/health',
    apiV1: '/api/v1',
  });
});

app.notFound(notFoundHandler);
app.onError(errorHandler);

(app as any).scheduled = async (_event: any, env: Env, _ctx: any) => {
  try {
    const adminClient = getSupabaseAdminClient(env);
    if (adminClient) {
      await adminClient.rpc('reset_daily_category_stock');
    }
  } catch {}
};

export default app;
