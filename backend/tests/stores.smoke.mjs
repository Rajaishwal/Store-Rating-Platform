import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();
const server = app.listen(4996);
const BASE = 'http://localhost:4996/api';

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

const userToken = await login('aditya.nair@example.com');
const ownerToken = await login('rajesh.sharma@storerating.com');

console.log('\nACCESS');
let r = await call('GET', '/stores');
check('listing requires a token', r.status === 401, `got ${r.status}`);

console.log('\nLISTING');
r = await call('GET', '/stores', { token: userToken });
check('returns all six seeded stores', r.body.data?.length === 6, `got ${r.body.data?.length}`);
check('includes pagination metadata', r.body.pagination?.total === 6);
const first = r.body.data[0];
check(
  'each store carries overall rating, count and my rating',
  'overallRating' in first && 'ratingCount' in first && 'myRating' in first,
  JSON.stringify(first),
);
check('overall rating is a number, not a Decimal object', typeof first.overallRating === 'number');
check('rating count is a number, not a BigInt', typeof first.ratingCount === 'number');
check('default order is name ascending', r.body.data[0].name < r.body.data[1].name);

console.log('\nSEARCH');
r = await call('GET', '/stores?search=coffee', { token: userToken });
check('matches on store name', r.body.data.length === 1 && /Coffee/i.test(r.body.data[0].name));
r = await call('GET', '/stores?search=Kerala', { token: userToken });
check('matches on address', r.body.data.length === 1 && /Kerala/.test(r.body.data[0].address));
r = await call('GET', '/stores?search=zzzznothing', { token: userToken });
check('no match returns an empty list, not an error', r.status === 200 && r.body.data.length === 0);

console.log('\nSORTING');
r = await call('GET', '/stores?sortBy=rating&order=desc', { token: userToken });
const ratings = r.body.data.map((s) => s.overallRating);
check('sorts by average rating descending', ratings.every((v, i) => i === 0 || ratings[i - 1] >= v), JSON.stringify(ratings));
r = await call('GET', '/stores?sortBy=name&order=desc', { token: userToken });
check('sorts by name descending', r.body.data[0].name > r.body.data[1].name);
r = await call('GET', '/stores?sortBy=password', { token: userToken });
check('rejects a column outside the whitelist', r.status === 422, `got ${r.status}`);

console.log('\nPAGINATION');
r = await call('GET', '/stores?limit=2&page=1', { token: userToken });
const pageOne = r.body.data.map((s) => s.id);
check('honours the page size', r.body.data.length === 2);
check('reports the right page count', r.body.pagination.totalPages === 3, JSON.stringify(r.body.pagination));
r = await call('GET', '/stores?limit=2&page=2', { token: userToken });
check('page two returns different stores', !r.body.data.some((s) => pageOne.includes(s.id)));

console.log('\nSTORE WITH NO RATINGS');
const emptyStore = await prisma.store.create({
  data: {
    name: 'Brand New Unrated Test Store',
    email: 'unrated.test@example.com',
    address: '99 Nowhere Street, Testville',
  },
});
r = await call('GET', '/stores?search=Unrated', { token: userToken });
check('appears in the listing', r.body.data.length === 1, `got ${r.body.data.length}`);
check('overall rating is null, not zero', r.body.data[0].overallRating === null, `got ${r.body.data[0].overallRating}`);
check('rating count is zero', r.body.data[0].ratingCount === 0);

console.log('\nSUBMITTING A RATING');
const before = await prisma.rating.count();
r = await call('PUT', `/stores/${emptyStore.id}/rating`, { token: userToken, body: { value: 4 } });
check('first submission returns 200', r.status === 200, `got ${r.status}`);
check('returns my rating and the new average', r.body.myRating === 4 && r.body.overallRating === 4);
check('created exactly one rating row', (await prisma.rating.count()) === before + 1);

r = await call('PUT', `/stores/${emptyStore.id}/rating`, { token: userToken, body: { value: 2 } });
check('resubmitting updates in place', r.body.myRating === 2);
check('still only one rating row', (await prisma.rating.count()) === before + 1);

r = await call('GET', '/stores?search=Unrated', { token: userToken });
check('listing reflects my rating', r.body.data[0].myRating === 2, `got ${r.body.data[0].myRating}`);

console.log('\nRATING VALIDATION AND PERMISSIONS');
r = await call('PUT', `/stores/${emptyStore.id}/rating`, { token: userToken, body: { value: 6 } });
check('rejects a rating above 5', r.status === 422, `got ${r.status}`);
r = await call('PUT', `/stores/${emptyStore.id}/rating`, { token: userToken, body: { value: 0 } });
check('rejects a rating below 1', r.status === 422, `got ${r.status}`);
r = await call('PUT', `/stores/${emptyStore.id}/rating`, { token: userToken, body: { value: 3.5 } });
check('rejects a fractional rating', r.status === 422, `got ${r.status}`);
r = await call('PUT', `/stores/${emptyStore.id}/rating`, { token: ownerToken, body: { value: 5 } });
check('store owners cannot rate', r.status === 403, `got ${r.status}`);
r = await call('PUT', '/stores/999999/rating', { token: userToken, body: { value: 5 } });
check('unknown store returns 404', r.status === 404, `got ${r.status}`);

// Clean up: deleting the store cascades to its rating.
await prisma.store.delete({ where: { id: emptyStore.id } });
check('cleanup left the rating count unchanged', (await prisma.rating.count()) === before);

console.log(`\n${pass} passed, ${fail} failed\n`);
server.close();
await prisma.$disconnect();
process.exit(fail ? 1 : 0);
