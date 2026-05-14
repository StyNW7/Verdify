import assert from 'node:assert/strict';
import test from 'node:test';

import { pickAvatar } from './avatar-source.ts';

// pickAvatar(authUser, userDoc) -> { kind, value }
// Priority: photoURL -> presetAvatar -> initials

test('photoURL present: returns kind=photo with the url', () => {
  const result = pickAvatar(
    { photoURL: 'https://google.com/photo.jpg', displayName: 'Alice Chen' },
    { presetAvatar: '🌿' },
  );
  assert.equal(result.kind, 'photo');
  assert.equal(result.value, 'https://google.com/photo.jpg');
});

test('photoURL present + no presetAvatar: returns photo', () => {
  const result = pickAvatar(
    { photoURL: 'https://google.com/photo.jpg', displayName: null },
    null,
  );
  assert.equal(result.kind, 'photo');
  assert.equal(result.value, 'https://google.com/photo.jpg');
});

test('no photoURL + presetAvatar present: returns preset', () => {
  const result = pickAvatar(
    { photoURL: null, displayName: 'Alice Chen' },
    { presetAvatar: '🌿' },
  );
  assert.equal(result.kind, 'preset');
  assert.equal(result.value, '🌿');
});

test('no photoURL + presetAvatar + no displayName: returns preset', () => {
  const result = pickAvatar(
    { photoURL: null, displayName: null },
    { presetAvatar: '🦊' },
  );
  assert.equal(result.kind, 'preset');
  assert.equal(result.value, '🦊');
});

test('no photoURL + no presetAvatar + displayName: returns initials', () => {
  const result = pickAvatar(
    { photoURL: null, displayName: 'Alice Chen' },
    null,
  );
  assert.equal(result.kind, 'initials');
  assert.equal(result.value, 'AC');
});

test('no photoURL + no presetAvatar + single-word displayName: returns first letter', () => {
  const result = pickAvatar(
    { photoURL: null, displayName: 'Alice' },
    { presetAvatar: '' },
  );
  assert.equal(result.kind, 'initials');
  assert.equal(result.value, 'A');
});

test('no photoURL + no presetAvatar + no displayName: returns VD fallback', () => {
  const result = pickAvatar(
    { photoURL: null, displayName: null },
    null,
  );
  assert.equal(result.kind, 'initials');
  assert.equal(result.value, 'VD');
});

test('null authUser + no userDoc: returns VD fallback', () => {
  const result = pickAvatar(null, null);
  assert.equal(result.kind, 'initials');
  assert.equal(result.value, 'VD');
});
