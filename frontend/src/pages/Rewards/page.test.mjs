import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

test('rewards page is a single market design without alternate variants', () => {
  assert.doesNotMatch(source, /type DesignVariant/);
  assert.doesNotMatch(source, /VariantSwitcher/);
  assert.doesNotMatch(source, /LedgerDesign/);
  assert.doesNotMatch(source, /QuestDesign/);
  assert.match(source, /function MarketDesign/);
});

test('market challenge queue shows three visible challenge cards', () => {
  assert.match(source, /challenges\.slice\(0, 3\)\.map/);
  assert.doesNotMatch(source, /challenges\.slice\(0, 2\)\.map/);
});

test('market content columns share one stretched row height', () => {
  assert.match(source, /xl:grid-cols-\[1\.35fr_0\.65fr\]/);
  assert.doesNotMatch(source, /xl:items-start/);
  assert.match(source, /className="theme-panel h-full"/);
  assert.match(source, /className="theme-card flex flex-1 flex-col p-6"/);
});

test('points to next tier uses one text style', () => {
  assert.match(source, /{summary\.pointsToNext} pts to Forest/);
  assert.doesNotMatch(source, /style=\{SERIF_ITALIC\}>\{summary\.pointsToNext\}/);
});
