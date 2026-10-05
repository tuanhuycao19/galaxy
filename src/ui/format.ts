const KM_PER_AU = 149_597_870.7;
const DAYS_PER_YEAR = 365.25;

const formatters = new Map<number, Intl.NumberFormat>();

/** Vietnamese number formatting: "." for thousands, "," for decimals. */
export function formatNumber(value: number, digits = 0): string {
  let f = formatters.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(digits, f);
  }
  return f.format(value);
}

export function formatKm(km: number): string {
  return `${formatNumber(km)} km`;
}

export function formatAu(au: number): string {
  return `${formatNumber(au, 2)} AU · ${formatNumber((au * KM_PER_AU) / 1e6, 1)} triệu km`;
}

/** Picks hours, days or years, whichever reads best. */
export function formatDuration(days: number): string {
  if (days < 2) return `${formatNumber(days * 24, 1)} giờ`;
  if (days < 2 * DAYS_PER_YEAR) return `${formatNumber(days, 1)} ngày`;
  return `${formatNumber(days / DAYS_PER_YEAR, 2)} năm`;
}

export function formatDegrees(deg: number): string {
  return `${formatNumber(deg, 2)}°`;
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}
