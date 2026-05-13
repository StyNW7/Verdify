import assert from 'node:assert/strict';
import test from 'node:test';

import { initialAuthState, reduceAuth } from './auth-state.ts';

test('initial state is loading with no user or token', () => {
  assert.deepEqual(initialAuthState, { user: null, idToken: null, loading: true });
});

test('auth_state event populates the user and clears loading', () => {
  const user = {
    uid: 'uid_abc',
    email: 'u@example.com',
    displayName: 'U',
    photoURL: null,
  };
  const next = reduceAuth(initialAuthState, { kind: 'auth_state', user });
  assert.deepEqual(next, { user, idToken: null, loading: false });
});

test('auth_state with null user is the signed-out resting state', () => {
  // First simulate a signed-in user...
  const signedIn = reduceAuth(initialAuthState, {
    kind: 'auth_state',
    user: { uid: 'uid_x', email: null, displayName: null, photoURL: null },
  });
  const signedOut = reduceAuth(signedIn, { kind: 'auth_state', user: null });
  assert.deepEqual(signedOut, { user: null, idToken: signedIn.idToken, loading: false });
});

test('id_token event updates exposed token without touching user', () => {
  const withUser = reduceAuth(initialAuthState, {
    kind: 'auth_state',
    user: { uid: 'uid_x', email: null, displayName: null, photoURL: null },
  });
  const withToken = reduceAuth(withUser, { kind: 'id_token', token: 'tok_1' });
  assert.equal(withToken.idToken, 'tok_1');
  assert.equal(withToken.user?.uid, 'uid_x');

  const refreshed = reduceAuth(withToken, { kind: 'id_token', token: 'tok_2' });
  assert.equal(refreshed.idToken, 'tok_2', 'token-change events must update idToken');
});

test('id_token event with null clears the token', () => {
  const seeded = reduceAuth(initialAuthState, { kind: 'id_token', token: 'tok' });
  const cleared = reduceAuth(seeded, { kind: 'id_token', token: null });
  assert.equal(cleared.idToken, null);
});

test('sign_out clears both user and idToken', () => {
  const populated = {
    user: { uid: 'uid_x', email: null, displayName: null, photoURL: null },
    idToken: 'tok',
    loading: false,
  };
  const next = reduceAuth(populated, { kind: 'sign_out' });
  assert.equal(next.user, null);
  assert.equal(next.idToken, null);
  assert.equal(next.loading, false);
});
