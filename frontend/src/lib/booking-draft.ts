import type { BackendRouteOption } from './api';

export type BookingStatus =
  | 'draft'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type BookingDraft = {
  status: 'draft';
  routeId: string;
  routeSnapshot: BackendRouteOption;
  passengers: number;
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
  createdAt?: string;
};

export type Booking = BookingDraft | ConfirmedBooking;

export function createBookingDraft(
  route: BackendRouteOption,
  passengers: number,
): BookingDraft {
  return {
    status: 'draft',
    routeId: route.routeId,
    routeSnapshot: route,
    passengers,
  };
}
