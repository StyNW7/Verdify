import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const dialogSource = readFileSync(join(__dirname, 'booking-dialog.tsx'), 'utf8');
const historySource = readFileSync(
  join(__dirname, '..', 'History', 'page.tsx'),
  'utf8',
);

test('route results expose a booking action and unified BookingDialog', () => {
  assert.match(pageSource, /<BookingActionBar/);
  assert.match(pageSource, /<BookingDialog/);
});

test('history page uses the same BookingDialog component', () => {
  assert.match(historySource, /import \{[^}]*BookingDialog[^}]*\} from '@\/pages\/Route\/booking-dialog'/);
  assert.match(historySource, /<BookingDialog/);
});

test('history page no longer references the legacy TripDialog component', () => {
  assert.doesNotMatch(historySource, /TripDialog/);
});

test('booking dialog uses the auth modal shell and has clear actions', () => {
  assert.match(dialogSource, /auth-modal-shell/);
  assert.match(dialogSource, /Confirm booking/);
  assert.match(dialogSource, /Cancel/);
  assert.match(dialogSource, /theme-btn-primary/);
  assert.match(dialogSource, /theme-btn-ghost/);
});

test('booking dialog uses a compact mobile layout', () => {
  assert.match(dialogSource, /p-3 sm:p-4/);
  assert.match(dialogSource, /hidden .*sm:block/);
  assert.match(dialogSource, /sticky bottom-0/);
  assert.match(dialogSource, /sm:hidden/);
});

test('action bar primary button is disabled when route has no backendOption', () => {
  assert.match(dialogSource, /primaryDisabled = !route\.backendOption/);
  assert.match(dialogSource, /disabled=\{primaryDisabled\}/);
});

test('booking dialog branches on bookingLifecycle.content', () => {
  assert.match(dialogSource, /bookingLifecycle\(/);
  assert.match(dialogSource, /lifecycle\.content === 'draft'/);
  assert.match(dialogSource, /lifecycle\.content === 'qr'/);
  assert.match(dialogSource, /lifecycle\.content === 'tripDone'/);
  assert.match(dialogSource, /lifecycle\.content === 'cancelled'/);
});

test('confirmed pane total uses routeSnapshot.estimatedCost', () => {
  assert.match(dialogSource, /routeSnapshot\.estimatedCost/);
});

test('JourneyPane seeds currentStep from booking.journeyProgress.currentStepIndex', () => {
  assert.match(dialogSource, /booking\.journeyProgress\?\.currentStepIndex/);
});

test('JourneyPane flushes pending progress write on unmount', () => {
  assert.match(dialogSource, /flusher\.flush\(\)/);
});
