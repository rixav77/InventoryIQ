import { assertFiniteNonNegative, mean } from './engine/statistics.js';
import type {
  DataProvenance,
  MonthlyDemandPoint,
  SeasonalityResult,
} from './demand-intelligence/types.js';

export function calculateSeasonalIndices(
  points: readonly MonthlyDemandPoint[],
  provenance: DataProvenance,
): SeasonalityResult {
  if (points.length < 12) {
    throw new Error('At least 12 monthly demand observations are required.');
  }

  const totalsByYearMonth = new Map<string, number>();
  for (const point of points) {
    if (!Number.isInteger(point.year) || point.year < 2000) {
      throw new Error(`Invalid year: ${point.year}`);
    }
    if (!Number.isInteger(point.month) || point.month < 1 || point.month > 12) {
      throw new Error(`Invalid month: ${point.month}`);
    }
    assertFiniteNonNegative(point.units, `units for ${point.year}-${point.month}`);
    const key = `${point.year}-${point.month}`;
    totalsByYearMonth.set(key, (totalsByYearMonth.get(key) ?? 0) + point.units);
  }

  const valuesByMonth = new Map<number, number[]>();
  for (const [key, units] of totalsByYearMonth) {
    const month = Number(key.split('-')[1]);
    const values = valuesByMonth.get(month) ?? [];
    values.push(units);
    valuesByMonth.set(month, values);
  }

  for (let month = 1; month <= 12; month += 1) {
    if (!valuesByMonth.has(month)) {
      throw new Error(`Missing demand observations for month ${month}.`);
    }
  }

  const averageByMonth = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return { month, averageUnits: mean(valuesByMonth.get(month) ?? []) };
  });
  const overallAverage = mean(averageByMonth.map(({ averageUnits }) => averageUnits));
  if (overallAverage === 0) {
    throw new Error('Monthly demand must contain at least one positive value.');
  }

  const indices = averageByMonth.map(({ month, averageUnits }) => ({
    month,
    averageUnits,
    index: averageUnits / overallAverage,
  }));
  const strongest = indices.reduce((best, current) =>
    current.index > best.index ? current : best,
  );
  const weakest = indices.reduce((best, current) =>
    current.index < best.index ? current : best,
  );

  return {
    indices,
    strongestMonth: strongest.month,
    weakestMonth: weakest.month,
    provenance,
  };
}
