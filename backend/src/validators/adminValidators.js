import { z } from 'zod';
import { nameField, emailField, addressField, passwordField, roleField } from './fields.js';

/**
 * Sortable columns for the admin user listing, mapped to Prisma field names.
 * A request may only name a key of this object, so no client-supplied string
 * ever reaches the query as a column name.
 */
export const USER_SORT_FIELDS = {
  name: 'name',
  email: 'email',
  address: 'address',
  role: 'role',
  createdAt: 'createdAt',
};

/** Same idea for the admin store listing, but these become raw SQL fragments. */
export const ADMIN_STORE_SORT_COLUMNS = {
  name: 's.name',
  email: 's.email',
  address: 's.address',
  owner: 'owner.name',
  rating: 'avgRating',
};

export const listUsersQuerySchema = z.object({
  name: z.string().trim().max(60).optional(),
  email: z.string().trim().max(255).optional(),
  address: z.string().trim().max(400).optional(),
  role: roleField.optional(),
  sortBy: z.enum(Object.keys(USER_SORT_FIELDS)).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listAdminStoresQuerySchema = z.object({
  name: z.string().trim().max(60).optional(),
  email: z.string().trim().max(255).optional(),
  address: z.string().trim().max(400).optional(),
  sortBy: z.enum(Object.keys(ADMIN_STORE_SORT_COLUMNS)).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Admin user creation. Unlike public signup this DOES accept a role — that is
 * the whole point of the endpoint — but it sits behind authorize('ADMIN').
 */
export const createUserSchema = z.object({
  name: nameField,
  email: emailField,
  address: addressField,
  password: passwordField,
  role: roleField.default('USER'),
});

export const createStoreSchema = z.object({
  name: nameField,
  email: emailField,
  address: addressField,
  // Optional: a store may be registered before its owner has an account.
  ownerId: z.coerce.number().int().positive().nullable().optional(),
});
