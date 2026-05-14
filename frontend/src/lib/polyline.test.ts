import assert from 'node:assert/strict';
import test from 'node:test';

import { isPolylinePathSane } from './polyline.ts';

const KK_START = { latitude: 5.98, longitude: 116.07 };
const KK_END = { latitude: 6.0, longitude: 116.1 };

const KK_START_PT = { lat: 5.98, lng: 116.07 };
const KK_END_PT = { lat: 6.0, lng: 116.1 };

const CAMEROON_PT = { lat: 6.0, lng: 14.0 };

test('exact match at both endpoints is sane', () => {
  const points = [KK_START_PT, { lat: 5.99, lng: 116.085 }, KK_END_PT];
  assert.equal(isPolylinePathSane(points, KK_START, KK_END), true);
});

test('endpoints ~500m off are sane at default tolerance', () => {
  // 0.005 degrees latitude ≈ 555m
  const points = [
    { lat: KK_START_PT.lat + 0.005, lng: KK_START_PT.lng },
    { lat: KK_END_PT.lat - 0.005, lng: KK_END_PT.lng },
  ];
  assert.equal(isPolylinePathSane(points, KK_START, KK_END), true);
});

test('Cameroon polyline against KK booking is not sane', () => {
  const points = [CAMEROON_PT, { lat: 6.1, lng: 14.1 }];
  assert.equal(isPolylinePathSane(points, KK_START, KK_END), false);
});

test('start sane, end wildly off is not sane', () => {
  const points = [KK_START_PT, CAMEROON_PT];
  assert.equal(isPolylinePathSane(points, KK_START, KK_END), false);
});

test('end sane, start wildly off is not sane', () => {
  const points = [CAMEROON_PT, KK_END_PT];
  assert.equal(isPolylinePathSane(points, KK_START, KK_END), false);
});

test('null start trusts the polyline', () => {
  const points = [CAMEROON_PT, { lat: 6.1, lng: 14.1 }];
  assert.equal(isPolylinePathSane(points, null, KK_END), true);
});

test('null end trusts the polyline', () => {
  const points = [CAMEROON_PT, { lat: 6.1, lng: 14.1 }];
  assert.equal(isPolylinePathSane(points, KK_START, null), true);
});

test('both null trusts the polyline', () => {
  const points = [CAMEROON_PT, { lat: 6.1, lng: 14.1 }];
  assert.equal(isPolylinePathSane(points, null, null), true);
});

test('undefined start trusts the polyline', () => {
  const points = [CAMEROON_PT, { lat: 6.1, lng: 14.1 }];
  assert.equal(isPolylinePathSane(points, undefined, KK_END), true);
});

test('undefined end trusts the polyline', () => {
  const points = [CAMEROON_PT, { lat: 6.1, lng: 14.1 }];
  assert.equal(isPolylinePathSane(points, KK_START, undefined), true);
});

test('zero-point polyline is not sane', () => {
  assert.equal(isPolylinePathSane([], KK_START, KK_END), false);
});

test('single-point polyline is not sane', () => {
  assert.equal(isPolylinePathSane([KK_START_PT], KK_START, KK_END), false);
});

test('tolerance parameter is respected — tight tolerance flips to not-sane', () => {
  // ~555 m off each endpoint
  const points = [
    { lat: KK_START_PT.lat + 0.005, lng: KK_START_PT.lng },
    { lat: KK_END_PT.lat - 0.005, lng: KK_END_PT.lng },
  ];
  assert.equal(isPolylinePathSane(points, KK_START, KK_END, 5), true);
  assert.equal(isPolylinePathSane(points, KK_START, KK_END, 0.1), false);
});

test('tolerance parameter expanded allows what default would reject', () => {
  const points = [CAMEROON_PT, { lat: 6.1, lng: 14.1 }];
  assert.equal(isPolylinePathSane(points, KK_START, KK_END, 5), false);
  // Cameroon → KK is ~11,000 km; a 20,000 km tolerance accepts anything on Earth
  assert.equal(isPolylinePathSane(points, KK_START, KK_END, 20000), true);
});
