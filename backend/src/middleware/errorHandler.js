import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Single place that turns any thrown value into a JSON error response.
 * Express 5 forwards rejected promises here automatically, so route handlers
 * never need their own try/catch.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma unique-constraint violation, surfaced as a readable conflict.
  if (err?.code === 'P2002') {
    const field = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({ error: `A record with this ${field} already exists` });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' ? { message: err?.message } : {}),
  });
}
