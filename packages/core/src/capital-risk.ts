import { assertFiniteNonNegative } from './engine/statistics.js';

function assertRate(rate: number, name: string): void {
  assertFiniteNonNegative(rate, name);
  if (rate > 1) {
    throw new Error(`${name} must be a decimal rate between 0 and 1.`);
  }
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite.`);
  }
}

export interface CapitalRiskResult {
  surplusUnits: number;
  capitalLocked: number;
  expectedHoldingCost: number;
  annualCostOfCapitalRate: number;
  expectedHoldDays: number;
}

export interface MslCapitalImpact {
  deltaUnits: number;
  additionalInventoryValue: number;
  releasableInventoryValue: number;
  expectedAdditionalHoldingCost: number;
}

export function calculateCapitalLocked(
  surplusUnits: number,
  averageProcurementPrice: number,
): number {
  assertFiniteNonNegative(surplusUnits, 'surplusUnits');
  assertFiniteNonNegative(averageProcurementPrice, 'averageProcurementPrice');
  return surplusUnits * averageProcurementPrice;
}

export function calculateHoldingCost(
  inventoryValue: number,
  annualCostOfCapitalRate: number,
  expectedHoldDays: number,
): number {
  assertFiniteNonNegative(inventoryValue, 'inventoryValue');
  assertRate(annualCostOfCapitalRate, 'annualCostOfCapitalRate');
  assertFiniteNonNegative(expectedHoldDays, 'expectedHoldDays');
  return inventoryValue * annualCostOfCapitalRate * (expectedHoldDays / 365);
}

export function calculateCapitalRisk(input: {
  surplusUnits: number;
  averageProcurementPrice: number;
  annualCostOfCapitalRate: number;
  expectedHoldDays: number;
}): CapitalRiskResult {
  const capitalLocked = calculateCapitalLocked(
    input.surplusUnits,
    input.averageProcurementPrice,
  );
  return {
    surplusUnits: input.surplusUnits,
    capitalLocked,
    expectedHoldingCost: calculateHoldingCost(
      capitalLocked,
      input.annualCostOfCapitalRate,
      input.expectedHoldDays,
    ),
    annualCostOfCapitalRate: input.annualCostOfCapitalRate,
    expectedHoldDays: input.expectedHoldDays,
  };
}

export function calculateMslCapitalImpact(input: {
  currentMinimumStockLevel: number;
  recommendedMinimumStockLevel: number;
  averageProcurementPrice: number;
  annualCostOfCapitalRate: number;
  expectedHoldDays: number;
}): MslCapitalImpact {
  assertFiniteNonNegative(input.currentMinimumStockLevel, 'currentMinimumStockLevel');
  assertFiniteNonNegative(input.recommendedMinimumStockLevel, 'recommendedMinimumStockLevel');
  assertFiniteNonNegative(input.averageProcurementPrice, 'averageProcurementPrice');
  assertRate(input.annualCostOfCapitalRate, 'annualCostOfCapitalRate');
  assertFiniteNonNegative(input.expectedHoldDays, 'expectedHoldDays');
  const deltaUnits = input.recommendedMinimumStockLevel - input.currentMinimumStockLevel;
  assertFinite(deltaUnits, 'deltaUnits');
  const additionalInventoryValue = Math.max(deltaUnits, 0) * input.averageProcurementPrice;
  const releasableInventoryValue = Math.max(-deltaUnits, 0) * input.averageProcurementPrice;

  return {
    deltaUnits,
    additionalInventoryValue,
    releasableInventoryValue,
    expectedAdditionalHoldingCost: calculateHoldingCost(
      additionalInventoryValue,
      input.annualCostOfCapitalRate,
      input.expectedHoldDays,
    ),
  };
}
