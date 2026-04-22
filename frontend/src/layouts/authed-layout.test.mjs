import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'authed-layout.tsx'), 'utf8');

test('desktop auth sidebar is viewport-fixed and leaves content space in normal flow', () => {
  assert.match(
    source,
    /className="pointer-events-none fixed inset-y-0 left-0 hidden border-r lg:block"/,
  );
  assert.match(
    source,
    /className="fixed inset-y-0 left-0 z-10 hidden h-svh shrink-0 flex-col lg:flex"/,
  );
  assert.match(
    source,
    /className="hidden shrink-0 lg:block"/,
  );
});

test('rewards is an enabled authenticated sidebar route', () => {
  assert.match(
    source,
    /\{ label: 'Rewards', to: '\/rewards', icon: Gift \}/,
  );
  assert.doesNotMatch(
    source,
    /\{ label: 'Rewards', to: '#rewards', icon: Gift, stub: true \}/,
  );
});

test('settings is not shown in the authenticated sidebar', () => {
  assert.doesNotMatch(
    source,
    /\{ label: 'Settings', to: '#settings', icon: Settings, stub: true \}/,
  );
  assert.doesNotMatch(source, /\bSettings,\n/);
});
