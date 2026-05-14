import assert from 'node:assert/strict';
import test from 'node:test';

import { getSecurityCardState } from './security-card-state.ts';

// ---------------------------------------------------------------------------
// Tests for the three SecurityCard render branches.
// The component delegates "which panel to show" to this pure helper so the
// logic can be tested without React or Firebase.
// ---------------------------------------------------------------------------

test('hasPassword only: shows reset-password panel, providerLabel is "Email & password"', () => {
  const state = getSecurityCardState({
    providers: ['password'],
    email: 'alice@example.com',
  });
  assert.equal(state.panel, 'reset-password');
  assert.equal(state.providerLabel, 'Email & password');
  assert.equal(state.email, 'alice@example.com');
});

test('hasGoogle only: shows google-only panel, providerLabel is "Google"', () => {
  const state = getSecurityCardState({
    providers: ['google.com'],
    email: 'bob@gmail.com',
  });
  assert.equal(state.panel, 'google-only');
  assert.equal(state.providerLabel, 'Google');
  assert.equal(state.email, 'bob@gmail.com');
});

test('hasPassword + hasGoogle: shows reset-password panel, providerLabel is "Email & password · Google"', () => {
  const state = getSecurityCardState({
    providers: ['password', 'google.com'],
    email: 'carol@example.com',
  });
  assert.equal(state.panel, 'reset-password');
  assert.equal(state.providerLabel, 'Email & password · Google');
  assert.equal(state.email, 'carol@example.com');
});

test('no providers (empty): falls back gracefully', () => {
  const state = getSecurityCardState({
    providers: [],
    email: 'nobody@example.com',
  });
  // No password or google: default to google-only panel (no reset available).
  assert.equal(state.panel, 'google-only');
  assert.equal(state.email, 'nobody@example.com');
});

test('provider order does not matter for label — password first or last', () => {
  const statePasswordFirst = getSecurityCardState({
    providers: ['password', 'google.com'],
    email: 'e@e.com',
  });
  const stateGoogleFirst = getSecurityCardState({
    providers: ['google.com', 'password'],
    email: 'e@e.com',
  });
  assert.equal(statePasswordFirst.panel, stateGoogleFirst.panel);
  assert.equal(statePasswordFirst.providerLabel, stateGoogleFirst.providerLabel);
});
