import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAuthGuard } from './auth-guard.ts';

test('flag off, no session → returns dev user id', () => {
  const result = resolveAuthGuard({
    authRequired: false,
    sessionUserId: null,
    devUserId: 'usr_dev_001',
    pathname: '/dashboard',
  });
  assert.deepEqual(result, { userId: 'usr_dev_001' });
});

test('flag off, session present → still returns session user', () => {
  const result = resolveAuthGuard({
    authRequired: false,
    sessionUserId: 'usr_abc',
    devUserId: 'usr_dev_001',
    pathname: '/dashboard',
  });
  assert.deepEqual(result, { userId: 'usr_abc' });
});

test('flag on, session present → returns session user', () => {
  const result = resolveAuthGuard({
    authRequired: true,
    sessionUserId: 'usr_abc',
    devUserId: 'usr_dev_001',
    pathname: '/dashboard',
  });
  assert.deepEqual(result, { userId: 'usr_abc' });
});

test('flag on, no session → redirects to /auth/login with next param', () => {
  const result = resolveAuthGuard({
    authRequired: true,
    sessionUserId: null,
    devUserId: 'usr_dev_001',
    pathname: '/dashboard',
  });
  assert.deepEqual(result, { redirectTo: '/auth/login?next=%2Fdashboard' });
});

test('flag on, no session → encodes nested path with query in next', () => {
  const result = resolveAuthGuard({
    authRequired: true,
    sessionUserId: null,
    devUserId: 'usr_dev_001',
    pathname: '/route?origin=jb&dest=ws',
  });
  assert.deepEqual(result, {
    redirectTo: '/auth/login?next=%2Froute%3Forigin%3Djb%26dest%3Dws',
  });
});

test('flag off, no session, no dev user id configured → returns empty user id', () => {
  const result = resolveAuthGuard({
    authRequired: false,
    sessionUserId: null,
    devUserId: '',
    pathname: '/dashboard',
  });
  assert.deepEqual(result, { userId: '' });
});

test('parseAuthRequired treats "true" as true, everything else as false', async () => {
  const { parseAuthRequired } = await import('./auth-guard.ts');
  assert.equal(parseAuthRequired('true'), true);
  assert.equal(parseAuthRequired('false'), false);
  assert.equal(parseAuthRequired(''), false);
  assert.equal(parseAuthRequired(undefined), false);
  assert.equal(parseAuthRequired('1'), false);
  assert.equal(parseAuthRequired('TRUE'), true);
});
