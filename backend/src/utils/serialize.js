/**
 * The only place a user is turned into JSON for a client.
 *
 * Routes must never return a Prisma user object directly: it carries
 * `passwordHash`, and a single forgotten `delete user.passwordHash` would leak
 * every hash on the platform. Whitelisting fields means a column added later is
 * private by default.
 */
export function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
    role: user.role,
    createdAt: user.createdAt,
  };
}
