import { assertFiniteNonNegative } from './engine/statistics.js';
import { calculateEvmReorderQuantity } from './engine/static-msl.js';

export type SurplusAlertLevel = 'HEALTHY' | 'WATCH' | 'WARNING' | 'CRITICAL';

export interface SurplusDetectionResult {
  sku: string;
  netStockPosition: number;
  surplusUnits: number;
  surplusDays: number | null;
  alertLevel: SurplusAlertLevel;
}

export function classifySurplusAlert(
  surplusDays: number | null,
  surplusUnits: number,
): SurplusAlertLevel {
  assertFiniteNonNegative(surplusUnits, 'surplusUnits');
  if (surplusUnits === 0) {
    return 'HEALTHY';
  }
  if (surplusDays === null) {
    return 'CRITICAL';
  }
  assertFiniteNonNegative(surplusDays, 'surplusDays');
  if (surplusDays < 30) {
    return 'HEALTHY';
  }
  if (surplusDays < 60) {
    return 'WATCH';
  }
  return surplusDays <= 90 ? 'WARNING' : 'CRITICAL';
}

export function detectSurplusStock(input: {
  sku: string;
  currentStock: number;
  openPurchaseOrders: number;
  inTransitStock: number;
  reorderLevel: number;
  drr30: number;
}): SurplusDetectionResult {
  if (input.sku.trim().length === 0) {
    throw new Error('sku must not be empty.');
  }
  assertFiniteNonNegative(input.drr30, 'drr30');
  const netStockPosition = calculateEvmReorderQuantity(
    input.openPurchaseOrders,
    input.inTransitStock,
    input.currentStock,
    input.reorderLevel,
  );
  const surplusUnits = Math.max(0, netStockPosition);
  const surplusDays = surplusUnits === 0 ? 0 : input.drr30 === 0 ? null : surplusUnits / input.drr30;

  return {
    sku: input.sku,
    netStockPosition,
    surplusUnits,
    surplusDays,
    alertLevel: classifySurplusAlert(surplusDays, surplusUnits),
  };
}
