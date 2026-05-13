import { QRCodeSVG } from 'qrcode.react';

type QrCardProps = {
  legLabel: string;
  cost: number;
  bookingReference: string;
};

function formatCost(cost: number): string {
  return `RM ${cost.toFixed(2)}`;
}

export function QrCard({ legLabel, cost, bookingReference }: QrCardProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-[16px] p-4 sm:flex-row sm:items-center sm:gap-5 sm:rounded-[18px] sm:p-5"
      style={{
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-[12px] p-2.5"
        style={{
          background: '#ffffff',
          border: '1px solid var(--theme-border)',
        }}
      >
        <QRCodeSVG
          value={bookingReference}
          size={112}
          level="M"
          marginSize={0}
          aria-label={`Booking QR for ${legLabel}`}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          Bookable leg
        </div>
        <div
          className="theme-display truncate"
          style={{ color: 'var(--theme-fg)', fontSize: 'clamp(1.05rem, 3vw, 1.3rem)' }}
        >
          {legLabel}
        </div>
        <div className="theme-mono-sm break-all" style={{ color: 'var(--theme-fg-muted)' }}>
          {bookingReference}
        </div>
        <div
          className="theme-display mt-1"
          style={{ color: 'var(--theme-accent)', fontSize: '1.15rem' }}
        >
          {formatCost(cost)}
        </div>
      </div>
    </div>
  );
}
