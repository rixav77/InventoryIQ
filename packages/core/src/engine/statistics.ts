export function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite, non-negative number.`);
  }
}

export function assertFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite, positive number.`);
  }
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('At least one value is required.');
  }

  values.forEach((value, index) => assertFiniteNonNegative(value, `values[${index}]`));
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function populationStandardDeviation(values: readonly number[]): number {
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
