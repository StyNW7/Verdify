import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveSelectedRouteId,
  startPlannerSubmission,
  finishPlannerSubmission,
} from './planner-phase.js';

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
