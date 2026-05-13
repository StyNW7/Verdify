import assert from 'node:assert/strict';
import test from 'node:test';

import { createBookingDraft } from './booking-draft.ts';
import type { BackendRouteOption } from './api.ts';

const sampleRoute: BackendRouteOption = {
  routeId: 'route_test_123',
  mode: 'eco',
  totalDistance: 24.7,
  totalDuration: 45,
  carbonEstimate: 820,
  carbonBaseline: 5400,
  carbonSavedGrams: 4580,
  carbonSavingsPercent: 85,
  carbonEstimateKg: 0.82,
  estimatedCost: 12.5,
  greenPointsEstimate: 150,
  steps: [
    {
      type: 'walking',
      distance: 0.3,
      duration: 5,
      estimatedCost: 0,
    },
  ],
  polyline: 'abc123',
  reasoning: 'Lowest CO2 corridor',
  recommendedFor: ['carbon-conscious'],
  recommended: true,
  dataSource: 'google_routes',
  createdAt: '2026-05-13T09:00:00Z',
};

test('createBookingDraft returns a draft-status booking with the route snapshot embedded', () => {
  const draft = createBookingDraft(sampleRoute, 2);

  assert.equal(draft.status, 'draft');
  assert.equal(draft.routeId, 'route_test_123');
  assert.equal(draft.passengers, 2);
  assert.deepEqual(draft.routeSnapshot, sampleRoute);
  assert.equal('bookingId' in draft, false);
  assert.equal('bookingReference' in draft, false);
});

test('createBookingDraft preserves route fields verbatim (deep equal)', () => {
  const draft = createBookingDraft(sampleRoute, 1);

  // Mutating the original snapshot ref should not affect the draft since
  // the function is supposed to capture by reference of the route option.
  // We only assert deepEqual here; the snapshot is the route option as-given.
  assert.deepEqual(draft.routeSnapshot, sampleRoute);
});
