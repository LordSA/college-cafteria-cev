import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types/env';

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  const isDev = (c.env?.ENVIRONMENT ?? 'development') === 'development';

  if (err instanceof HTTPException) {
    console.error(`[HTTPException] ${err.status}: ${err.message}`);
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: `HTTP_${err.status}`,
          status: err.status,
        },
      },
      err.status
    );
  }

  console.error('[UnhandledError]', err.name, err.message, isDev ? err.stack : undefined);

  return c.json(
    {
      success: false,
      error: {
        message: isDev ? err.message : 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
      },
    },
    500
  );
};

export const notFoundHandler: NotFoundHandler<{ Bindings: Env }> = (c) => {
  return c.json(
    {
      success: false,
      error: {
        message: `Endpoint not found: ${c.req.method} ${c.req.path}`,
        code: 'NOT_FOUND',
        status: 404,
      },
    },
    404
  );
};
