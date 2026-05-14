import assert from 'node:assert/strict';
import test from 'node:test';

import {
  originFromSnapshot,
  destinationFromSnapshot,
} from './booking-corridor.ts';
import type { BackendRouteOption, BackendTransportSegment } from './api.ts';

function makeStep(overrides: Partial<BackendTransportSegment> & { type: string }): BackendTransportSegment {
  return {
    type: overrides.type,
    distance: overrides.distance ?? 1,
    duration: overrides.duration ?? 5,
    estimatedCost: overrides.estimatedCost ?? 0,
    transitLine: overrides.transitLine,
    departureStop: overrides.departureStop,
    arrivalStop: overrides.arrivalStop,
    headsign: overrides.headsign,
    startLocation: overrides.startLocation,
    endLocation: overrides.endLocation,
  };
}

function makeSnapshot(steps: BackendTransportSegment[]): BackendRouteOption {
  return {
    routeId: 'test',
    mode: 'eco',
    totalDistance: 10,
    totalDuration: 30,
    carbonEstimate: 0,
    carbonBaseline: 0,
    carbonSavedGrams: 0,
    carbonSavingsPercent: 0,
    carbonEstimateKg: 0,
    estimatedCost: 5,
    greenPointsEstimate: 100,
    steps,
    reasoning: '',
    recommendedFor: [],
    recommended: false,
    dataSource: 'fallback_synthetic',
    createdAt: new Date().toISOString(),
  };
}

test('originFromSnapshot: uses departureStop when present', () => {
  const snap = makeSnapshot([
    makeStep({ type: 'lrt', departureStop: 'KLCC Station' }),
    makeStep({ type: 'walking' }),
  ]);
  assert.equal(originFromSnapshot(snap), 'KLCC Station');
});

test('originFromSnapshot: falls back to startLocation.address for walk-first routes', () => {
  const snap = makeSnapshot([
    makeStep({ type: 'walking', startLocation: { latitude: 3.14, longitude: 101.7, address: 'KLCC, Kuala Lumpur' } }),
    makeStep({ type: 'lrt', departureStop: 'KLCC MRT Station' }),
  ]);
  assert.equal(originFromSnapshot(snap), 'KLCC, Kuala Lumpur');
});

test('originFromSnapshot: returns "Origin" when no usable text', () => {
  const snap = makeSnapshot([
    makeStep({ type: 'walking' }),
  ]);
  assert.equal(originFromSnapshot(snap), 'Origin');
});

test('originFromSnapshot: returns "Origin" for undefined snapshot', () => {
  assert.equal(originFromSnapshot(undefined), 'Origin');
});

test('destinationFromSnapshot: uses arrivalStop from last transit step', () => {
  const snap = makeSnapshot([
    makeStep({ type: 'lrt', departureStop: 'KL Sentral', arrivalStop: 'Masjid Jamek' }),
    makeStep({ type: 'lrt', departureStop: 'Masjid Jamek', arrivalStop: 'KLCC Station' }),
    makeStep({ type: 'walking' }),
  ]);
  assert.equal(destinationFromSnapshot(snap), 'KLCC Station');
});

test('destinationFromSnapshot: falls back to endLocation.address for walk-last routes', () => {
  const snap = makeSnapshot([
    makeStep({ type: 'lrt', arrivalStop: 'KLCC MRT Station' }),
    makeStep({ type: 'walking', endLocation: { latitude: 3.15, longitude: 101.71, address: 'KL Sentral, Kuala Lumpur' } }),
  ]);
  assert.equal(destinationFromSnapshot(snap), 'KL Sentral, Kuala Lumpur');
});

test('destinationFromSnapshot: returns "Destination" when no usable text', () => {
  const snap = makeSnapshot([
    makeStep({ type: 'walking' }),
  ]);
  assert.equal(destinationFromSnapshot(snap), 'Destination');
});

test('destinationFromSnapshot: returns "Destination" for undefined snapshot', () => {
  assert.equal(destinationFromSnapshot(undefined), 'Destination');
});
