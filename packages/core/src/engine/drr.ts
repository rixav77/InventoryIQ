import { assertFiniteNonNegative, assertFinitePositive } from './statistics.js';
import type { DailySalesPoint, DrrWeights, RollingDrrMetrics } from './types.js';

const DAY_MS = 86_400_000;

export const DEFAULT_DRR_WEIGHTS: Readonly<DrrWeights> = {
  trailing7Days: 0.5,
  trailing14Days: 0.3,
  trailing30Days: 0.2,
};

function parseIsoDate(date: string): number {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid ISO calendar date: ${date}`);
  }
  return timestamp;
}

function validateWeights(weights: DrrWeights): void {
  assertFiniteNonNegative(weights.trailing7Days, 'weights.trailing7Days');
  assertFiniteNonNegative(weights.trailing14Days, 'weights.trailing14Days');
  assertFiniteNonNegative(weights.trailing30Days, 'weights.trailing30Days');
  const sum = weights.trailing7Days + weights.trailing14Days + weights.trailing30Days;
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error('DRR weights must sum to 1.');
  }
}

export function aggregateDailySales(
  sales: readonly DailySalesPoint[],
  asOfDate: string,
): ReadonlyMap<number, number> {
  const asOfTimestamp = parseIsoDate(asOfDate);
  const totals = new Map<number, number>();

  for (const point of sales) {
    assertFiniteNonNegative(point.unitsSold, `unitsSold on ${point.date}`);
    const timestamp = parseIsoDate(point.date);
    if (timestamp <= asOfTimestamp) {
      totals.set(timestamp, (totals.get(timestamp) ?? 0) + point.unitsSold);
    }
  }

  return totals;
}

export function calculateRollingAverage(
  sales: readonly DailySalesPoint[],
  windowDays: number,
  asOfDate: string,
): number {
  if (!Number.isInteger(windowDays) || windowDays <= 0) {
    throw new Error('windowDays must be a positive integer.');
  }

  const asOfTimestamp = parseIsoDate(asOfDate);
  const totals = aggregateDailySales(sales, asOfDate);
  let sum = 0;

  for (let offset = 0; offset < windowDays; offset += 1) {
    sum += totals.get(asOfTimestamp - offset * DAY_MS) ?? 0;
  }

  return sum / windowDays;
}

export function calculateRollingDrr(
  sales: readonly DailySalesPoint[],
  options: {
    asOfDate: string;
    eventMultiplier?: number;
    weights?: DrrWeights;
  },
): RollingDrrMetrics {
  if (sales.length === 0) {
    throw new Error('At least one daily sales record is required.');
  }

  const weights = options.weights ?? DEFAULT_DRR_WEIGHTS;
  const eventMultiplier = options.eventMultiplier ?? 1;
  validateWeights(weights);
  assertFinitePositive(eventMultiplier, 'eventMultiplier');

  const trailing7Days = calculateRollingAverage(sales, 7, options.asOfDate);
  const trailing14Days = calculateRollingAverage(sales, 14, options.asOfDate);
  const trailing30Days = calculateRollingAverage(sales, 30, options.asOfDate);
  const weightedBaseDrr =
    weights.trailing7Days * trailing7Days +
    weights.trailing14Days * trailing14Days +
    weights.trailing30Days * trailing30Days;

  return {
    trailing7Days,
    trailing14Days,
    trailing30Days,
    weightedBaseDrr,
    eventMultiplier,
    dynamicDrr: weightedBaseDrr * eventMultiplier,
    trendPercent:
      trailing30Days === 0 ? null : ((trailing7Days - trailing30Days) / trailing30Days) * 100,
  };
}

export function getTrailingDailyUnits(
  sales: readonly DailySalesPoint[],
  windowDays: number,
  asOfDate: string,
): number[] {
  if (!Number.isInteger(windowDays) || windowDays <= 0) {
    throw new Error('windowDays must be a positive integer.');
  }

  const asOfTimestamp = parseIsoDate(asOfDate);
  const totals = aggregateDailySales(sales, asOfDate);
  return Array.from(
    { length: windowDays },
    (_, index) => totals.get(asOfTimestamp - (windowDays - 1 - index) * DAY_MS) ?? 0,
  );
}
