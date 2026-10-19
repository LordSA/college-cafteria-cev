import { Hono } from 'hono';
import type { Env } from './types/env';
import { requestLogger } from './middleware/logger';
import { configureCors } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error';
import { healthRouter } from './routes/health';
import { apiV1Router } from './routes/api';

const app = new Hono<{ Bindings: Env }>();

app.use('*', requestLogger);
app.use('*', configureCors());

app.route('/health', healthRouter);
app.route('/api/v1', apiV1Router);

app.get('/', (c) => {
  return c.json({
    message: 'Welcome to Cafteria API',
    health: '/health',
    apiV1: '/api/v1',
  });
});

app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
