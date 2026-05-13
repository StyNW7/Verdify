import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthStore } from './auth-store.ts';

// Build a controllable set of seams that mirrors the firebase/auth surface
// AuthProvider depends on: two independent subscription callbacks, a signOut
// function, and an installer for the api.ts token getter.
function makeFakeSeams() {
  let authStateCb = null;
  let idTokenCb = null;
  const calls = { signOut: 0, setTokenGetter: 0 };
  let tokenGetter = null;

  const seams = {
    subscribeAuthState(cb) {
      authStateCb = cb;
      return () => {
        if (authStateCb === cb) authStateCb = null;
      };
    },
    subscribeIdToken(cb) {
      idTokenCb = cb;
      return () => {
        if (idTokenCb === cb) idTokenCb = null;
      };
    },
    signOut: async () => {
      calls.signOut += 1;
    },
    setTokenGetter: (getter) => {
      calls.setTokenGetter += 1;
      tokenGetter = getter;
    },
  };

  return {
    seams,
    calls,
    emitAuthState: (user) => authStateCb?.(user),
    emitIdToken: (user) => idTokenCb?.(user),
    readToken: () => (tokenGetter ? tokenGetter() : null),
    isSubscribed: () => ({ auth: authStateCb !== null, id: idTokenCb !== null }),
  };
}

function fakeUser(uid, token) {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: uid,
    photoURL: null,
    getIdToken: async () => token,
  };
}

test('initial snapshot is loading with no user or token', () => {
  const { seams } = makeFakeSeams();
  const store = createAuthStore(seams);
  const teardown = store.start();
  assert.deepEqual(store.getSnapshot(), { user: null, idToken: null, loading: true });
  teardown();
});

test('auth callback firing with null clears loading and leaves user null', () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);
  const teardown = store.start();

  harness.emitAuthState(null);

  assert.deepEqual(store.getSnapshot(), { user: null, idToken: null, loading: false });
  teardown();
});

test('auth callback firing with a signed-in user populates user', () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);
  const teardown = store.start();

  harness.emitAuthState(fakeUser('uid_abc', 'tok_1'));

  const snap = store.getSnapshot();
  assert.deepEqual(snap.user, {
    uid: 'uid_abc',
    email: 'uid_abc@example.com',
    displayName: 'uid_abc',
    photoURL: null,
  });
  assert.equal(snap.loading, false);
  teardown();
});

test('id-token callback resolves getIdToken() and exposes the token', async () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);
  const teardown = store.start();

  harness.emitIdToken(fakeUser('uid_abc', 'tok_1'));
  // getIdToken() resolves on a microtask — flush it.
  await new Promise((r) => setImmediate(r));

  assert.equal(store.getSnapshot().idToken, 'tok_1');
  teardown();
});

test('subsequent id-token events update idToken AND the api.ts token getter', async () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);
  const teardown = store.start();

  // setTokenGetter is installed at construction time (so the closure that
  // reads snapshot.idToken is wired before subscriptions fire).
  assert.ok(harness.calls.setTokenGetter >= 1, 'setTokenGetter must be wired on construction');

  harness.emitIdToken(fakeUser('uid_abc', 'tok_1'));
  await new Promise((r) => setImmediate(r));
  assert.equal(store.getSnapshot().idToken, 'tok_1');
  assert.equal(harness.readToken(), 'tok_1', 'api.ts getter must see the latest token');

  // Token refresh (same user, new token).
  harness.emitIdToken(fakeUser('uid_abc', 'tok_2'));
  await new Promise((r) => setImmediate(r));
  assert.equal(store.getSnapshot().idToken, 'tok_2');
  assert.equal(harness.readToken(), 'tok_2', 'token rotation must land on the api.ts getter');

  teardown();
});

test('id-token callback with null clears the token immediately', () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);
  const teardown = store.start();

  harness.emitIdToken(null);

  assert.equal(store.getSnapshot().idToken, null);
  assert.equal(harness.readToken(), null);
  teardown();
});

test('signOut on the store invokes the seam signOut function', async () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);
  const teardown = store.start();

  await store.signOut();
  assert.equal(harness.calls.signOut, 1);

  // The seam contract is: signOut triggers a downstream auth-state event with
  // null. Simulate that and confirm the snapshot clears.
  harness.emitAuthState(fakeUser('uid_abc', 'tok'));
  harness.emitAuthState(null);
  assert.deepEqual(store.getSnapshot().user, null);

  teardown();
});

test('subscribers are notified on each snapshot change', () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);
  const teardown = store.start();
  let count = 0;
  const unsub = store.subscribe(() => {
    count += 1;
  });

  harness.emitAuthState(null);
  harness.emitAuthState(fakeUser('uid_x', 'tok'));
  harness.emitIdToken(null);

  assert.ok(count >= 3, `expected at least 3 notifications, got ${count}`);
  unsub();
  teardown();
});

test('teardown unsubscribes from both auth and id-token streams', () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);
  const teardown = store.start();
  assert.deepEqual(harness.isSubscribed(), { auth: true, id: true });

  teardown();

  assert.deepEqual(harness.isSubscribed(), { auth: false, id: false });
});

test('start() is idempotent — calling twice does not double-subscribe', () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);

  const teardown1 = store.start();
  // Capture the only subscriber wired so far.
  const firstSubscribers = harness.isSubscribed();
  assert.deepEqual(firstSubscribers, { auth: true, id: true });

  // Second start should be a no-op while already started.
  const teardown2 = store.start();

  // Both teardown functions are safe to call; only the real teardown
  // (teardown1) actually unwires the seams.
  teardown2();
  assert.deepEqual(harness.isSubscribed(), { auth: true, id: true }, 'no-op teardown must not unsubscribe');

  teardown1();
  assert.deepEqual(harness.isSubscribed(), { auth: false, id: false });
});

test('start() after teardown re-subscribes — survives Strict Mode cleanup/remount', () => {
  const harness = makeFakeSeams();
  const store = createAuthStore(harness.seams);

  const teardown1 = store.start();
  assert.deepEqual(harness.isSubscribed(), { auth: true, id: true });

  teardown1();
  assert.deepEqual(harness.isSubscribed(), { auth: false, id: false });

  // Simulate React 18 Strict Mode: cleanup ran, now the effect runs again
  // on the same cached store. start() must re-wire the seams instead of
  // leaving the store as a disposed husk.
  const teardown2 = store.start();
  assert.deepEqual(harness.isSubscribed(), { auth: true, id: true }, 'restart must re-subscribe');

  // And the re-wired callbacks actually drive snapshot updates.
  harness.emitAuthState(fakeUser('uid_after_restart', 'tok'));
  assert.equal(store.getSnapshot().user?.uid, 'uid_after_restart');

  teardown2();
});

test('getRedirectResult resolving to a user populates snapshot and token getter', async () => {
  const harness = makeFakeSeams();
  const user = fakeUser('uid_google', 'tok_redirect');

  const seamWithRedirect = {
    ...harness.seams,
    getRedirectResult: async () => ({ user, idToken: 'tok_redirect' }),
  };

  const store = createAuthStore(seamWithRedirect);
  const teardown = store.start();

  // getRedirectResult is async — flush microtasks.
  await new Promise((r) => setImmediate(r));

  const snap = store.getSnapshot();
  assert.deepEqual(snap.user, {
    uid: 'uid_google',
    email: 'uid_google@example.com',
    displayName: 'uid_google',
    photoURL: null,
  });
  assert.equal(snap.idToken, 'tok_redirect');
  assert.equal(snap.loading, false);
  assert.equal(harness.readToken(), 'tok_redirect', 'api.ts getter must reflect redirect token');

  teardown();
});

test('getRedirectResult resolving to null leaves snapshot unchanged', async () => {
  const harness = makeFakeSeams();

  const seamWithRedirect = {
    ...harness.seams,
    getRedirectResult: async () => null,
  };

  const store = createAuthStore(seamWithRedirect);
  const teardown = store.start();
  await new Promise((r) => setImmediate(r));

  assert.deepEqual(store.getSnapshot(), { user: null, idToken: null, loading: true });

  teardown();
});
