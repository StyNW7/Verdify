export type BookingLifecycleStatus =
  | 'draft'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type BookingLifecyclePaymentStatus = 'pending' | 'completed';

export type BookingLifecycleInput = {
  status: BookingLifecycleStatus;
  paymentStatus: BookingLifecyclePaymentStatus;
};

export type BookingLifecycleDecision = {
  showConfirm: boolean;
  showMarkPaid: boolean;
  showMarkCompleted: boolean;
  showCancel: boolean;
  content: 'draft' | 'qr' | 'tripDone' | 'cancelled';
};

export function bookingLifecycle(
  input: BookingLifecycleInput,
): BookingLifecycleDecision {
  if (input.status === 'cancelled') {
    return {
      showConfirm: false,
      showMarkPaid: false,
      showMarkCompleted: false,
      showCancel: false,
      content: 'cancelled',
    };
  }
  if (input.status === 'completed') {
    return {
      showConfirm: false,
      showMarkPaid: false,
      showMarkCompleted: false,
      showCancel: false,
      content: 'tripDone',
    };
  }
  if (input.status === 'draft') {
    return {
      showConfirm: true,
      showMarkPaid: false,
      showMarkCompleted: false,
      showCancel: true,
      content: 'draft',
    };
  }
  const paid = input.paymentStatus === 'completed';
  return {
    showConfirm: false,
    showMarkPaid: !paid,
    showMarkCompleted: paid,
    showCancel: true,
    content: 'qr',
  };
}
