import { assertFiniteNonNegative } from './statistics.js';
import type { EvmActionStatus, StaticMslResult } from './types.js';

export function calculateStaticMinimumStockLevel(
  monthlySellingPlan: number,
  procurementTimeDays: number,
): number {
  assertFiniteNonNegative(monthlySellingPlan, 'monthlySellingPlan');
  assertFiniteNonNegative(procurementTimeDays, 'procurementTimeDays');
  return (monthlySellingPlan * procurementTimeDays) / 30;
}

export function calculateReorderLevel(
  minimumStockLevel: number,
  minimumOrderQuantity: number,
): number {
  assertFiniteNonNegative(minimumStockLevel, 'minimumStockLevel');
  assertFiniteNonNegative(minimumOrderQuantity, 'minimumOrderQuantity');
  return Math.max(minimumStockLevel, minimumOrderQuantity);
}

export function calculateEvmReorderQuantity(
  openPurchaseOrders: number,
  inTransitStock: number,
  currentStock: number,
  reorderLevel: number,
): number {
  assertFiniteNonNegative(openPurchaseOrders, 'openPurchaseOrders');
  assertFiniteNonNegative(inTransitStock, 'inTransitStock');
  assertFiniteNonNegative(currentStock, 'currentStock');
  assertFiniteNonNegative(reorderLevel, 'reorderLevel');
  return openPurchaseOrders + inTransitStock + currentStock - reorderLevel;
}

export function calculateEvmActionStatus(
  currentStock: number,
  openPurchaseOrders: number,
  inTransitStock: number,
  reorderLevel: number,
): EvmActionStatus {
  return calculateEvmReorderQuantity(
    openPurchaseOrders,
    inTransitStock,
    currentStock,
    reorderLevel,
  ) < 0
    ? 'REORDER NOW'
    : 'OK';
}

export function calculateStaticMsl(input: {
  monthlySellingPlan: number;
  procurementTimeDays: number;
  minimumOrderQuantity: number;
  currentStock: number;
  openPurchaseOrders: number;
  inTransitStock: number;
}): StaticMslResult {
  const minimumStockLevel = calculateStaticMinimumStockLevel(
    input.monthlySellingPlan,
    input.procurementTimeDays,
  );
  const reorderLevel = calculateReorderLevel(minimumStockLevel, input.minimumOrderQuantity);
  const reorderQuantity = calculateEvmReorderQuantity(
    input.openPurchaseOrders,
    input.inTransitStock,
    input.currentStock,
    reorderLevel,
  );

  return {
    minimumStockLevel,
    reorderLevel,
    reorderQuantity,
    actionStatus: reorderQuantity < 0 ? 'REORDER NOW' : 'OK',
  };
}
