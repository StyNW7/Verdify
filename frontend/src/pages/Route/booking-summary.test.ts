import assert from 'node:assert/strict';
import test from 'node:test';

import { createBookingSummary } from './booking-summary.ts';

test('booking summary renders the server-provided trip total without multiplying by passengers', () => {
  const summary = createBookingSummary({
    route: {
      name: 'Express',
      label: 'Fastest',
      modes: ['GrabEV', 'RTS Link'],
      durationText: '30m',
      co2: 1.2,
      cost: 18,
      points: 80,
      steps: ['Book GrabEV', 'Take RTS Link'],
    },
    origin: 'Bukit Indah, Johor',
    destination: 'Woodlands North, Singapore',
    passengers: 3,
    preference: 'fast',
    dateSlot: 'today',
    pickedDate: '',
    time: '09:30',
    modes: {
      rts: true,
      lrt: false,
      bus: true,
      walking: false,
      biking: false,
      evTaxi: true,
    },
  });

  assert.deepEqual(summary, {
    routeName: 'Express',
    routeLabel: 'Fastest',
    corridor: 'Bukit Indah, Johor → Woodlands North, Singapore',
    passengerLabel: '3 passengers',
    preferenceLabel: 'Fastest',
    departureLabel: 'Today at 09:30',
    allowedModesLabel: 'RTS Link, Bus, EV Taxi',
    routeModesLabel: 'GrabEV + RTS Link',
    perPassengerPrice: 'RM 18.00',
    totalPrice: 'RM 18.00',
    durationText: '30m',
    co2Label: '1.2 kg CO₂',
    pointsLabel: '+80 pts',
    stopLabel: '2 stops',
  });
});
