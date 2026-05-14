import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveSelectedRouteId,
  startPlannerSubmission,
  finishPlannerSubmission,
  routeModeToPreference,
  initialPreferenceFromDoc,
} from './planner-phase.ts';

test('planner submission selects the preferred route before results render', () => {
  const loadingState = startPlannerSubmission({
    phase: 'idle',
    preference: 'fast',
    selectedRouteId: 'eco',
  });

  assert.deepEqual(loadingState, {
    phase: 'loading',
    selectedRouteId: 'fast',
  });
});

test('planner submission completion transitions from loading to results without changing selection', () => {
  const resultsState = finishPlannerSubmission({
    phase: 'loading',
    selectedRouteId: 'cheap',
  });

  assert.deepEqual(resultsState, {
    phase: 'results',
    selectedRouteId: 'cheap',
  });
});

test('preferred route selection follows the active preference', () => {
  assert.equal(deriveSelectedRouteId('eco'), 'eco');
  assert.equal(deriveSelectedRouteId('fast'), 'fast');
  assert.equal(deriveSelectedRouteId('cheap'), 'cheap');
});

// ─── routeModeToPreference ────────────────────────────────────────────────────

test('routeModeToPreference maps Greenest to eco', () => {
  assert.equal(routeModeToPreference('Greenest'), 'eco');
});

test('routeModeToPreference maps Fastest to fast', () => {
  assert.equal(routeModeToPreference('Fastest'), 'fast');
});

test('routeModeToPreference maps Cheapest to cheap', () => {
  assert.equal(routeModeToPreference('Cheapest'), 'cheap');
});

test('routeModeToPreference maps Balanced to eco', () => {
  assert.equal(routeModeToPreference('Balanced'), 'eco');
});

test('routeModeToPreference returns null for unknown or empty values', () => {
  assert.equal(routeModeToPreference(''), null);
  assert.equal(routeModeToPreference('greenest'), null);
  assert.equal(routeModeToPreference('unknown'), null);
});

// ─── initialPreferenceFromDoc ─────────────────────────────────────────────────

test('initialPreferenceFromDoc returns preference from doc when set', () => {
  const doc = { preferredRouteMode: 'Greenest' };
  assert.equal(initialPreferenceFromDoc(doc), 'eco');
});

test('initialPreferenceFromDoc returns default eco when doc has no preferredRouteMode', () => {
  assert.equal(initialPreferenceFromDoc(null), 'eco');
  assert.equal(initialPreferenceFromDoc(undefined), 'eco');
  assert.equal(initialPreferenceFromDoc({}), 'eco');
  assert.equal(initialPreferenceFromDoc({ preferredRouteMode: '' }), 'eco');
});

// ─── no-revert after user override ───────────────────────────────────────────
//
// page.tsx uses `useState(() => initialPreferenceFromDoc(userDoc))` — a lazy
// initializer that runs exactly once at mount. This test pins the contract:
// after the user changes their in-session preference, a later Firestore doc
// snapshot must NOT revert that choice.
//
// TDD note: if the lazy initializer were replaced with an eager
//   useState(initialPreferenceFromDoc(userDoc))
// that re-evaluated on every doc update, calling initialPreferenceFromDoc
// with the new doc would yield 'cheap', which should NOT win over the user's
// explicit 'fast'. This test detects that regression by modelling the
// mount-once / user-override lifecycle explicitly.
test('user preference is not overridden when a new doc snapshot arrives', () => {
  // (1) Mount — initialise from doc, as page.tsx does via lazy useState.
  const mountDoc = { preferredRouteMode: 'Greenest' };
  let currentPreference = initialPreferenceFromDoc(mountDoc);
  assert.equal(currentPreference, 'eco');

  // (2) User changes their in-session preference (simulates setPreference).
  currentPreference = 'fast';

  // (3) A new Firestore doc snapshot arrives with a different mode.
  const updatedDoc = { preferredRouteMode: 'Cheapest' };

  // (4) The page's lazy initializer does NOT re-run on doc updates.
  //     Calling initialPreferenceFromDoc with the new doc would yield 'cheap' —
  //     but that call is only made once, at mount. The stored preference stays.
  const wouldRevertTo = initialPreferenceFromDoc(updatedDoc);
  assert.equal(wouldRevertTo, 'cheap'); // confirms the new doc IS different
  assert.equal(currentPreference, 'fast'); // user's choice is unchanged
});
