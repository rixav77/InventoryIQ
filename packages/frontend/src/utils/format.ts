export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

export function formatDelta(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('en-IN')}`;
}
