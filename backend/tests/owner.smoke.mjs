import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();
const server = app.listen(4994);
const BASE = 'http://localhost:4994/api';

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

const ownerToken = await login('rajesh.sharma@storerating.com');
const adminToken = await login('admin@storerating.com');
const userToken = await login('aditya.nair@example.com');

const STORELESS_OWNER = 'storeless.owner.test@example.com';
await prisma.user.deleteMany({ where: { email: STORELESS_OWNER } });

console.log('\nACCESS CONTROL');
let r = await call('GET', '/owner/dashboard');
check('no token is rejected', r.status === 401, `got ${r.status}`);
r = await call('GET', '/owner/dashboard', { token: userToken });
check('a normal user is forbidden', r.status === 403, `got ${r.status}`);
r = await call('GET', '/owner/dashboard', { token: adminToken });
check('an administrator is forbidden', r.status === 403, `got ${r.status}`);

console.log('\nDASHBOARD');
r = await call('GET', '/owner/dashboard', { token: ownerToken });
check('owner gets their dashboard', r.status === 200, `got ${r.status}`);
check('returns their own store', r.body.store?.name === 'Greenleaf Organic Grocery Store', r.body.store?.name);
check('average is a number, not a Decimal', typeof r.body.summary.averageRating === 'number');
check('rating count is a number', typeof r.body.summary.ratingCount === 'number');
check('lists the raters', r.body.raters.length === r.body.summary.ratingCount, `${r.body.raters.length} vs ${r.body.summary.ratingCount}`);
check('each rater carries name, email and their score', r.body.raters.every((x) => x.user.name && x.user.email && x.value >= 1 && x.value <= 5));
check('never exposes a rater password hash', !JSON.stringify(r.body).includes('passwordHash'));

// The average the endpoint reports must match the ratings it lists.
const listed = r.body.raters.map((x) => x.value);
const computed = listed.reduce((a, b) => a + b, 0) / listed.length;
check('average matches the listed ratings', Math.abs(computed - r.body.summary.averageRating) < 0.001, `${computed} vs ${r.body.summary.averageRating}`);

console.log('\nSORTING');
r = await call('GET', '/owner/dashboard?sortBy=rating&order=desc', { token: ownerToken });
const desc = r.body.raters.map((x) => x.value);
check('sorts by rating descending', desc.every((v, i) => i === 0 || desc[i - 1] >= v), JSON.stringify(desc));
r = await call('GET', '/owner/dashboard?sortBy=name&order=asc', { token: ownerToken });
const names = r.body.raters.map((x) => x.user.name);
check('sorts by rater name ascending', names.every((v, i) => i === 0 || names[i - 1] <= v), JSON.stringify(names));
r = await call('GET', '/owner/dashboard?sortBy=email&order=desc', { token: ownerToken });
const mails = r.body.raters.map((x) => x.user.email);
check('sorts by rater email descending', mails.every((v, i) => i === 0 || mails[i - 1] >= v));
r = await call('GET', '/owner/dashboard?sortBy=passwordHash', { token: ownerToken });
check('rejects a field outside the whitelist', r.status === 422, `got ${r.status}`);

console.log('\nPAGINATION');
r = await call('GET', '/owner/dashboard?limit=2&page=1', { token: ownerToken });
const firstPage = r.body.raters.map((x) => x.ratingId);
check('honours the page size', r.body.raters.length === 2, `got ${r.body.raters.length}`);
r = await call('GET', '/owner/dashboard?limit=2&page=2', { token: ownerToken });
check('page two returns different raters', !r.body.raters.some((x) => firstPage.includes(x.ratingId)));

console.log('\nISOLATION');
const otherOwnerToken = await login('priya.menon@storerating.com');
r = await call('GET', '/owner/dashboard', { token: otherOwnerToken });
check('a different owner sees a different store', r.body.store.name === 'Sunrise Electronics And Repairs', r.body.store?.name);
const myStore = await prisma.store.findFirst({ where: { name: 'Sunrise Electronics And Repairs' } });
check('only ratings for their own store are listed', r.body.raters.length === (await prisma.rating.count({ where: { storeId: myStore.id } })));

console.log('\nOWNER WITH NO STORE');
const storeless = await prisma.user.create({
  data: {
    name: 'Store Owner Without A Store',
    email: STORELESS_OWNER,
    address: '1 Empty Lane, Nowhere',
    role: 'OWNER',
    // bcrypt hash of Password@123, reused so the account can sign in.
    passwordHash: (await prisma.user.findFirst({ where: { role: 'OWNER' } })).passwordHash,
  },
});
const storelessToken = await login(STORELESS_OWNER);
r = await call('GET', '/owner/dashboard', { token: storelessToken });
check('returns 200, not 404', r.status === 200, `got ${r.status}`);
check('reports a null store rather than erroring', r.body.store === null);
check('average is null, not zero', r.body.summary.averageRating === null);
check('rater list is empty', r.body.raters.length === 0);

await prisma.user.delete({ where: { id: storeless.id } });

console.log(`\n${pass} passed, ${fail} failed\n`);
server.close();
await prisma.$disconnect();
process.exit(fail ? 1 : 0);
