import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();
const server = app.listen(4998);
const BASE = 'http://localhost:4998/api';

let pass = 0, fail = 0;
function check(label, condition, detail = '') {
  if (condition) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} ${detail}`); }
}
async function call(method, path, { body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const TEST_EMAIL = 'phase2.test.user@example.com';
await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });

console.log('\nSIGNUP');
let r = await call('POST', '/auth/signup', {
  body: { name: 'Temporary Phase Two Test User', email: TEST_EMAIL, address: '1 Test Lane, Pune', password: 'Password@123' },
});
check('valid signup returns 201', r.status === 201, `got ${r.status}`);
check('returns a token', typeof r.body?.token === 'string');
check('role defaults to USER', r.body?.user?.role === 'USER', `got ${r.body?.user?.role}`);
check('never returns passwordHash', !JSON.stringify(r.body).includes('passwordHash'));
const userToken = r.body.token;

r = await call('POST', '/auth/signup', {
  body: { name: 'Temporary Phase Two Test User', email: TEST_EMAIL, address: '1 Test Lane, Pune', password: 'Password@123' },
});
check('duplicate email returns 409', r.status === 409, `got ${r.status}`);

console.log('\nPRIVILEGE ESCALATION');
await prisma.user.deleteMany({ where: { email: 'sneaky.escalation@example.com' } });
r = await call('POST', '/auth/signup', {
  body: { name: 'Sneaky Escalation Attempt User', email: 'sneaky.escalation@example.com', address: '2 Test Lane', password: 'Password@123', role: 'ADMIN' },
});
check('injected role:ADMIN is ignored', r.body?.user?.role === 'USER', `got ${r.body?.user?.role}`);
await prisma.user.deleteMany({ where: { email: 'sneaky.escalation@example.com' } });

console.log('\nVALIDATION');
r = await call('POST', '/auth/signup', { body: { name: 'Bob', email: 'bad', address: '', password: 'weak' } });
check('bad input returns 422', r.status === 422, `got ${r.status}`);
check('lists every failing field', new Set(r.body.details.map(d => d.field)).size === 4, JSON.stringify(r.body.details?.map(d=>d.field)));

console.log('\nLOGIN');
r = await call('POST', '/auth/login', { body: { email: 'admin@storerating.com', password: 'Password@123' } });
check('admin logs in', r.status === 200 && r.body.user.role === 'ADMIN', `got ${r.status}`);
const adminToken = r.body.token;

r = await call('POST', '/auth/login', { body: { email: 'admin@storerating.com', password: 'WrongPass@1' } });
check('wrong password returns 401', r.status === 401, `got ${r.status}`);
const wrongPwMsg = r.body.error;
r = await call('POST', '/auth/login', { body: { email: 'nobody@nowhere.com', password: 'WrongPass@1' } });
check('unknown email gives identical message', r.body.error === wrongPwMsg, `"${r.body.error}" vs "${wrongPwMsg}"`);

console.log('\nPROTECTED ROUTES');
r = await call('GET', '/auth/me');
check('no token returns 401', r.status === 401, `got ${r.status}`);
r = await call('GET', '/auth/me', { token: 'garbage.token.here' });
check('invalid token returns 401', r.status === 401, `got ${r.status}`);
r = await call('GET', '/auth/me', { token: adminToken });
check('valid token returns the user', r.status === 200 && r.body.user.email === 'admin@storerating.com');

console.log('\nPASSWORD UPDATE');
r = await call('PATCH', '/auth/password', { token: userToken, body: { currentPassword: 'WrongPass@1', newPassword: 'NewPass@456' } });
check('wrong current password returns 400', r.status === 400, `got ${r.status}`);
r = await call('PATCH', '/auth/password', { token: userToken, body: { currentPassword: 'Password@123', newPassword: 'weak' } });
check('weak new password returns 422', r.status === 422, `got ${r.status}`);
r = await call('PATCH', '/auth/password', { token: userToken, body: { currentPassword: 'Password@123', newPassword: 'Password@123' } });
check('reusing the same password is rejected', r.status === 400, `got ${r.status}`);
r = await call('PATCH', '/auth/password', { token: userToken, body: { currentPassword: 'Password@123', newPassword: 'NewPass@456' } });
check('valid change returns 200', r.status === 200, `got ${r.status}`);
r = await call('POST', '/auth/login', { body: { email: TEST_EMAIL, password: 'NewPass@456' } });
check('can log in with the new password', r.status === 200, `got ${r.status}`);
r = await call('POST', '/auth/login', { body: { email: TEST_EMAIL, password: 'Password@123' } });
check('old password no longer works', r.status === 401, `got ${r.status}`);

await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
console.log(`\n${pass} passed, ${fail} failed\n`);
server.close();
await prisma.$disconnect();
process.exit(fail ? 1 : 0);
