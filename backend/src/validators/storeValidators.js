import { z } from 'zod';
import { ratingField } from './fields.js';

/**
 * Columns a client may sort by, mapped to the SQL they become.
 *
 * This whitelist is the reason sorting is safe: the value from the query string
 * is used to look up a fixed SQL fragment, never interpolated into the query.
 * `ORDER BY ${req.query.sortBy}` would be a SQL injection hole.
 */
export const STORE_SORT_COLUMNS = {
  name: 's.name',
  address: 's.address',
  rating: 'avgRating',
};

export const listStoresQuerySchema = z.object({
  search: z.string().trim().max(400).optional(),
  sortBy: z.enum(Object.keys(STORE_SORT_COLUMNS)).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const submitRatingSchema = z.object({
  value: ratingField,
});
