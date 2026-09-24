import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { toPublicUser } from '../utils/serialize.js';
import { ApiError } from '../utils/ApiError.js';
import {
  listUsersQuerySchema,
  listAdminStoresQuerySchema,
  createUserSchema,
  createStoreSchema,
  USER_SORT_FIELDS,
  ADMIN_STORE_SORT_COLUMNS,
} from '../validators/adminValidators.js';

const router = Router();

// Every route in this file is administrator-only. Applying the guards once
// here means a route added later cannot accidentally ship unprotected.
router.use(authenticate, authorize('ADMIN'));

/** Case-insensitive "contains" filter, or undefined so Prisma omits the clause. */
function contains(value) {
  return value ? { contains: value } : undefined;
}

/** Averages for a set of stores, as a Map of storeId to { average, count }. */
async function ratingsByStore(storeIds) {
  if (storeIds.length === 0) return new Map();
  const grouped = await prisma.rating.groupBy({
    by: ['storeId'],
    where: { storeId: { in: storeIds } },
    _avg: { value: true },
    _count: true,
  });
  return new Map(
    grouped.map((row) => [
      row.storeId,
      { average: row._avg.value === null ? null : Number(row._avg.value), count: row._count },
    ]),
  );
}

/** Totals for the dashboard. */
router.get('/dashboard', async (req, res) => {
  // Run concurrently: three independent counts should not be three round trips
  // in series.
  const [users, stores, ratings] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.rating.count(),
  ]);

  res.json({ totals: { users, stores, ratings } });
});

/**
 * User listing with filters on name, email, address and role.
 *
 * Uses Prisma's query API rather than raw SQL because every sortable column is
 * a real column on `users` — there is nothing computed to order by, so the
 * extra complexity of hand-written SQL would buy nothing.
 */
router.get('/users', async (req, res) => {
  const { name, email, address, role, sortBy, order, page, limit } = listUsersQuerySchema.parse(
    req.query,
  );

  const where = {
    name: contains(name),
    email: contains(email),
    address: contains(address),
    role: role ?? undefined,
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [USER_SORT_FIELDS[sortBy]]: order },
      skip: (page - 1) * limit,
      take: limit,
      include: { ownedStore: { select: { id: true, name: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  // Store owners show the rating of the store they own, so an admin can judge
  // an owner without opening their detail page.
  const averages = await ratingsByStore(
    users.filter((user) => user.ownedStore).map((user) => user.ownedStore.id),
  );

  res.json({
    data: users.map((user) => ({
      ...toPublicUser(user),
      ownedStore: user.ownedStore
        ? {
            id: user.ownedStore.id,
            name: user.ownedStore.name,
            rating: averages.get(user.ownedStore.id)?.average ?? null,
            ratingCount: averages.get(user.ownedStore.id)?.count ?? 0,
          }
        : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

/** One user in full. Store owners additionally carry their store's rating. */
router.get('/users/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) throw ApiError.badRequest('Invalid user id');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ownedStore: true, _count: { select: { ratings: true } } },
  });
  if (!user) throw ApiError.notFound('User not found');

  let ownedStore = null;
  if (user.ownedStore) {
    const aggregate = await prisma.rating.aggregate({
      where: { storeId: user.ownedStore.id },
      _avg: { value: true },
      _count: true,
    });
    ownedStore = {
      id: user.ownedStore.id,
      name: user.ownedStore.name,
      email: user.ownedStore.email,
      address: user.ownedStore.address,
      rating: aggregate._avg.value === null ? null : Number(aggregate._avg.value),
      ratingCount: aggregate._count,
    };
  }

  res.json({
    user: {
      ...toPublicUser(user),
      // How many ratings this person has submitted, which is a different
      // number from the rating their own store received.
      ratingsSubmitted: user._count.ratings,
      ownedStore,
    },
  });
});

/** Create a user of any role. */
router.post('/users', async (req, res) => {
  const data = createUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      address: data.address,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, env.BCRYPT_ROUNDS),
    },
  });

  res.status(201).json({ user: toPublicUser(user) });
});

/**
 * Store listing with filters on name, email and address.
 *
 * Raw SQL here, unlike the user listing, because this one can be sorted by
 * average rating — a value computed across a joined table. Sorting that in
 * JavaScript would only order the current page.
 */
router.get('/stores', async (req, res) => {
  const { name, email, address, sortBy, order, page, limit } = listAdminStoresQuerySchema.parse(
    req.query,
  );

  const conditions = [];
  if (name) conditions.push(Prisma.sql`s.name LIKE ${`%${name}%`}`);
  if (email) conditions.push(Prisma.sql`s.email LIKE ${`%${email}%`}`);
  if (address) conditions.push(Prisma.sql`s.address LIKE ${`%${address}%`}`);
  const filter =
    conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;

  // Interpolated, but only ever from the whitelist.
  const orderColumn = Prisma.raw(ADMIN_STORE_SORT_COLUMNS[sortBy]);
  const orderDirection = Prisma.raw(order === 'desc' ? 'DESC' : 'ASC');

  const rows = await prisma.$queryRaw`
    SELECT
      s.id,
      s.name,
      s.email,
      s.address,
      s.owner_id     AS ownerId,
      owner.name     AS ownerName,
      AVG(r.value)   AS avgRating,
      COUNT(r.id)    AS ratingCount
    FROM stores s
    LEFT JOIN ratings r    ON r.store_id = s.id
    LEFT JOIN users owner  ON owner.id = s.owner_id
    ${filter}
    GROUP BY s.id, s.name, s.email, s.address, s.owner_id, owner.name
    ORDER BY ${orderColumn} ${orderDirection}, s.id ASC
    LIMIT ${limit} OFFSET ${(page - 1) * limit}
  `;

  const [{ total }] = await prisma.$queryRaw`
    SELECT COUNT(*) AS total FROM stores s ${filter}
  `;

  const totalCount = Number(total);
  res.json({
    // MySQL returns AVG() as a Decimal and COUNT() as a BigInt, which
    // JSON.stringify throws on. Convert both.
    data: rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      email: row.email,
      address: row.address,
      rating: row.avgRating === null ? null : Number(row.avgRating),
      ratingCount: Number(row.ratingCount),
      owner: row.ownerId ? { id: Number(row.ownerId), name: row.ownerName } : null,
    })),
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  });
});

/** Register a store, optionally assigning an existing owner account. */
router.post('/stores', async (req, res) => {
  const data = createStoreSchema.parse(req.body);

  const existing = await prisma.store.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('A store with this email already exists');

  if (data.ownerId) {
    const owner = await prisma.user.findUnique({
      where: { id: data.ownerId },
      include: { ownedStore: { select: { id: true } } },
    });

    // Checked explicitly rather than left to the foreign key, so the admin
    // gets a message naming the actual problem.
    if (!owner) throw ApiError.badRequest('The selected owner account does not exist');
    if (owner.role !== 'OWNER') {
      throw ApiError.badRequest('The selected account is not a store owner');
    }
    if (owner.ownedStore) {
      throw ApiError.conflict('That owner already has a store');
    }
  }

  const store = await prisma.store.create({
    data: {
      name: data.name,
      email: data.email,
      address: data.address,
      ownerId: data.ownerId ?? null,
    },
  });

  res.status(201).json({
    store: {
      id: store.id,
      name: store.name,
      email: store.email,
      address: store.address,
      // A brand-new store has no ratings, so null rather than 0.
      rating: null,
      ratingCount: 0,
    },
  });
});

export default router;
