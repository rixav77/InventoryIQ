import { getTrailingDailyUnits } from './drr.js';
import {
  assertFiniteNonNegative,
  assertFinitePositive,
  mean,
  populationStandardDeviation,
} from './statistics.js';
import type { DailySalesPoint, LeadTimeMetrics } from './types.js';

export const DEFAULT_SERVICE_LEVEL_Z = 1.65;

export function calculateLeadTimeMetrics(
  leadTimeSamples: readonly number[],
): LeadTimeMetrics {
  if (leadTimeSamples.length === 0) {
    throw new Error('At least one lead-time sample is required.');
  }

  leadTimeSamples.forEach((value, index) =>
    assertFiniteNonNegative(value, `leadTimeSamples[${index}]`),
  );

  return {
    actualAverageLeadTimeDays: mean(leadTimeSamples),
    leadTimeStandardDeviationDays: populationStandardDeviation(leadTimeSamples),
  };
}

export function calculateSafetyStock(input: {
  serviceLevelZ?: number;
  actualAverageLeadTimeDays: number;
  demandStandardDeviation: number;
  averageDailyRunRate: number;
  leadTimeStandardDeviationDays: number;
}): number {
  const serviceLevelZ = input.serviceLevelZ ?? DEFAULT_SERVICE_LEVEL_Z;
  assertFinitePositive(serviceLevelZ, 'serviceLevelZ');
  assertFiniteNonNegative(input.actualAverageLeadTimeDays, 'actualAverageLeadTimeDays');
  assertFiniteNonNegative(input.demandStandardDeviation, 'demandStandardDeviation');
  assertFiniteNonNegative(input.averageDailyRunRate, 'averageDailyRunRate');
  assertFiniteNonNegative(
    input.leadTimeStandardDeviationDays,
    'leadTimeStandardDeviationDays',
  );

  return (
    serviceLevelZ *
    Math.sqrt(
      input.actualAverageLeadTimeDays * input.demandStandardDeviation ** 2 +
        input.averageDailyRunRate ** 2 * input.leadTimeStandardDeviationDays ** 2,
    )
  );
}

export function calculateDemandStandardDeviation(
  sales: readonly DailySalesPoint[],
  asOfDate: string,
  windowDays = 90,
): number {
  return populationStandardDeviation(getTrailingDailyUnits(sales, windowDays, asOfDate));
}
