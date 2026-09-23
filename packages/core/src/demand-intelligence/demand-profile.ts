import {
  calculateRollingAverage,
  getTrailingDailyUnits,
} from '../engine/drr.js';
import {
  assertFiniteNonNegative,
  assertFinitePositive,
  mean,
  populationStandardDeviation,
} from '../engine/statistics.js';
import type { DailySalesPoint } from '../engine/types.js';
import type {
  DemandProfileMetrics,
  DemandTrend,
  DemandVolatility,
} from './types.js';

export const DEFAULT_TREND_DEADBAND_PERCENT = 5;
export const XYZ_PREDICTABLE_MAX_CV = 0.25;
export const XYZ_MODERATE_MAX_CV = 0.5;

export function classifyDemandVolatility(
  coefficientOfVariation: number | null,
  predictableMaxCv = XYZ_PREDICTABLE_MAX_CV,
  moderateMaxCv = XYZ_MODERATE_MAX_CV,
): DemandVolatility {
  assertFiniteNonNegative(predictableMaxCv, 'predictableMaxCv');
  assertFinitePositive(moderateMaxCv, 'moderateMaxCv');
  if (predictableMaxCv >= moderateMaxCv) {
    throw new Error('predictableMaxCv must be less than moderateMaxCv.');
  }
  if (coefficientOfVariation === null) {
    return 'ERRATIC';
  }
  assertFiniteNonNegative(coefficientOfVariation, 'coefficientOfVariation');
  if (coefficientOfVariation <= predictableMaxCv) {
    return 'PREDICTABLE';
  }
  return coefficientOfVariation <= moderateMaxCv ? 'MODERATE' : 'ERRATIC';
}

export function classifyDemandTrend(
  trendPercent: number | null,
  deadbandPercent = DEFAULT_TREND_DEADBAND_PERCENT,
): DemandTrend {
  assertFiniteNonNegative(deadbandPercent, 'deadbandPercent');
  if (trendPercent === null || Math.abs(trendPercent) <= deadbandPercent) {
    return 'STABLE';
  }
  if (!Number.isFinite(trendPercent)) {
    throw new Error('trendPercent must be finite or null.');
  }
  return trendPercent > 0 ? 'RISING' : 'FALLING';
}

export function calculateDemandProfile(
  sales: readonly DailySalesPoint[],
  asOfDate: string,
  options: {
    trendDeadbandPercent?: number;
    predictableMaxCv?: number;
    moderateMaxCv?: number;
  } = {},
): DemandProfileMetrics {
  if (sales.length === 0) {
    throw new Error('At least one daily sales record is required.');
  }

  const drr7 = calculateRollingAverage(sales, 7, asOfDate);
  const drr14 = calculateRollingAverage(sales, 14, asOfDate);
  const drr30 = calculateRollingAverage(sales, 30, asOfDate);
  const drr90 = calculateRollingAverage(sales, 90, asOfDate);
  const trailing30 = getTrailingDailyUnits(sales, 30, asOfDate);
  const demandMean = mean(trailing30);
  const demandCoefficientOfVariation =
    demandMean === 0 ? null : populationStandardDeviation(trailing30) / demandMean;
  const trendPercent = drr30 === 0 ? null : ((drr7 - drr30) / drr30) * 100;

  return {
    drr7,
    drr14,
    drr30,
    drr90,
    trendPercent,
    trend: classifyDemandTrend(
      trendPercent,
      options.trendDeadbandPercent ?? DEFAULT_TREND_DEADBAND_PERCENT,
    ),
    demandCoefficientOfVariation,
    volatility: classifyDemandVolatility(
      demandCoefficientOfVariation,
      options.predictableMaxCv ?? XYZ_PREDICTABLE_MAX_CV,
      options.moderateMaxCv ?? XYZ_MODERATE_MAX_CV,
    ),
  };
}
