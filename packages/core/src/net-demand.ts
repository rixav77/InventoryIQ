import { assertFiniteNonNegative } from './engine/statistics.js';
import type {
  ChannelDailySalesPoint,
  NetDemandMetrics,
} from './demand-intelligence/types.js';

const DAY_MS = 86_400_000;

function parseIsoDate(date: string): number {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid ISO calendar date: ${date}`);
  }
  return timestamp;
}

function sumWindow(
  sales: readonly ChannelDailySalesPoint[],
  asOfDate: string,
  windowDays: number,
): { sold: number; returned: number } {
  const asOfTimestamp = parseIsoDate(asOfDate);
  const startTimestamp = asOfTimestamp - (windowDays - 1) * DAY_MS;
  let sold = 0;
  let returned = 0;

  for (const point of sales) {
    assertFiniteNonNegative(point.unitsSold, `unitsSold on ${point.date}`);
    assertFiniteNonNegative(point.unitsReturned, `unitsReturned on ${point.date}`);
    assertFiniteNonNegative(point.grossRevenue, `grossRevenue on ${point.date}`);
    if (point.unitsReturned > point.unitsSold) {
      throw new Error(`unitsReturned cannot exceed unitsSold on ${point.date}.`);
    }
    const timestamp = parseIsoDate(point.date);
    if (timestamp >= startTimestamp && timestamp <= asOfTimestamp) {
      sold += point.unitsSold;
      returned += point.unitsReturned;
    }
  }

  return { sold, returned };
}

export function calculateReturnRate(unitsReturned: number, unitsSold: number): number {
  assertFiniteNonNegative(unitsReturned, 'unitsReturned');
  assertFiniteNonNegative(unitsSold, 'unitsSold');
  if (unitsReturned > unitsSold) {
    throw new Error('unitsReturned cannot exceed unitsSold.');
  }
  return unitsSold === 0 ? 0 : unitsReturned / unitsSold;
}

export function calculateNetDrr(grossDrr: number, returnRate: number): number {
  assertFiniteNonNegative(grossDrr, 'grossDrr');
  assertFiniteNonNegative(returnRate, 'returnRate');
  if (returnRate > 1) {
    throw new Error('returnRate cannot exceed 1.');
  }
  return grossDrr * (1 - returnRate);
}

export function calculateNetDemandMetrics(input: {
  sales: readonly ChannelDailySalesPoint[];
  asOfDate: string;
  grossDrr: number;
  categoryAverageReturnRate: number;
}): NetDemandMetrics {
  if (input.sales.length === 0) {
    throw new Error('At least one channel sales record is required.');
  }
  assertFiniteNonNegative(input.categoryAverageReturnRate, 'categoryAverageReturnRate');
  if (input.categoryAverageReturnRate > 1) {
    throw new Error('categoryAverageReturnRate cannot exceed 1.');
  }

  const trailing7 = sumWindow(input.sales, input.asOfDate, 7);
  const trailing30 = sumWindow(input.sales, input.asOfDate, 30);
  const returnRate7 = calculateReturnRate(trailing7.returned, trailing7.sold);
  const returnRate30 = calculateReturnRate(trailing30.returned, trailing30.sold);
  const returnRateTrendPercent =
    returnRate30 === 0 ? null : ((returnRate7 - returnRate30) / returnRate30) * 100;

  return {
    grossDrr: input.grossDrr,
    returnRate7,
    returnRate30,
    returnRateTrendPercent,
    netDrr: calculateNetDrr(input.grossDrr, returnRate30),
    anomaly: returnRate30 > input.categoryAverageReturnRate * 1.5,
  };
}
