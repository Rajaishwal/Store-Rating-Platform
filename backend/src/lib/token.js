import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * The token carries only the user id and role — never the name, email, or
 * anything else. A JWT is signed but not encrypted, so anyone holding it can
 * read its contents; it should reveal as little as possible.
 */
export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
