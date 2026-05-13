import assert from 'node:assert/strict';
import test from 'node:test';

import { bookingLifecycle } from './booking-lifecycle.ts';

test('draft: shows confirm/save buttons; content is qr', () => {
  const result = bookingLifecycle({ status: 'draft', paymentStatus: 'pending' });
  assert.equal(result.showConfirm, true);
  assert.equal(result.showMarkPaid, false);
  assert.equal(result.showMarkCompleted, false);
  assert.equal(result.showCancel, true);
  assert.equal(result.content, 'qr');
});

test('confirmed + pending: shows Mark as Paid and Cancel; content is qr', () => {
  const result = bookingLifecycle({ status: 'confirmed', paymentStatus: 'pending' });
  assert.equal(result.showConfirm, false);
  assert.equal(result.showMarkPaid, true);
  assert.equal(result.showMarkCompleted, false);
  assert.equal(result.showCancel, true);
  assert.equal(result.content, 'qr');
});

test('confirmed + completed: shows Mark trip as completed and Cancel; content is qr', () => {
  const result = bookingLifecycle({ status: 'confirmed', paymentStatus: 'completed' });
  assert.equal(result.showConfirm, false);
  assert.equal(result.showMarkPaid, false);
  assert.equal(result.showMarkCompleted, true);
  assert.equal(result.showCancel, true);
  assert.equal(result.content, 'qr');
});

test('completed + completed: no buttons; content is tripDone', () => {
  const result = bookingLifecycle({ status: 'completed', paymentStatus: 'completed' });
  assert.equal(result.showConfirm, false);
  assert.equal(result.showMarkPaid, false);
  assert.equal(result.showMarkCompleted, false);
  assert.equal(result.showCancel, false);
  assert.equal(result.content, 'tripDone');
});

test('cancelled (from pending): no buttons; content is cancelled', () => {
  const result = bookingLifecycle({ status: 'cancelled', paymentStatus: 'pending' });
  assert.equal(result.showConfirm, false);
  assert.equal(result.showMarkPaid, false);
  assert.equal(result.showMarkCompleted, false);
  assert.equal(result.showCancel, false);
  assert.equal(result.content, 'cancelled');
});

test('cancelled (from completed payment): no buttons; content is cancelled', () => {
  const result = bookingLifecycle({ status: 'cancelled', paymentStatus: 'completed' });
  assert.equal(result.showConfirm, false);
  assert.equal(result.showMarkPaid, false);
  assert.equal(result.showMarkCompleted, false);
  assert.equal(result.showCancel, false);
  assert.equal(result.content, 'cancelled');
});
