import { assertFiniteNonNegative } from './engine/statistics.js';

export interface MoqTrapAnalysis {
  sku: string;
  isMoqTrap: boolean;
  overshootUnits: number;
  capitalTrapped: number;
  daysOfCover: number | null;
  monthsOfCover: number | null;
}

export function analyzeMoqTrap(input: {
  sku: string;
  minimumOrderQuantity: number;
  minimumStockLevel: number;
  averageDailyDemand: number;
  averageProcurementPrice: number;
}): MoqTrapAnalysis {
  if (input.sku.trim().length === 0) {
    throw new Error('sku must not be empty.');
  }
  assertFiniteNonNegative(input.minimumOrderQuantity, 'minimumOrderQuantity');
  assertFiniteNonNegative(input.minimumStockLevel, 'minimumStockLevel');
  assertFiniteNonNegative(input.averageDailyDemand, 'averageDailyDemand');
  assertFiniteNonNegative(input.averageProcurementPrice, 'averageProcurementPrice');
  const overshootUnits = Math.max(0, input.minimumOrderQuantity - input.minimumStockLevel);
  const daysOfCover =
    input.averageDailyDemand === 0
      ? null
      : input.minimumOrderQuantity / input.averageDailyDemand;

  return {
    sku: input.sku,
    isMoqTrap: overshootUnits > 0,
    overshootUnits,
    capitalTrapped: overshootUnits * input.averageProcurementPrice,
    daysOfCover,
    monthsOfCover: daysOfCover === null ? null : daysOfCover / 30,
  };
}
