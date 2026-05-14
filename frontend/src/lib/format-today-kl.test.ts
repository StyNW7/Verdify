import assert from 'node:assert/strict';
import test from 'node:test';

import { formatTodayInKL } from './format-today-kl.ts';

test('formats a known date correctly in Asia/Kuala_Lumpur', () => {
  // 2026-05-14 at noon UTC+8 (MY) = 04:00 UTC
  const date = new Date('2026-05-14T04:00:00Z');
  assert.equal(formatTodayInKL(date), 'Thursday · 14 May');
});

test('day boundary: 23:30 MY time (15:30 UTC) is still the same MY day', () => {
  // 2026-05-14T15:30:00Z is 23:30 in MY (UTC+8) — still Thursday the 14th
  const date = new Date('2026-05-14T15:30:00Z');
  assert.equal(formatTodayInKL(date), 'Thursday · 14 May');
});

test('day boundary: 16:01 UTC flips to next MY day', () => {
  // 2026-05-14T16:01:00Z is 00:01 MY on May 15 (Friday)
  const date = new Date('2026-05-14T16:01:00Z');
  assert.equal(formatTodayInKL(date), 'Friday · 15 May');
});

test('formats a different known date correctly', () => {
  // 2026-04-19 in UTC+8; UTC equivalent: any time before midnight UTC+8 = before 16:00 UTC on Apr 19
  const date = new Date('2026-04-19T08:00:00Z');
  assert.equal(formatTodayInKL(date), 'Sunday · 19 April');
});
