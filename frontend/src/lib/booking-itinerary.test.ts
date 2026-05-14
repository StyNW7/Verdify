import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildItineraryRows,
  iconKeyForStep,
} from './booking-itinerary.ts';
import type { BackendTransportSegment } from './api.ts';

const seg = (
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
  instruction: overrides.instruction,
  startLocation: overrides.startLocation,
  endLocation: overrides.endLocation,
});

test('iconKeyForStep maps transit modes to expected icon families', () => {
  assert.equal(iconKeyForStep('walk'), 'walk');
  assert.equal(iconKeyForStep('walking'), 'walk');
  assert.equal(iconKeyForStep('lrt'), 'train');
  assert.equal(iconKeyForStep('mrt'), 'train');
  assert.equal(iconKeyForStep('train'), 'train');
  assert.equal(iconKeyForStep('rts'), 'train');
  assert.equal(iconKeyForStep('bus'), 'bus');
  assert.equal(iconKeyForStep('ev_taxi'), 'evTaxi');
  assert.equal(iconKeyForStep('evTaxi'), 'evTaxi');
  assert.equal(iconKeyForStep('helicopter'), 'unknown');
});

test('walking step uses startLocation/endLocation address chain', () => {
  const rows = buildItineraryRows([
    seg({
      type: 'walking',
      distance: 0.3,
      duration: 4,
      startLocation: { latitude: 0, longitude: 0, address: '12 Jalan Indah' },
      endLocation: { latitude: 0, longitude: 0, address: 'Bukit Indah RTS' },
    }),
  ]);
  assert.equal(rows[0].iconKey, 'walk');
  assert.equal(rows[0].primary, 'Walk');
  assert.equal(rows[0].secondary, '12 Jalan Indah → Bukit Indah RTS');
  assert.equal(rows[0].detail, '0.3 km · 4 min');
});

test('walking step falls back to em-dash when addresses are missing', () => {
  const rows = buildItineraryRows([
    seg({ type: 'walk', distance: 0, duration: 0 }),
  ]);
  assert.equal(rows[0].secondary, '— → —');
});

test('transit step formats line · headsign and from → to from stops', () => {
  const rows = buildItineraryRows([
    seg({
      type: 'lrt',
      transitLine: 'Kelana Jaya LRT',
      headsign: 'Putra Heights',
      departureStop: 'KL Sentral',
      arrivalStop: 'Bangsar',
      distance: 4.2,
      duration: 11,
      estimatedCost: 2.5,
    }),
  ]);
  assert.equal(rows[0].iconKey, 'train');
  assert.equal(rows[0].primary, 'Kelana Jaya LRT · Putra Heights');
  assert.equal(rows[0].secondary, 'KL Sentral → Bangsar');
  assert.equal(rows[0].detail, '4.2 km · 11 min · RM 2.50');
});

test('cost is omitted from detail when zero', () => {
  const rows = buildItineraryRows([
    seg({ type: 'bus', transitLine: 'Bus 170', distance: 2, duration: 8, estimatedCost: 0 }),
  ]);
  assert.equal(rows[0].detail, '2.0 km · 8 min');
});

test('ev_taxi prefixes the line label', () => {
  const rows = buildItineraryRows([
    seg({ type: 'ev_taxi', transitLine: 'GrabEV', estimatedCost: 18, duration: 22, distance: 14.5 }),
  ]);
  assert.equal(rows[0].iconKey, 'evTaxi');
  assert.equal(rows[0].primary, 'EV Taxi · GrabEV');
});

test('instruction is HTML-stripped and trimmed', () => {
  const rows = buildItineraryRows([
    seg({
      type: 'walking',
      instruction: 'Head <b>north</b> on  <span>Jalan A</span>',
    }),
  ]);
  assert.equal(rows[0].instruction, 'Head north on Jalan A');
});

test('rows are indexed in order', () => {
  const rows = buildItineraryRows([
    seg({ type: 'walking' }),
    seg({ type: 'lrt' }),
    seg({ type: 'bus' }),
  ]);
  assert.deepEqual(rows.map((r) => r.index), [0, 1, 2]);
});
