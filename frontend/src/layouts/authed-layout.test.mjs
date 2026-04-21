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
