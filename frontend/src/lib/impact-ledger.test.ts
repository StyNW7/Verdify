import assert from 'node:assert/strict';
import test from 'node:test';

import { computeImpactLedger } from './impact-ledger.ts';

const EPSILON = 0.001;

function near(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) < EPSILON;
}

test('computeImpactLedger: 0 kg in → all three outputs are 0', () => {
  const result = computeImpactLedger(0);
  assert.equal(result.treesEquivalent, 0);
  assert.equal(result.fuelAvoidedLitres, 0);
  assert.equal(result.costSavedRM, 0);
});

test('computeImpactLedger: 100 kg in → trees ≈ 4.594, fuel ≈ 43.290, cost ≈ 88.745', () => {
  const result = computeImpactLedger(100);
  assert.ok(near(result.treesEquivalent, 4.594), `treesEquivalent ${result.treesEquivalent} not near 4.594`);
  assert.ok(near(result.fuelAvoidedLitres, 43.290), `fuelAvoidedLitres ${result.fuelAvoidedLitres} not near 43.290`);
  assert.ok(near(result.costSavedRM, 88.745), `costSavedRM ${result.costSavedRM} not near 88.745`);
});

test('computeImpactLedger: negative input (-50) → all three outputs are 0 (floored)', () => {
  const result = computeImpactLedger(-50);
  assert.equal(result.treesEquivalent, 0);
  assert.equal(result.fuelAvoidedLitres, 0);
  assert.equal(result.costSavedRM, 0);
});
