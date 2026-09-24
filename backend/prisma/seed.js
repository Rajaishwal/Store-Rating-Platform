import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';

/**
 * Seeds a realistic dataset for development and review.
 *
 * Note every name is at least 20 characters: that is the platform's own
 * validation rule, and seed data that violates it would be rejected by the very
 * forms that display it.
 *
 * Re-runnable — it clears the tables first, so `npm run db:seed` always
 * produces the same known state.
 */

const PASSWORD = 'Password@123';

const OWNERS = [
  {
    name: 'Rajesh Kumar Sharma Verma',
    email: 'rajesh.sharma@storerating.com',
    address: '14 Jubilee Hills Road No 3, Hyderabad, Telangana 500033',
    store: {
      name: 'Greenleaf Organic Grocery Store',
      email: 'contact@greenleafgrocery.com',
      address: '14 Jubilee Hills Road No 3, Hyderabad, Telangana 500033',
    },
  },
  {
    name: 'Priya Nair Krishnan Menon',
    email: 'priya.menon@storerating.com',
    address: '221 Marine Drive, Ernakulam, Kochi, Kerala 682031',
    store: {
      name: 'Sunrise Electronics And Repairs',
      email: 'support@sunriseelectronics.com',
      address: '221 Marine Drive, Ernakulam, Kochi, Kerala 682031',
    },
  },
  {
    name: 'Arjun Deshmukh Patil Rao',
    email: 'arjun.patil@storerating.com',
    address: '58 Fergusson College Road, Shivajinagar, Pune, Maharashtra 411004',
    store: {
      name: 'The Cornerstone Book Emporium',
      email: 'hello@cornerstonebooks.com',
      address: '58 Fergusson College Road, Shivajinagar, Pune, Maharashtra 411004',
    },
  },
];

const NORMAL_USERS = [
  {
    name: 'Aditya Raghunath Iyer Nair',
    email: 'aditya.nair@example.com',
    address: '7 Brigade Road, Ashok Nagar, Bengaluru, Karnataka 560025',
  },
  {
    name: 'Sneha Bhattacharya Ghosh',
    email: 'sneha.ghosh@example.com',
    address: '92 Park Street, Kolkata, West Bengal 700016',
  },
  {
    name: 'Vikram Singh Rathore Chauhan',
    email: 'vikram.rathore@example.com',
    address: '33 Civil Lines, Jaipur, Rajasthan 302006',
  },
  {
    name: 'Meera Lakshmi Subramanian',
    email: 'meera.subramanian@example.com',
    address: '108 Anna Salai, Teynampet, Chennai, Tamil Nadu 600018',
  },
  {
    name: 'Karan Malhotra Bajaj Kapoor',
    email: 'karan.kapoor@example.com',
    address: '45 Connaught Place, New Delhi, Delhi 110001',
  },
];

/** Stores with no owner account — admins can register a store before its owner signs up. */
const UNOWNED_STORES = [
  {
    name: 'Urban Threads Clothing Boutique',
    email: 'care@urbanthreads.com',
    address: '12 Linking Road, Bandra West, Mumbai, Maharashtra 400050',
  },
  {
    name: 'Mountain View Coffee Roasters',
    email: 'brew@mountainviewcoffee.com',
    address: '3 Mall Road, Dehradun, Uttarakhand 248001',
  },
  {
    name: 'Silverline Hardware And Tools',
    email: 'sales@silverlinehardware.com',
    address: '76 GT Road, Ludhiana, Punjab 141008',
  },
];

/**
 * Fixed rating matrix: rows are normal users, columns are stores, 0 means the
 * user has not rated that store. Hard-coded rather than randomised so averages
 * are stable across reseeds and easy to verify by hand.
 */
const RATING_MATRIX = [
  [5, 4, 5, 3, 0, 4],
  [4, 5, 4, 0, 5, 3],
  [3, 3, 5, 4, 4, 0],
  [5, 0, 4, 5, 3, 5],
  [0, 4, 3, 4, 5, 4],
];

async function main() {
  console.log('Clearing existing data...');
  // Order matters: ratings reference both other tables, stores reference users.
  await prisma.rating.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, env.BCRYPT_ROUNDS);

  console.log('Creating administrator...');
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator Account',
      email: 'admin@storerating.com',
      passwordHash,
      address: 'Platform HQ, 1 Residency Road, Bengaluru, Karnataka 560025',
      role: 'ADMIN',
    },
  });

  console.log('Creating store owners and their stores...');
  const ownedStores = [];
  for (const owner of OWNERS) {
    const user = await prisma.user.create({
      data: {
        name: owner.name,
        email: owner.email,
        passwordHash,
        address: owner.address,
        role: 'OWNER',
      },
    });
    ownedStores.push(
      await prisma.store.create({ data: { ...owner.store, ownerId: user.id } }),
    );
  }

  console.log('Creating unowned stores...');
  const unownedStores = [];
  for (const store of UNOWNED_STORES) {
    unownedStores.push(await prisma.store.create({ data: store }));
  }

  console.log('Creating normal users...');
  const users = [];
  for (const user of NORMAL_USERS) {
    users.push(
      await prisma.user.create({
        data: { ...user, passwordHash, role: 'USER' },
      }),
    );
  }

  console.log('Creating ratings...');
  const stores = [...ownedStores, ...unownedStores];
  const ratings = [];
  RATING_MATRIX.forEach((row, userIndex) => {
    row.forEach((value, storeIndex) => {
      if (value > 0) {
        ratings.push({ userId: users[userIndex].id, storeId: stores[storeIndex].id, value });
      }
    });
  });
  await prisma.rating.createMany({ data: ratings });

  console.log('\nSeed complete.');
  console.table({
    users: await prisma.user.count(),
    stores: await prisma.store.count(),
    ratings: await prisma.rating.count(),
  });

  console.log(`\nAll accounts share the password: ${PASSWORD}\n`);
  console.log(`  Admin        ${admin.email}`);
  console.log(`  Store owner  ${OWNERS[0].email}`);
  console.log(`  Normal user  ${NORMAL_USERS[0].email}\n`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
