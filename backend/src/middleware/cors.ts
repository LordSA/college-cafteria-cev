import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/env';

export const configureCors = () => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const rawOrigins = c.env?.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:3001';
    const allowedOrigins = rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const corsMiddleware = cors({
      origin: (requestOrigin) => {
        if (!requestOrigin) return null;
        if (
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(requestOrigin) ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
        ) {
          return requestOrigin;
        }
        return null;
      },
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key', 'idempotency-key'],
      exposeHeaders: ['Content-Length', 'X-Request-Id'],
      maxAge: 86400,
      credentials: true,
    });

    return corsMiddleware(c, next);
  });
};
