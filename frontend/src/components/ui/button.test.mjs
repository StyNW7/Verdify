import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buttonSource = readFileSync(join(__dirname, 'button.tsx'), 'utf8');
const globalCss = readFileSync(join(__dirname, '../../styles/global.css'), 'utf8');

test('shared button primitive prevents multiline labels by default', () => {
  assert.match(buttonSource, /whitespace-nowrap/);
  assert.match(buttonSource, /overflow-hidden/);
  assert.match(buttonSource, /min-w-0/);
  assert.match(buttonSource, /max-w-full/);
  assert.match(buttonSource, /text-ellipsis/);
});

test('theme button classes keep labels on one line', () => {
  for (const className of ['theme-btn-primary', 'theme-btn-ghost']) {
    const classBlock = new RegExp(`\\.${className}[^{]*\\{[^}]*white-space:\\s*nowrap;`, 's');
    assert.match(globalCss, classBlock);
  }
});

test('theme action bar provides responsive layout before labels can wrap', () => {
  assert.match(globalCss, /\.theme-action-bar/);
  assert.match(globalCss, /\.theme-action-bar-primary/);
  assert.match(globalCss, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
});
