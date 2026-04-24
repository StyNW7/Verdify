import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const dialogSource = readFileSync(join(__dirname, 'booking-confirmation-dialog.tsx'), 'utf8');

test('route results expose a booking action and confirmation dialog', () => {
  assert.match(pageSource, /<BookingActionBar/);
  assert.match(pageSource, /<BookingConfirmationDialog/);
});

test('booking confirmation dialog matches auth modal shell and has clear actions', () => {
  assert.match(dialogSource, /auth-modal-shell/);
  assert.match(dialogSource, /Confirm booking/);
  assert.match(dialogSource, /Cancel/);
  assert.match(dialogSource, /theme-btn-primary/);
  assert.match(dialogSource, /theme-btn-ghost/);
});

test('booking confirmation dialog uses a compact mobile layout', () => {
  assert.match(dialogSource, /p-3 sm:p-4/);
  assert.match(dialogSource, /hidden .*sm:block/);
  assert.match(dialogSource, /sticky bottom-0/);
  assert.match(dialogSource, /sm:hidden/);
});
