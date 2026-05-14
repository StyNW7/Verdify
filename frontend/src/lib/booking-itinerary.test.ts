import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bookingFallbackPath,
  bookingMapEndpoints,
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

test('bookingMapEndpoints returns null for empty steps', () => {
  const result = bookingMapEndpoints([]);
  assert.deepEqual(result, { start: null, end: null });
});

test('bookingMapEndpoints walks forward to find first valid startLocation', () => {
  const steps = [
    seg({ type: 'walking' }),
    seg({
      type: 'lrt',
      startLocation: { latitude: 1.23, longitude: 103.8, address: 'Stop A' },
    }),
    seg({
      type: 'bus',
      startLocation: { latitude: 1.3, longitude: 103.9, address: 'Stop B' },
    }),
  ];
  const { start } = bookingMapEndpoints(steps);
  assert.deepEqual(start, { latitude: 1.23, longitude: 103.8 });
});

test('bookingMapEndpoints walks backward to find last valid endLocation', () => {
  const steps = [
    seg({
      type: 'lrt',
      endLocation: { latitude: 1.5, longitude: 103.7, address: 'End A' },
    }),
    seg({ type: 'walking' }),
  ];
  const { end } = bookingMapEndpoints(steps);
  assert.deepEqual(end, { latitude: 1.5, longitude: 103.7 });
});

test('walking step borrows next departureStop when own address is missing', () => {
  // Real Routes API responses (and the seeded fixtures) often omit `address`
  // on the inner endpoint of a walk-to-transfer step. The walk's "to" should
  // resolve from the next leg's `departureStop`.
  const rows = buildItineraryRows([
    seg({
      type: 'walking',
      distance: 0.13,
      duration: 2,
      startLocation: { latitude: 5.98, longitude: 116.07, address: 'Filipino Market, Kota Kinabalu' },
      endLocation: { latitude: 5.984, longitude: 116.0745 },
    }),
    seg({
      type: 'bus',
      transitLine: 'Sabah State Bus 5A',
      headsign: 'Towards Sembulan',
      departureStop: 'Wawasan Plaza Bus Stop',
      arrivalStop: 'Sabah State Mosque',
      startLocation: { latitude: 5.984, longitude: 116.0745 },
      endLocation: { latitude: 5.962, longitude: 116.078 },
    }),
    seg({
      type: 'walking',
      distance: 0.04,
      duration: 3,
      startLocation: { latitude: 5.962, longitude: 116.078 },
      endLocation: { latitude: 5.9621, longitude: 116.079, address: 'Masjid Negeri Sabah, Kota Kinabalu' },
    }),
  ]);
  assert.equal(rows[0].secondary, 'Filipino Market, Kota Kinabalu → Wawasan Plaza Bus Stop');
  assert.equal(rows[1].secondary, 'Wawasan Plaza Bus Stop → Sabah State Mosque');
  assert.equal(rows[2].secondary, 'Sabah State Mosque → Masjid Negeri Sabah, Kota Kinabalu');
});

test('walking step borrows previous arrivalStop for its "from"', () => {
  const rows = buildItineraryRows([
    seg({
      type: 'lrt',
      transitLine: 'MRT Kajang',
      departureStop: 'KL Sentral',
      arrivalStop: 'Bukit Bintang',
    }),
    seg({ type: 'walking', distance: 0.1, duration: 2 }),
  ]);
  assert.equal(rows[1].secondary.startsWith('Bukit Bintang → '), true);
});

test('bookingFallbackPath stitches per-step coords and dedupes adjacent duplicates', () => {
  const path = bookingFallbackPath([
    seg({
      type: 'walking',
      startLocation: { latitude: 5.98, longitude: 116.07 },
      endLocation: { latitude: 5.984, longitude: 116.0745 },
    }),
    seg({
      type: 'bus',
      startLocation: { latitude: 5.984, longitude: 116.0745 },
      endLocation: { latitude: 5.962, longitude: 116.078 },
    }),
    seg({
      type: 'walking',
      startLocation: { latitude: 5.962, longitude: 116.078 },
      endLocation: { latitude: 5.9621, longitude: 116.079 },
    }),
  ]);
  assert.deepEqual(path, [
    { latitude: 5.98, longitude: 116.07 },
    { latitude: 5.984, longitude: 116.0745 },
    { latitude: 5.962, longitude: 116.078 },
    { latitude: 5.9621, longitude: 116.079 },
  ]);
});

test('bookingFallbackPath skips steps with non-finite coords', () => {
  const path = bookingFallbackPath([
    seg({
      type: 'walking',
      startLocation: { latitude: 1, longitude: 2 },
      endLocation: { latitude: Number.NaN, longitude: 3 },
    }),
    seg({
      type: 'bus',
      startLocation: { latitude: 4, longitude: 5 },
      endLocation: { latitude: 6, longitude: 7 },
    }),
  ]);
  assert.deepEqual(path, [
    { latitude: 1, longitude: 2 },
    { latitude: 4, longitude: 5 },
    { latitude: 6, longitude: 7 },
  ]);
});

test('bookingFallbackPath returns [] for empty steps', () => {
  assert.deepEqual(bookingFallbackPath([]), []);
});

test('bookingMapEndpoints returns both endpoints from a single step', () => {
  const steps = [
    seg({
      type: 'lrt',
      startLocation: { latitude: 1.1, longitude: 103.1, address: 'From' },
      endLocation: { latitude: 1.9, longitude: 103.9, address: 'To' },
    }),
  ];
  const result = bookingMapEndpoints(steps);
  assert.deepEqual(result, {
    start: { latitude: 1.1, longitude: 103.1 },
    end: { latitude: 1.9, longitude: 103.9 },
  });
});
