import { z } from 'zod';
import { nameField, emailField, addressField, passwordField } from './fields.js';

/**
 * Public registration. Deliberately has no `role` field: a self-registered
 * account is always a normal user, and the route hard-codes that. Accepting a
 * role here would let anyone mint an administrator.
 */
export const signupSchema = z.object({
  name: nameField,
  email: emailField,
  address: addressField,
  password: passwordField,
});

/**
 * Login intentionally does NOT apply the password rules. Accounts created
 * before a rule change must still be able to sign in, and rejecting a login for
 * "password too short" would leak that the rules differ from the stored value.
 */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
});
