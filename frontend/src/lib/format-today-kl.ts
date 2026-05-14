const KL_TZ = 'Asia/Kuala_Lumpur';

export function formatTodayInKL(now: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat('en-MY', { timeZone: KL_TZ, weekday: 'long' }).format(now);
  const day = new Intl.DateTimeFormat('en-MY', { timeZone: KL_TZ, day: 'numeric' }).format(now);
  const month = new Intl.DateTimeFormat('en-MY', { timeZone: KL_TZ, month: 'long' }).format(now);
  return `${weekday} · ${day} ${month}`;
}
