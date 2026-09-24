import { z } from 'zod';

/**
 * Sort options for the list of people who rated the owner's store.
 *
 * Each key maps to a Prisma `orderBy` object rather than a column name, because
 * two of them sort on a joined relation. As with every other listing, the value
 * from the query string is only ever used as a key into this object.
 */
export const RATER_SORT_ORDERS = {
  name: (order) => ({ user: { name: order } }),
  email: (order) => ({ user: { email: order } }),
  rating: (order) => ({ value: order }),
  ratedAt: (order) => ({ updatedAt: order }),
};

export const listRatersQuerySchema = z.object({
  sortBy: z.enum(Object.keys(RATER_SORT_ORDERS)).default('ratedAt'),
  // Most recent first is the useful default for an owner checking in.
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
