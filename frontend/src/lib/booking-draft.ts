import type { BackendRouteOption, JourneyProgressRecord } from './api';

export type BookingStatus =
  | 'draft'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type BookingDraftDisplay = {
  routeName: string;
  routeLabel: string;
  origin: string;
  destination: string;
  routeModesLabel: string;
  allowedModesLabel: string;
  durationText: string;
  stopLabel: string;
};

export type BookingDraft = {
  status: 'draft';
  routeId: string;
  routeSnapshot: BackendRouteOption;
  passengers: number;
  display?: BookingDraftDisplay;
};

export type ConfirmedBooking = {
  status: Exclude<BookingStatus, 'draft'>;
  bookingId: string;
  bookingReference: string;
  routeId: string;
  routeSnapshot: BackendRouteOption;
  passengers: number;
  estimatedPoints: number;
  actualPoints?: number;
  paymentStatus: string;
  journeyProgress?: JourneyProgressRecord;
  createdAt?: string;
};

export type Booking = BookingDraft | ConfirmedBooking;

export function createBookingDraft(
  route: BackendRouteOption,
  passengers: number,
  display?: BookingDraftDisplay,
): BookingDraft {
  return {
    status: 'draft',
    routeId: route.routeId,
    routeSnapshot: route,
    passengers,
    display,
  };
}
