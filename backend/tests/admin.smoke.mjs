import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();
const server = app.listen(4995);
const BASE = 'http://localhost:4995/api';

let pass = 0;
let fail = 0;
function check(label, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label} ${detail}`);
  }
}
async function call(method, path, { body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function login(email) {
  const r = await call('POST', '/auth/login', { body: { email, password: 'Password@123' } });
  return r.body.token;
}

const adminToken = await login('admin@storerating.com');
const userToken = await login('aditya.nair@example.com');
const ownerToken = await login('rajesh.sharma@storerating.com');

// Test fixtures are removed first so the suite is re-runnable.
const CREATED_EMAILS = [
  'created.admin.account@example.com',
  'created.owner.account@example.com',
  'created.normal.account@example.com',
];
const CREATED_STORE_EMAILS = ['created.store@example.com', 'owned.created.store@example.com'];
await prisma.store.deleteMany({ where: { email: { in: CREATED_STORE_EMAILS } } });
await prisma.user.deleteMany({ where: { email: { in: CREATED_EMAILS } } });

console.log('\nACCESS CONTROL');
let r = await call('GET', '/admin/dashboard');
check('no token is rejected', r.status === 401, `got ${r.status}`);
r = await call('GET', '/admin/dashboard', { token: userToken });
check('a normal user is forbidden', r.status === 403, `got ${r.status}`);
r = await call('GET', '/admin/dashboard', { token: ownerToken });
check('a store owner is forbidden', r.status === 403, `got ${r.status}`);
r = await call('POST', '/admin/users', {
  token: userToken,
  body: {
    name: 'Escalation Attempt Account Name',
    email: 'should.never.exist@example.com',
    address: '1 Nowhere',
    password: 'Password@123',
    role: 'ADMIN',
  },
});
check('a normal user cannot create an admin', r.status === 403, `got ${r.status}`);
check(
  'and no account was created',
  (await prisma.user.count({ where: { email: 'should.never.exist@example.com' } })) === 0,
);

console.log('\nDASHBOARD');
r = await call('GET', '/admin/dashboard', { token: adminToken });
const totals = r.body.totals;
check('returns all three totals', r.status === 200 && 'users' in totals && 'stores' in totals && 'ratings' in totals, JSON.stringify(totals));
check(
  'totals match the database',
  totals.users === (await prisma.user.count()) &&
    totals.stores === (await prisma.store.count()) &&
    totals.ratings === (await prisma.rating.count()),
  JSON.stringify(totals),
);

console.log('\nUSER LISTING');
r = await call('GET', '/admin/users', { token: adminToken });
check('lists users', r.body.data.length > 0);
check('never exposes a password hash', !JSON.stringify(r.body).includes('passwordHash'));
check('includes role', 'role' in r.body.data[0]);

r = await call('GET', '/admin/users?role=OWNER', { token: adminToken });
check('filters by role', r.body.data.every((u) => u.role === 'OWNER'), JSON.stringify(r.body.data.map((u) => u.role)));
check('owners carry their store rating', r.body.data.every((u) => u.ownedStore && typeof u.ownedStore.rating === 'number'), JSON.stringify(r.body.data.map((u) => u.ownedStore)));

r = await call('GET', '/admin/users?name=Aditya', { token: adminToken });
check('filters by name', r.body.data.length === 1 && r.body.data[0].name.includes('Aditya'));
r = await call('GET', '/admin/users?email=storerating.com', { token: adminToken });
check('filters by email', r.body.data.every((u) => u.email.includes('storerating.com')));
r = await call('GET', '/admin/users?address=Kolkata', { token: adminToken });
check('filters by address', r.body.data.length === 1 && r.body.data[0].address.includes('Kolkata'));
r = await call('GET', '/admin/users?name=Aditya&role=ADMIN', { token: adminToken });
check('combines filters with AND', r.body.data.length === 0, JSON.stringify(r.body.data));

console.log('\nUSER SORTING');
r = await call('GET', '/admin/users?sortBy=email&order=asc', { token: adminToken });
const emails = r.body.data.map((u) => u.email);
check('sorts by email ascending', emails.every((v, i) => i === 0 || emails[i - 1] <= v), JSON.stringify(emails));
r = await call('GET', '/admin/users?sortBy=name&order=desc', { token: adminToken });
const names = r.body.data.map((u) => u.name);
check('sorts by name descending', names.every((v, i) => i === 0 || names[i - 1] >= v));
r = await call('GET', '/admin/users?sortBy=passwordHash', { token: adminToken });
check('rejects a column outside the whitelist', r.status === 422, `got ${r.status}`);

console.log('\nUSER DETAIL');
const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
r = await call('GET', `/admin/users/${owner.id}`, { token: adminToken });
check('returns the user', r.status === 200 && r.body.user.id === owner.id);
check('a store owner carries their store and its rating', r.body.user.ownedStore !== null && typeof r.body.user.ownedStore.rating === 'number', JSON.stringify(r.body.user.ownedStore));
const normal = await prisma.user.findFirst({ where: { role: 'USER' } });
r = await call('GET', `/admin/users/${normal.id}`, { token: adminToken });
check('a normal user has no owned store', r.body.user.ownedStore === null);
check('reports how many ratings they submitted', typeof r.body.user.ratingsSubmitted === 'number');
r = await call('GET', '/admin/users/999999', { token: adminToken });
check('unknown id returns 404', r.status === 404, `got ${r.status}`);

console.log('\nCREATING USERS');
r = await call('POST', '/admin/users', {
  token: adminToken,
  body: {
    name: 'Created Administrator Account',
    email: CREATED_EMAILS[0],
    address: '10 Admin Street, Bengaluru',
    password: 'Password@123',
    role: 'ADMIN',
  },
});
check('admin can create an admin', r.status === 201 && r.body.user.role === 'ADMIN', `got ${r.status}`);
check('the new admin can sign in', typeof (await login(CREATED_EMAILS[0])) === 'string');

r = await call('POST', '/admin/users', {
  token: adminToken,
  body: {
    name: 'Created Store Owner Account',
    email: CREATED_EMAILS[1],
    address: '11 Owner Street, Pune',
    password: 'Password@123',
    role: 'OWNER',
  },
});
check('admin can create a store owner', r.status === 201 && r.body.user.role === 'OWNER');
const newOwnerId = r.body.user.id;

r = await call('POST', '/admin/users', {
  token: adminToken,
  body: {
    name: 'Created Normal User Account',
    email: CREATED_EMAILS[2],
    address: '12 User Street, Chennai',
    password: 'Password@123',
  },
});
check('role defaults to USER when omitted', r.status === 201 && r.body.user.role === 'USER');

r = await call('POST', '/admin/users', {
  token: adminToken,
  body: { name: 'Short', email: 'bad', address: '', password: 'weak', role: 'WIZARD' },
});
check('validates every field', r.status === 422, `got ${r.status}`);
check('rejects an unknown role', r.body.details.some((d) => d.field === 'role'));

r = await call('POST', '/admin/users', {
  token: adminToken,
  body: {
    name: 'Created Administrator Account',
    email: CREATED_EMAILS[0],
    address: '10 Admin Street',
    password: 'Password@123',
    role: 'ADMIN',
  },
});
check('duplicate email returns 409', r.status === 409, `got ${r.status}`);

console.log('\nSTORE LISTING');
r = await call('GET', '/admin/stores', { token: adminToken });
check('lists stores with email', r.body.data.length > 0 && 'email' in r.body.data[0]);
check('rating is a number or null, never a Decimal', r.body.data.every((s) => s.rating === null || typeof s.rating === 'number'));
check('rating count is a number, never a BigInt', r.body.data.every((s) => typeof s.ratingCount === 'number'));
check('owned stores name their owner', r.body.data.some((s) => s.owner !== null));
check('unowned stores report a null owner', r.body.data.some((s) => s.owner === null));

r = await call('GET', '/admin/stores?name=Coffee', { token: adminToken });
check('filters by name', r.body.data.length === 1 && /Coffee/i.test(r.body.data[0].name));
r = await call('GET', '/admin/stores?address=Mumbai', { token: adminToken });
check('filters by address', r.body.data.every((s) => /Mumbai/.test(s.address)));
r = await call('GET', '/admin/stores?email=greenleaf', { token: adminToken });
check('filters by email', r.body.data.length === 1);
r = await call('GET', '/admin/stores?sortBy=rating&order=desc', { token: adminToken });
const ratings = r.body.data.map((s) => s.rating ?? -1);
check('sorts by rating descending', ratings.every((v, i) => i === 0 || ratings[i - 1] >= v), JSON.stringify(ratings));
r = await call('GET', '/admin/stores?sortBy=ownerId', { token: adminToken });
check('rejects a column outside the whitelist', r.status === 422, `got ${r.status}`);

console.log('\nCREATING STORES');
r = await call('POST', '/admin/stores', {
  token: adminToken,
  body: {
    name: 'Newly Created Unowned Store',
    email: CREATED_STORE_EMAILS[0],
    address: '20 New Street, Jaipur',
  },
});
check('creates a store with no owner', r.status === 201 && r.body.store.owner === undefined, `got ${r.status}`);
check('a new store has a null rating, not zero', r.body.store.rating === null);

r = await call('POST', '/admin/stores', {
  token: adminToken,
  body: {
    name: 'Newly Created Owned Store',
    email: CREATED_STORE_EMAILS[1],
    address: '21 New Street, Jaipur',
    ownerId: newOwnerId,
  },
});
check('creates a store assigned to an owner', r.status === 201, `got ${r.status}`);

r = await call('POST', '/admin/stores', {
  token: adminToken,
  body: {
    name: 'Second Store For Same Owner',
    email: 'second.store@example.com',
    address: '22 New Street',
    ownerId: newOwnerId,
  },
});
check('one owner cannot hold two stores', r.status === 409, `got ${r.status}`);

const normalUser = await prisma.user.findFirst({ where: { role: 'USER' } });
r = await call('POST', '/admin/stores', {
  token: adminToken,
  body: {
    name: 'Store For A Non Owner Account',
    email: 'nonowner.store@example.com',
    address: '23 New Street',
    ownerId: normalUser.id,
  },
});
check('a normal user cannot be made a store owner this way', r.status === 400, `got ${r.status}`);

r = await call('POST', '/admin/stores', {
  token: adminToken,
  body: {
    name: 'Store With A Missing Owner Id',
    email: 'missingowner.store@example.com',
    address: '24 New Street',
    ownerId: 999999,
  },
});
check('an unknown owner id is rejected', r.status === 400, `got ${r.status}`);

r = await call('POST', '/admin/stores', {
  token: adminToken,
  body: {
    name: 'Newly Created Unowned Store',
    email: CREATED_STORE_EMAILS[0],
    address: '25 New Street',
  },
});
check('duplicate store email returns 409', r.status === 409, `got ${r.status}`);

console.log('\nDASHBOARD REFLECTS THE NEW RECORDS');
r = await call('GET', '/admin/dashboard', { token: adminToken });
check('user total grew by three', r.body.totals.users === totals.users + 3, `${r.body.totals.users} vs ${totals.users}`);
check('store total grew by two', r.body.totals.stores === totals.stores + 2, `${r.body.totals.stores} vs ${totals.stores}`);

// Clean up so the suite can run again from the same seed.
await prisma.store.deleteMany({ where: { email: { in: CREATED_STORE_EMAILS } } });
await prisma.user.deleteMany({ where: { email: { in: CREATED_EMAILS } } });
r = await call('GET', '/admin/dashboard', { token: adminToken });
check('cleanup restored the original totals', r.body.totals.users === totals.users && r.body.totals.stores === totals.stores);

console.log(`\n${pass} passed, ${fail} failed\n`);
server.close();
await prisma.$disconnect();
process.exit(fail ? 1 : 0);
