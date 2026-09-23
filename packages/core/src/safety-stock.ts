import { getClassServicePolicy } from './abc-xyz-classifier.js';
import {
  calculateDemandStandardDeviation,
  calculateLeadTimeMetrics,
  calculateSafetyStock,
} from './engine/safety-stock.js';
import { assertFiniteNonNegative } from './engine/statistics.js';
import type { DailySalesPoint } from './engine/types.js';
import type {
  CombinedClass,
  ServiceLevelPolicy,
} from './demand-intelligence/types.js';

export {
  DEFAULT_SERVICE_LEVEL_Z,
  calculateDemandStandardDeviation,
  calculateLeadTimeMetrics,
  calculateSafetyStock,
} from './engine/safety-stock.js';

export interface SafetyStockRecommendation extends ServiceLevelPolicy {
  combinedClass: CombinedClass;
  currentSafetyStock: number;
  recommendedSafetyStock: number;
  demandStandardDeviation: number;
  averageDailyRunRate: number;
  actualAverageLeadTimeDays: number;
  leadTimeStandardDeviationDays: number;
}

export function calculateClassDrivenSafetyStock(input: {
  combinedClass: CombinedClass;
  currentSafetyStock: number;
  sales: readonly DailySalesPoint[];
  asOfDate: string;
  averageDailyRunRate: number;
  leadTimeSamples: readonly number[];
}): SafetyStockRecommendation {
  assertFiniteNonNegative(input.currentSafetyStock, 'currentSafetyStock');
  assertFiniteNonNegative(input.averageDailyRunRate, 'averageDailyRunRate');
  const policy = getClassServicePolicy(input.combinedClass);
  const demandStandardDeviation = calculateDemandStandardDeviation(
    input.sales,
    input.asOfDate,
  );
  const leadTime = calculateLeadTimeMetrics(input.leadTimeSamples);
  const safetyStock = calculateSafetyStock({
    serviceLevelZ: policy.zScore,
    actualAverageLeadTimeDays: leadTime.actualAverageLeadTimeDays,
    demandStandardDeviation,
    averageDailyRunRate: input.averageDailyRunRate,
    leadTimeStandardDeviationDays: leadTime.leadTimeStandardDeviationDays,
  });

  return {
    combinedClass: input.combinedClass,
    currentSafetyStock: input.currentSafetyStock,
    recommendedSafetyStock: Math.ceil(safetyStock),
    demandStandardDeviation,
    averageDailyRunRate: input.averageDailyRunRate,
    actualAverageLeadTimeDays: leadTime.actualAverageLeadTimeDays,
    leadTimeStandardDeviationDays: leadTime.leadTimeStandardDeviationDays,
    ...policy,
  };
}
