import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

test('podium top three use descending standings from rank one to rank three', () => {
  assert.match(source, /place=\{2\} height="132px"/);
  assert.match(source, /place=\{1\} height="176px"/);
  assert.match(source, /place=\{3\} height="96px"/);
  assert.doesNotMatch(source, /height: `calc\(\$\{height\} \* 1\.6\)`/);
});
