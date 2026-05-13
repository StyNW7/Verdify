import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getInitialTripDefaults,
  applyDocSnapshot,
} from './trip-defaults-state.ts';

// ---------------------------------------------------------------------------
// Tests for the no-revert guarantee in TripDefaultsCard.
// The component must NOT overwrite an in-progress user selection when a
// Firestore onSnapshot fires before the user clicks "Apply".
// ---------------------------------------------------------------------------

test('getInitialTripDefaults: null doc → falls back to defaults', () => {
  const result = getInitialTripDefaults(null);
  assert.equal(result.transport, 'Transit');
  assert.equal(result.routeMode, 'Greenest');
});

test('getInitialTripDefaults: undefined doc → falls back to defaults', () => {
  const result = getInitialTripDefaults(undefined);
  assert.equal(result.transport, 'Transit');
  assert.equal(result.routeMode, 'Greenest');
});

test('getInitialTripDefaults: doc with preferences → uses those values', () => {
  const result = getInitialTripDefaults({
    preferredTransport: 'Cycle',
    preferredRouteMode: 'Fastest',
  });
  assert.equal(result.transport, 'Cycle');
  assert.equal(result.routeMode, 'Fastest');
});

test('applyDocSnapshot: user has NOT interacted — doc snapshot seeds the state', () => {
  const current = { transport: 'Transit', routeMode: 'Greenest', userHasInteracted: false };
  const result = applyDocSnapshot(current, { preferredTransport: 'Walk', preferredRouteMode: 'Cheapest' });
  assert.equal(result.transport, 'Walk');
  assert.equal(result.routeMode, 'Cheapest');
});

// Regression test for the bug: user clicks Cycle, then a snapshot arrives with
// preferredTransport = 'Walk'. The selection must NOT be reverted to 'Walk'.
test('applyDocSnapshot: user HAS interacted — snapshot must not revert selection', () => {
  // User started with Transit seeded from doc.
  // User then clicked Cycle (userHasInteracted = true).
  const current = { transport: 'Cycle', routeMode: 'Greenest', userHasInteracted: true };
  // A fresh onSnapshot fires with a different value.
  const result = applyDocSnapshot(current, { preferredTransport: 'Walk', preferredRouteMode: 'Fastest' });
  // Must stay at the user's chosen value.
  assert.equal(result.transport, 'Cycle', 'transport must not be overwritten by snapshot');
  assert.equal(result.routeMode, 'Greenest', 'routeMode must not be overwritten by snapshot');
});

test('applyDocSnapshot: user has interacted — null snapshot does not reset to defaults', () => {
  const current = { transport: 'Carpool', routeMode: 'Balanced', userHasInteracted: true };
  const result = applyDocSnapshot(current, null);
  assert.equal(result.transport, 'Carpool');
  assert.equal(result.routeMode, 'Balanced');
});
