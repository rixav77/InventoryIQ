export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

export function formatInr(value: number): string {
  return `₹${formatInt(value)}`;
}

export function formatInrCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

export function formatUsd(value: number, digits = 2): string {
  return `$${value.toFixed(digits)}`;
}

export function formatUsdCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatSigned(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${formatInt(rounded)}`;
}

export function formatDays(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value)}d`;
}

export function formatDecimalDays(value: number): string {
  return `${value.toFixed(1)}d`;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${monthName(date.getUTCMonth() + 1)} ${date.getUTCFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return `${date.getUTCDate()} ${monthName(date.getUTCMonth() + 1)}`;
}
