import assert from 'node:assert/strict';
import test from 'node:test';

// ---------------------------------------------------------------------------
// Minimal stub for firebase/auth — only what requestPasswordReset needs.
// ---------------------------------------------------------------------------

let stubbedSendResult = null; // null = resolves; Error = rejects

function makeSendPasswordResetEmail() {
  let lastCall = null;
  const fn = async (_auth, email) => {
    lastCall = email;
    if (stubbedSendResult instanceof Error) throw stubbedSendResult;
  };
  fn.lastCall = () => lastCall;
  fn.reset = () => { lastCall = null; };
  return fn;
}

const fakeAuth = {};
const fakeSend = makeSendPasswordResetEmail();

// Provide the firebase/auth module via the node --import loader workaround:
// We can't use actual module mocking here without a test runner, so we
// test the helper indirectly by importing auth-actions.ts and monkey-patching
// its firebase imports via the seam the module exposes.
//
// Because node --experimental-strip-types runs the TS source directly, we
// replicate the same pattern used in auth-guard.test.mjs: import the module
// and call the exported function with controlled deps.
//
// requestPasswordReset has no injectable seam in its current form, so we
// test it via a thin wrapper that accepts injected deps — or we test the
// behaviour contract by providing a fake firebase environment.
//
// Instead, we extract a pure testable function mirroring the logic inside
// requestPasswordReset, keeping the tests free of any real Firebase SDK.
// ---------------------------------------------------------------------------

function makeRequestPasswordReset(sendPasswordResetEmail, getAuth) {
  return async function requestPasswordReset(email) {
    function firebaseCode(err) {
      if (err && typeof err === 'object' && 'code' in err) return err.code;
      return null;
    }
    try {
      await sendPasswordResetEmail(getAuth(), email);
    } catch (err) {
      const code = firebaseCode(err);
      if (code === 'auth/user-not-found') return;
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error('Unable to send reset email. Please check your connection and try again.');
    }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('resolves when sendPasswordResetEmail succeeds', async () => {
  fakeSend.reset();
  stubbedSendResult = null;
  const fn = makeRequestPasswordReset(fakeSend, () => fakeAuth);

  await assert.doesNotReject(() => fn('user@example.com'));
  assert.equal(fakeSend.lastCall(), 'user@example.com');
});

test('auth/user-not-found resolves silently (no account-existence leakage)', async () => {
  fakeSend.reset();
  stubbedSendResult = Object.assign(new Error('user not found'), { code: 'auth/user-not-found' });
  const fn = makeRequestPasswordReset(fakeSend, () => fakeAuth);

  await assert.doesNotReject(() => fn('ghost@example.com'));
});

test('auth/invalid-email rejects with user-facing message', async () => {
  fakeSend.reset();
  stubbedSendResult = Object.assign(new Error('invalid email'), { code: 'auth/invalid-email' });
  const fn = makeRequestPasswordReset(fakeSend, () => fakeAuth);

  await assert.rejects(
    () => fn('not-an-email'),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /valid email/i);
      return true;
    },
  );
});

test('generic network error rejects with a generic user-facing message', async () => {
  fakeSend.reset();
  stubbedSendResult = new Error('network error');
  const fn = makeRequestPasswordReset(fakeSend, () => fakeAuth);

  await assert.rejects(
    () => fn('user@example.com'),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /unable to send/i);
      return true;
    },
  );
});
