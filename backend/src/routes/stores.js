import { Router } from 'express';
import { Prisma } from '../../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';
import {
  listStoresQuerySchema,
  submitRatingSchema,
  STORE_SORT_COLUMNS,
} from '../validators/storeValidators.js';

const router = Router();

/**
 * MySQL hands back AVG() as a Decimal object and COUNT() as a BigInt, neither
 * of which JSON.stringify can serialise — BigInt actually throws. Every raw row
 * goes through here on its way out.
 */
function toStoreResponse(row) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    address: row.address,
    // Null rather than 0 when nobody has rated: "no ratings yet" and "rated
    // zero" are different things, and 0 is not even a valid rating.
    overallRating: row.avgRating === null ? null : Number(row.avgRating),
    ratingCount: Number(row.ratingCount),
    myRating: row.myRating === null ? null : Number(row.myRating),
  };
}

/**
 * Store listing for signed-in users.
 *
 * Written as raw SQL rather than Prisma's query API because the list can be
 * sorted by average rating. That average is computed across a joined table, so
 * sorting it in JavaScript would only order the current page — the wrong rows
 * entirely once there is more than one page.
 */
router.get('/', authenticate, async (req, res) => {
  const { search, sortBy, order, page, limit } = listStoresQuerySchema.parse(req.query);

  const offset = (page - 1) * limit;
  const pattern = search ? `%${search}%` : null;

  // Interpolated, but only ever from the whitelist above.
  const orderColumn = Prisma.raw(STORE_SORT_COLUMNS[sortBy]);
  const orderDirection = Prisma.raw(order === 'desc' ? 'DESC' : 'ASC');

  const filter = pattern
    ? Prisma.sql`WHERE (s.name LIKE ${pattern} OR s.address LIKE ${pattern})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw`
    SELECT
      s.id,
      s.name,
      s.email,
      s.address,
      AVG(r.value)  AS avgRating,
      COUNT(r.id)   AS ratingCount,
      mine.value    AS myRating
    FROM stores s
    -- All ratings, for the overall average.
    LEFT JOIN ratings r    ON r.store_id = s.id
    -- At most one row: the rating this user gave, if any.
    LEFT JOIN ratings mine ON mine.store_id = s.id AND mine.user_id = ${req.user.id}
    ${filter}
    GROUP BY s.id, s.name, s.email, s.address, mine.value
    ORDER BY ${orderColumn} ${orderDirection}, s.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ total }] = await prisma.$queryRaw`
    SELECT COUNT(*) AS total FROM stores s ${filter}
  `;

  const totalCount = Number(total);
  res.json({
    data: rows.map(toStoreResponse),
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  });
});

/**
 * Submit or change a rating.
 *
 * One endpoint, not two. The unique index on (user_id, store_id) makes "rate"
 * and "change my rating" the same operation, so this is an upsert and is safe
 * to call repeatedly — a double-clicked button cannot create a second rating.
 */
router.put('/:storeId/rating', authenticate, authorize('USER'), async (req, res) => {
  const storeId = Number(req.params.storeId);
  if (!Number.isInteger(storeId) || storeId < 1) {
    throw ApiError.badRequest('Invalid store id');
  }

  const { value } = submitRatingSchema.parse(req.body);

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw ApiError.notFound('Store not found');

  const rating = await prisma.rating.upsert({
    where: { userId_storeId: { userId: req.user.id, storeId } },
    create: { userId: req.user.id, storeId, value },
    update: { value },
  });

  // Return the recalculated average so the UI updates without a second request.
  const aggregate = await prisma.rating.aggregate({
    where: { storeId },
    _avg: { value: true },
    _count: true,
  });

  res.json({
    myRating: rating.value,
    overallRating: aggregate._avg.value === null ? null : Number(aggregate._avg.value),
    ratingCount: aggregate._count,
  });
});

export default router;
