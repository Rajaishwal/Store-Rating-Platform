import { z } from 'zod';

/**
 * The platform's form-validation rules, defined once.
 *
 * Every route composes its schema from these fields, so a rule change happens
 * in exactly one place. The frontend mirrors the same rules for instant
 * feedback, but these are the ones that actually decide what enters the
 * database — client-side validation is a convenience, never a guarantee.
 */

export const nameField = z
  .string()
  .trim()
  .min(20, 'Name must be at least 20 characters')
  .max(60, 'Name must be at most 60 characters');

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address'))
  .pipe(z.string().max(255, 'Email must be at most 255 characters'));

export const addressField = z
  .string()
  .trim()
  .min(1, 'Address is required')
  .max(400, 'Address must be at most 400 characters');

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(16, 'Password must be at most 16 characters')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character');

export const ratingField = z
  .number()
  .int('Rating must be a whole number')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating must be at most 5');

export const roleField = z.enum(['ADMIN', 'USER', 'OWNER']);
