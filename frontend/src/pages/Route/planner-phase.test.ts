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
