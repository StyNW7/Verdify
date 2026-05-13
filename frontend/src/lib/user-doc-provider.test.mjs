import assert from 'node:assert/strict';
import test from 'node:test';

import { createUserDocStore } from './user-doc-store.ts';

// ---------------------------------------------------------------------------
// Fake FirestoreSeams
// ---------------------------------------------------------------------------

// Build a controllable seam that mirrors the FirestoreSeams surface
// UserDocStore depends on: makeDocRef, onSnapshot, and the unsubscribe fn.
function makeFakeSeams() {
  let nextCb = null;
  let errCb = null;
  let unsubCalled = 0;
  let lastUid = null;

  const seams = {
    makeDocRef(uid) {
      lastUid = uid;
      return { _path: `users/${uid}` };
    },
    onSnapshot(_ref, onNext, onError) {
      nextCb = onNext;
      errCb = onError;
      return () => {
        unsubCalled += 1;
      };
    },
  };

  return {
    seams,
    emitSnapshot(data) {
      nextCb?.({ exists: () => true, data: () => data });
    },
    emitMissing() {
      nextCb?.({ exists: () => false, data: () => null });
    },
    emitError(err) {
      errCb?.(err);
    },
    get unsubCalled() {
      return unsubCalled;
    },
    get lastUid() {
      return lastUid;
    },
    isSubscribed: () => nextCb !== null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('1. initial mount: { doc: null, loading: true, error: null }', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);
  assert.deepEqual(store.getSnapshot(), { doc: null, loading: true, error: null });
});

test('2. after snapshot event with valid data: doc populated, loading false', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);
  const teardown = store.start({ uid: 'uid_abc', authRequired: true });

  const userData = { userId: 'uid_abc', greenPointsBalance: 100, displayName: 'Alice' };
  harness.emitSnapshot(userData);

  assert.deepEqual(store.getSnapshot(), { doc: userData, loading: false, error: null });
  teardown();
});

test('3. after error event: { doc: null, loading: false, error: <Error> }', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);
  const teardown = store.start({ uid: 'uid_abc', authRequired: true });

  const err = new Error('permission denied');
  harness.emitError(err);

  assert.deepEqual(store.getSnapshot(), { doc: null, loading: false, error: err });
  teardown();
});

test('4. unmount: unsubscribe is called', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);
  const teardown = store.start({ uid: 'uid_abc', authRequired: true });

  assert.equal(harness.unsubCalled, 0);
  teardown();
  assert.equal(harness.unsubCalled, 1);
});

test('5. auth user change: previous unsubscribe called before new subscription starts', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);

  const teardown1 = store.start({ uid: 'uid_a', authRequired: true });
  assert.equal(harness.lastUid, 'uid_a');
  assert.equal(harness.unsubCalled, 0);

  // User changes: new start() tears down old subscription first.
  const teardown2 = store.start({ uid: 'uid_b', authRequired: true });
  assert.equal(harness.unsubCalled, 1, 'old subscription must be torn down before new one starts');
  assert.equal(harness.lastUid, 'uid_b');

  teardown2();
  assert.equal(harness.unsubCalled, 2);

  // teardown1 is now a no-op (already torn down inside start()).
  teardown1();
  assert.equal(harness.unsubCalled, 2, 'stale teardown must not double-unsubscribe');
});

test('6. dev bypass (authRequired=false): no Firestore call, returns inert state', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);
  const teardown = store.start({ uid: 'uid_abc', authRequired: false });

  assert.deepEqual(store.getSnapshot(), { doc: null, loading: false, error: null });
  assert.equal(harness.isSubscribed(), false, 'onSnapshot must not be called in dev-bypass mode');
  teardown();
});

test('null uid stays loading without calling onSnapshot', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);
  const teardown = store.start({ uid: null, authRequired: true });

  assert.deepEqual(store.getSnapshot(), { doc: null, loading: true, error: null });
  assert.equal(harness.isSubscribed(), false);
  teardown();
});

test('missing doc (exists=false) sets doc to null with loading=false', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);
  const teardown = store.start({ uid: 'uid_abc', authRequired: true });

  harness.emitMissing();

  assert.deepEqual(store.getSnapshot(), { doc: null, loading: false, error: null });
  teardown();
});

test('subscribers are notified on each snapshot change', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);
  let count = 0;
  const unsub = store.subscribe(() => { count += 1; });

  store.start({ uid: 'uid_abc', authRequired: true });
  harness.emitSnapshot({ userId: 'uid_abc', greenPointsBalance: 50 });
  harness.emitError(new Error('oops'));

  assert.ok(count >= 2, `expected at least 2 notifications, got ${count}`);
  unsub();
});

test('sign-out then sign-in: second subscription uses new uid', () => {
  const harness = makeFakeSeams();
  const store = createUserDocStore(harness.seams);

  const teardown1 = store.start({ uid: 'uid_a', authRequired: true });
  harness.emitSnapshot({ userId: 'uid_a', greenPointsBalance: 10 });
  assert.equal(store.getSnapshot().doc?.userId, 'uid_a');

  // Sign-out: uid becomes null
  teardown1();
  store.start({ uid: null, authRequired: true });
  assert.deepEqual(store.getSnapshot(), { doc: null, loading: true, error: null });

  // Sign-in with a new user
  const harness2 = makeFakeSeams();
  // Swap seams to simulate a new subscription context by starting with new uid
  const store2 = createUserDocStore(harness2.seams);
  store2.start({ uid: 'uid_b', authRequired: true });
  harness2.emitSnapshot({ userId: 'uid_b', greenPointsBalance: 200 });
  assert.equal(store2.getSnapshot().doc?.userId, 'uid_b');
});
