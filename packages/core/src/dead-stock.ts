import { getTrailingDailyUnits } from './engine/drr.js';
import { assertFiniteNonNegative } from './engine/statistics.js';
import type { DailySalesPoint } from './engine/types.js';

export type StockMovementStatus = 'ACTIVE' | 'SLOW_MOVING' | 'STAGNANT' | 'DEAD_STOCK';

export interface DeadStockAnalysis {
  sku: string;
  status: StockMovementStatus;
  unitsSold30Days: number;
  unitsSold60Days: number;
  unitsSold90Days: number;
  inventoryValue: number;
  estimatedMonthlyDepreciation: number;
  basis: 'SALES_ACTIVITY_ONLY';
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function classifyStockMovement(
  unitsSold30Days: number,
  unitsSold60Days: number,
  unitsSold90Days: number,
): StockMovementStatus {
  assertFiniteNonNegative(unitsSold30Days, 'unitsSold30Days');
  assertFiniteNonNegative(unitsSold60Days, 'unitsSold60Days');
  assertFiniteNonNegative(unitsSold90Days, 'unitsSold90Days');
  if (unitsSold30Days > unitsSold60Days || unitsSold60Days > unitsSold90Days) {
    throw new Error('Sales windows must be cumulative: 30 days <= 60 days <= 90 days.');
  }
  if (unitsSold30Days > 0) {
    return 'ACTIVE';
  }
  if (unitsSold60Days > 0) {
    return 'SLOW_MOVING';
  }
  return unitsSold90Days > 0 ? 'STAGNANT' : 'DEAD_STOCK';
}

export function analyzeDeadStock(input: {
  sku: string;
  sales: readonly DailySalesPoint[];
  asOfDate: string;
  currentStock: number;
  averageProcurementPrice: number;
  monthlyDepreciationRate?: number;
}): DeadStockAnalysis {
  if (input.sku.trim().length === 0) {
    throw new Error('sku must not be empty.');
  }
  assertFiniteNonNegative(input.currentStock, 'currentStock');
  assertFiniteNonNegative(input.averageProcurementPrice, 'averageProcurementPrice');
  const monthlyDepreciationRate = input.monthlyDepreciationRate ?? 0.02;
  assertFiniteNonNegative(monthlyDepreciationRate, 'monthlyDepreciationRate');
  if (monthlyDepreciationRate > 1) {
    throw new Error('monthlyDepreciationRate must be a decimal rate between 0 and 1.');
  }

  const unitsSold30Days = sum(getTrailingDailyUnits(input.sales, 30, input.asOfDate));
  const unitsSold60Days = sum(getTrailingDailyUnits(input.sales, 60, input.asOfDate));
  const unitsSold90Days = sum(getTrailingDailyUnits(input.sales, 90, input.asOfDate));
  const inventoryValue = input.currentStock * input.averageProcurementPrice;

  return {
    sku: input.sku,
    status: classifyStockMovement(unitsSold30Days, unitsSold60Days, unitsSold90Days),
    unitsSold30Days,
    unitsSold60Days,
    unitsSold90Days,
    inventoryValue,
    estimatedMonthlyDepreciation: inventoryValue * monthlyDepreciationRate,
    basis: 'SALES_ACTIVITY_ONLY',
  };
}
