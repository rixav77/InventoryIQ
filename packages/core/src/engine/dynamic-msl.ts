import { calculateRollingDrr } from './drr.js';
import {
  calculateDemandStandardDeviation,
  calculateLeadTimeMetrics,
  calculateSafetyStock,
} from './safety-stock.js';
import { assertFiniteNonNegative } from './statistics.js';
import { calculateEvmReorderQuantity, calculateReorderLevel } from './static-msl.js';
import type {
  DynamicMslInput,
  DynamicMslRecommendation,
  InventoryRiskFlag,
  MslChangeAction,
} from './types.js';

export function calculateDynamicMinimumStockLevel(
  dynamicDailyRunRate: number,
  actualAverageLeadTimeDays: number,
  safetyStock: number,
): number {
  assertFiniteNonNegative(dynamicDailyRunRate, 'dynamicDailyRunRate');
  assertFiniteNonNegative(actualAverageLeadTimeDays, 'actualAverageLeadTimeDays');
  assertFiniteNonNegative(safetyStock, 'safetyStock');
  return Math.ceil(dynamicDailyRunRate * actualAverageLeadTimeDays + safetyStock);
}

export function classifyInventoryRisk(
  netStockPosition: number,
  dynamicDailyRunRate: number,
): InventoryRiskFlag {
  if (!Number.isFinite(netStockPosition)) {
    throw new Error('netStockPosition must be finite.');
  }
  assertFiniteNonNegative(dynamicDailyRunRate, 'dynamicDailyRunRate');

  if (netStockPosition < 0) {
    return 'STOCKOUT_RISK';
  }

  return dynamicDailyRunRate > 0 && netStockPosition > dynamicDailyRunRate * 30
    ? 'CAPITAL_SURPLUS'
    : 'BALANCED';
}

function determineMslAction(
  currentMinimumStockLevel: number,
  recommendedMinimumStockLevel: number,
): MslChangeAction {
  if (recommendedMinimumStockLevel > currentMinimumStockLevel) {
    return 'INCREASE';
  }
  if (recommendedMinimumStockLevel < currentMinimumStockLevel) {
    return 'DECREASE';
  }
  return 'KEEP';
}

export function generateDynamicMslRecommendation(
  input: DynamicMslInput,
): DynamicMslRecommendation {
  assertFiniteNonNegative(input.currentStock, 'currentStock');
  assertFiniteNonNegative(input.openPurchaseOrders, 'openPurchaseOrders');
  assertFiniteNonNegative(input.inTransitStock, 'inTransitStock');
  assertFiniteNonNegative(input.minimumOrderQuantity, 'minimumOrderQuantity');
  assertFiniteNonNegative(input.currentMinimumStockLevel, 'currentMinimumStockLevel');

  const drr = calculateRollingDrr(input.dailySales, {
    asOfDate: input.asOfDate,
    eventMultiplier: input.eventMultiplier,
    ...(input.weights === undefined ? {} : { weights: input.weights }),
  });
  const demandStandardDeviation = calculateDemandStandardDeviation(
    input.dailySales,
    input.asOfDate,
  );
  const leadTime = calculateLeadTimeMetrics(input.leadTimeSamples);
  const safetyStock = calculateSafetyStock({
    ...(input.serviceLevelZ === undefined ? {} : { serviceLevelZ: input.serviceLevelZ }),
    actualAverageLeadTimeDays: leadTime.actualAverageLeadTimeDays,
    demandStandardDeviation,
    averageDailyRunRate: drr.dynamicDrr,
    leadTimeStandardDeviationDays: leadTime.leadTimeStandardDeviationDays,
  });
  const recommendedMinimumStockLevel = calculateDynamicMinimumStockLevel(
    drr.dynamicDrr,
    leadTime.actualAverageLeadTimeDays,
    safetyStock,
  );
  const reorderLevel = calculateReorderLevel(
    recommendedMinimumStockLevel,
    input.minimumOrderQuantity,
  );
  const netStockPosition = calculateEvmReorderQuantity(
    input.openPurchaseOrders,
    input.inTransitStock,
    input.currentStock,
    reorderLevel,
  );
  const riskFlag = classifyInventoryRisk(netStockPosition, drr.dynamicDrr);
  const action = determineMslAction(
    input.currentMinimumStockLevel,
    recommendedMinimumStockLevel,
  );
  const trend = drr.trendPercent === null ? 'unavailable' : `${drr.trendPercent.toFixed(1)}%`;

  return {
    sku: input.sku,
    recommendedMinimumStockLevel,
    reorderLevel,
    netStockPosition,
    action,
    riskFlag,
    rationale: `Weighted DRR ${drr.weightedBaseDrr.toFixed(1)}/day (${trend} 7d vs 30d), ${drr.eventMultiplier.toFixed(1)}x event multiplier, ${leadTime.actualAverageLeadTimeDays.toFixed(1)}-day actual lead time, and ${Math.ceil(safetyStock)} units safety stock.`,
    drr,
    safetyStock,
    demandStandardDeviation,
    leadTime,
    provenance: input.provenance,
  };
}
