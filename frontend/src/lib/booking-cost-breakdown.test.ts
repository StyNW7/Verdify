import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BOOKABLE_STEP_TYPES,
  TAP_IN_STEP_TYPES,
  isBookableStep,
  isTapInStep,
  buildBookingCostBreakdown,
} from './booking-cost-breakdown.ts';
import type { BackendTransportSegment } from './api.ts';

const step = (
  overrides: Partial<BackendTransportSegment> & { type: string },
): BackendTransportSegment => ({
  type: overrides.type,
  distance: overrides.distance ?? 1,
  duration: overrides.duration ?? 5,
  estimatedCost: overrides.estimatedCost ?? 0,
  transitLine: overrides.transitLine,
  departureStop: overrides.departureStop,
  arrivalStop: overrides.arrivalStop,
  headsign: overrides.headsign,
  stopCount: overrides.stopCount,
  instruction: overrides.instruction,
});

test('classification: ev_taxi and rts are bookable; bus, lrt, ferry are tap-in; walking is ignored', () => {
  assert.deepEqual(BOOKABLE_STEP_TYPES, ['ev_taxi', 'rts']);
  assert.deepEqual(TAP_IN_STEP_TYPES, ['bus', 'lrt', 'ferry']);

  assert.equal(isBookableStep('ev_taxi'), true);
  assert.equal(isBookableStep('evTaxi'), true);
  assert.equal(isBookableStep('rts'), true);
  assert.equal(isBookableStep('bus'), false);
  assert.equal(isBookableStep('lrt'), false);
  assert.equal(isBookableStep('ferry'), false);
  assert.equal(isBookableStep('walking'), false);

  assert.equal(isTapInStep('bus'), true);
  assert.equal(isTapInStep('lrt'), true);
  assert.equal(isTapInStep('ferry'), true);
  assert.equal(isTapInStep('ev_taxi'), false);
  assert.equal(isTapInStep('rts'), false);
  assert.equal(isTapInStep('walking'), false);
});

test('buildBookingCostBreakdown: all-bookable (ev_taxi only) populates reserved bucket', () => {
  const steps = [
    step({ type: 'ev_taxi', estimatedCost: 24.5 }),
  ];

  const result = buildBookingCostBreakdown(steps);

  assert.equal(result.reserved.length, 1);
  assert.equal(result.tapIn.length, 0);
  assert.equal(result.reserved[0].leg, 0);
  assert.equal(result.reserved[0].label, 'EV Taxi');
  assert.equal(result.reserved[0].cost, 24.5);
  assert.equal(result.reservedTotal, 24.5);
  assert.equal(result.tapInTotal, 0);
  assert.equal(result.grandTotal, 24.5);
});

test('buildBookingCostBreakdown: all-tap-in (bus + lrt) populates tap-in bucket with transitLine labels', () => {
  const steps = [
    step({ type: 'bus', transitLine: 'CW1', estimatedCost: 4.5 }),
    step({ type: 'lrt', transitLine: 'Kelana Jaya Line', estimatedCost: 3.2 }),
  ];

  const result = buildBookingCostBreakdown(steps);

  assert.equal(result.reserved.length, 0);
  assert.equal(result.tapIn.length, 2);
  assert.equal(result.tapIn[0].leg, 0);
  assert.equal(result.tapIn[0].label, 'CW1');
  assert.equal(result.tapIn[0].cost, 4.5);
  assert.equal(result.tapIn[1].leg, 1);
  assert.equal(result.tapIn[1].label, 'Kelana Jaya Line');
  assert.equal(result.tapIn[1].cost, 3.2);
  assert.equal(result.reservedTotal, 0);
  assert.equal(result.tapInTotal, 7.7);
  assert.equal(result.grandTotal, 7.7);
});

test('buildBookingCostBreakdown: mixed (walk + ev_taxi + rts + walk) splits across buckets, drops walking', () => {
  const steps = [
    step({ type: 'walking', estimatedCost: 0 }),
    step({ type: 'ev_taxi', estimatedCost: 18.0 }),
    step({ type: 'rts', transitLine: 'RTS Link', estimatedCost: 5.0 }),
    step({ type: 'walking', estimatedCost: 0 }),
  ];

  const result = buildBookingCostBreakdown(steps);

  assert.equal(result.reserved.length, 2);
  assert.equal(result.tapIn.length, 0);
  assert.equal(result.reserved[0].leg, 1);
  assert.equal(result.reserved[0].label, 'EV Taxi');
  assert.equal(result.reserved[0].cost, 18.0);
  assert.equal(result.reserved[1].leg, 2);
  assert.equal(result.reserved[1].label, 'RTS Link');
  assert.equal(result.reserved[1].cost, 5.0);
  assert.equal(result.reservedTotal, 23.0);
  assert.equal(result.tapInTotal, 0);
  assert.equal(result.grandTotal, 23.0);
});

test('buildBookingCostBreakdown: walking-only returns empty buckets and zero totals', () => {
  const steps = [
    step({ type: 'walking', estimatedCost: 0 }),
    step({ type: 'walking', estimatedCost: 0 }),
  ];

  const result = buildBookingCostBreakdown(steps);

  assert.equal(result.reserved.length, 0);
  assert.equal(result.tapIn.length, 0);
  assert.equal(result.reservedTotal, 0);
  assert.equal(result.tapInTotal, 0);
  assert.equal(result.grandTotal, 0);
});

test('buildBookingCostBreakdown: prefers transitLine over default label when present', () => {
  const steps = [
    step({ type: 'bus', transitLine: '170', estimatedCost: 2.5 }),
    step({ type: 'bus', estimatedCost: 1.8 }),
  ];

  const result = buildBookingCostBreakdown(steps);

  assert.equal(result.tapIn[0].label, '170');
  assert.equal(result.tapIn[1].label, 'Bus');
});

test('buildBookingCostBreakdown: evTaxi camelCase variant is treated as ev_taxi', () => {
  const steps = [
    step({ type: 'evTaxi', estimatedCost: 12.0 }),
  ];

  const result = buildBookingCostBreakdown(steps);

  assert.equal(result.reserved.length, 1);
  assert.equal(result.reserved[0].label, 'EV Taxi');
  assert.equal(result.reservedTotal, 12.0);
});
