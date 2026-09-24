import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { listRatersQuerySchema, RATER_SORT_ORDERS } from '../validators/ownerValidators.js';

const router = Router();

// Store-owner area. Applied once so a route added later is guarded by default.
router.use(authenticate, authorize('OWNER'));

/**
 * Everything the owner dashboard needs: their store, its average rating, and
 * the people who rated it.
 */
router.get('/dashboard', async (req, res) => {
  const { sortBy, order, page, limit } = listRatersQuerySchema.parse(req.query);

  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });

  // An owner account can exist before a store is assigned to it, so this is a
  // normal state rather than an error. Returning 404 here would make a new
  // owner's first login look broken.
  if (!store) {
    return res.json({
      store: null,
      summary: { averageRating: null, ratingCount: 0 },
      raters: [],
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    });
  }

  const [aggregate, ratings, total] = await Promise.all([
    prisma.rating.aggregate({
      where: { storeId: store.id },
      _avg: { value: true },
      _count: true,
    }),
    prisma.rating.findMany({
      where: { storeId: store.id },
      orderBy: RATER_SORT_ORDERS[sortBy](order),
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true, address: true } } },
    }),
    prisma.rating.count({ where: { storeId: store.id } }),
  ]);

  res.json({
    store: {
      id: store.id,
      name: store.name,
      email: store.email,
      address: store.address,
    },
    summary: {
      // Null rather than 0 when nobody has rated yet.
      averageRating: aggregate._avg.value === null ? null : Number(aggregate._avg.value),
      ratingCount: aggregate._count,
    },
    raters: ratings.map((rating) => ({
      ratingId: rating.id,
      value: rating.value,
      // updatedAt, not createdAt: a changed rating should surface as recent
      // activity, which is what an owner is looking for.
      ratedAt: rating.updatedAt,
      user: rating.user,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

export default router;
