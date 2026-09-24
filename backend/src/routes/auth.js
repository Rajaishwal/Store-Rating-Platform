import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { signToken } from '../lib/token.js';
import { authenticate } from '../middleware/auth.js';
import { toPublicUser } from '../utils/serialize.js';
import { ApiError } from '../utils/ApiError.js';
import { signupSchema, loginSchema, updatePasswordSchema } from '../validators/authValidators.js';

const router = Router();

/**
 * Public registration. The role is hard-coded to USER — it is never read from
 * the request body, so no amount of crafted JSON can create an administrator.
 */
router.post('/signup', async (req, res) => {
  const data = signupSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      address: data.address,
      passwordHash: await bcrypt.hash(data.password, env.BCRYPT_ROUNDS),
      role: 'USER',
    },
  });

  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
});

/** Single login for all three roles — the returned role decides what the UI shows. */
router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });

  // Same message whether the email is unknown or the password is wrong, so the
  // endpoint cannot be used to discover which emails are registered.
  const invalid = ApiError.unauthorized('Invalid email or password');
  if (!user) {
    // Hash anyway: returning early on an unknown email makes the response
    // measurably faster, which leaks whether the account exists.
    await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    throw invalid;
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw invalid;
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
});

/** Lets the frontend restore the session on a page refresh. */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

/** Password update, available to every signed-in role. */
router.patch('/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);

  if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  if (await bcrypt.compare(newPassword, req.user.passwordHash)) {
    throw ApiError.badRequest('New password must be different from the current password');
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS) },
  });

  res.json({ message: 'Password updated successfully' });
});

export default router;
