import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/env';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
  'cf-access-jwt-assertion',
]);

const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'key',
  'secret',
  'password',
  'code',
  'auth',
]);

function sanitizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    for (const param of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAMS.has(param.toLowerCase())) {
        url.searchParams.set(param, '[REDACTED]');
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return urlString;
  }
}

export function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
}

export const requestLogger = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const sanitizedPath = sanitizeUrl(c.req.url);

  console.log(`[REQ] ${method} ${sanitizedPath}`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`[RES] ${method} ${sanitizedPath} -> ${status} (${duration}ms)`);
});
