import { prisma } from '../lib/prisma.js';
import { verifyToken } from '../lib/token.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies the bearer token and loads the current user onto `req.user`.
 *
 * The user is re-read from the database on every request rather than trusted
 * from the token body. A token stays valid until it expires, so a user deleted
 * or given a different role would otherwise keep their old access for days.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token';
    return next(ApiError.unauthorized(message));
  }

  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
  if (!user) {
    return next(ApiError.unauthorized('Account no longer exists'));
  }

  req.user = user;
  return next();
}

/**
 * Restricts a route to specific roles. Always used after `authenticate`.
 *
 *   router.get('/dashboard', authenticate, authorize('ADMIN'), handler)
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires one of: ${roles.join(', ')}`));
    }
    return next();
  };
}
