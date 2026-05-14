import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampStep,
  nextStep,
  isFinalStep,
  createProgressFlusher,
} from './journey-progress.ts';

// ── pure helpers ──────────────────────────────────────────────────────────────

test('clampStep: within range returns value unchanged', () => {
  assert.equal(clampStep(2, 5), 2);
});

test('clampStep: at lower bound returns 0', () => {
  assert.equal(clampStep(0, 5), 0);
});

test('clampStep: at upper bound returns total-1', () => {
  assert.equal(clampStep(4, 5), 4);
});

test('clampStep: below 0 clamped to 0', () => {
  assert.equal(clampStep(-1, 5), 0);
});

test('clampStep: above max clamped to total-1', () => {
  assert.equal(clampStep(99, 5), 4);
});

test('clampStep: zero total returns 0', () => {
  assert.equal(clampStep(3, 0), 0);
});

test('nextStep: increments by 1', () => {
  assert.equal(nextStep(1, 5), 2);
});

test('nextStep: at final step stays at final', () => {
  assert.equal(nextStep(4, 5), 4);
});

test('nextStep: zero total stays at 0', () => {
  assert.equal(nextStep(0, 0), 0);
});

test('isFinalStep: step at total-1 is final', () => {
  assert.equal(isFinalStep(4, 5), true);
});

test('isFinalStep: step before last is not final', () => {
  assert.equal(isFinalStep(3, 5), false);
});

test('isFinalStep: step 0 of 1 is final', () => {
  assert.equal(isFinalStep(0, 1), true);
});

test('isFinalStep: zero total is final', () => {
  assert.equal(isFinalStep(0, 0), true);
});

test('isFinalStep: step beyond total is treated as final (clamped behaviour)', () => {
  assert.equal(isFinalStep(99, 5), true);
});

// ── flusher ───────────────────────────────────────────────────────────────────

test('flusher: schedule arms and fires patch after debounce', (t, done) => {
  const calls: number[] = [];
  const f = createProgressFlusher({ patch: (i) => calls.push(i), debounceMs: 20 });
  f.schedule(3);
  setTimeout(() => {
    assert.deepEqual(calls, [3]);
    done();
  }, 50);
});

test('flusher: second schedule replaces first, only one patch fires', (t, done) => {
  const calls: number[] = [];
  const f = createProgressFlusher({ patch: (i) => calls.push(i), debounceMs: 20 });
  f.schedule(1);
  f.schedule(2);
  setTimeout(() => {
    assert.deepEqual(calls, [2]);
    done();
  }, 50);
});

test('flusher: flush cancels timer and calls patch immediately', () => {
  const calls: number[] = [];
  const f = createProgressFlusher({ patch: (i) => calls.push(i), debounceMs: 500 });
  f.schedule(5);
  f.flush();
  assert.deepEqual(calls, [5]);
});

test('flusher: cancel aborts without sending', (t, done) => {
  const calls: number[] = [];
  const f = createProgressFlusher({ patch: (i) => calls.push(i), debounceMs: 20 });
  f.schedule(7);
  f.cancel();
  setTimeout(() => {
    assert.deepEqual(calls, []);
    done();
  }, 50);
});

test('flusher: multiple schedules in one debounce window yield exactly one patch', (t, done) => {
  const calls: number[] = [];
  const f = createProgressFlusher({ patch: (i) => calls.push(i), debounceMs: 30 });
  f.schedule(1);
  f.schedule(2);
  f.schedule(3);
  f.schedule(4);
  f.schedule(5);
  setTimeout(() => {
    assert.deepEqual(calls, [5]);
    done();
  }, 80);
});

test('flusher: flush after cancel is a no-op', () => {
  const calls: number[] = [];
  const f = createProgressFlusher({ patch: (i) => calls.push(i), debounceMs: 500 });
  f.schedule(9);
  f.cancel();
  f.flush();
  assert.deepEqual(calls, []);
});
