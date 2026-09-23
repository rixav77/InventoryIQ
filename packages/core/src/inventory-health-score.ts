import { assertFiniteNonNegative } from './engine/statistics.js';

export type InventoryHealthBand = 'HEALTHY' | 'NEEDS_ATTENTION' | 'AT_RISK' | 'CRITICAL';

export interface InventoryHealthComponents {
  drrStability: number;
  stockMslAlignment: number;
  poPipelineAdequacy: number;
  capitalEfficiency: number;
  vendorReliability: number;
}

export interface InventoryHealthScore {
  score: number;
  band: InventoryHealthBand;
  components: InventoryHealthComponents;
}

function clampUnitInterval(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function assertNormalized(value: number, name: string): void {
  assertFiniteNonNegative(value, name);
  if (value > 1) {
    throw new Error(`${name} must be between 0 and 1.`);
  }
}

export function calculateDrrStability(coefficientOfVariation: number | null): number {
  if (coefficientOfVariation === null) {
    return 0;
  }
  assertFiniteNonNegative(coefficientOfVariation, 'coefficientOfVariation');
  return clampUnitInterval(1 - coefficientOfVariation);
}

export function calculateStockMslAlignment(currentStock: number, minimumStockLevel: number): number {
  assertFiniteNonNegative(currentStock, 'currentStock');
  assertFiniteNonNegative(minimumStockLevel, 'minimumStockLevel');
  if (minimumStockLevel === 0) {
    return currentStock === 0 ? 1 : 0;
  }
  return clampUnitInterval(1 - Math.abs(currentStock / minimumStockLevel - 1));
}

export function calculatePoPipelineAdequacy(
  currentStock: number,
  openPurchaseOrders: number,
  inTransitStock: number,
  reorderLevel: number,
): number {
  assertFiniteNonNegative(currentStock, 'currentStock');
  assertFiniteNonNegative(openPurchaseOrders, 'openPurchaseOrders');
  assertFiniteNonNegative(inTransitStock, 'inTransitStock');
  assertFiniteNonNegative(reorderLevel, 'reorderLevel');
  return currentStock + openPurchaseOrders + inTransitStock >= reorderLevel ? 1 : 0;
}

export function classifyInventoryHealthScore(score: number): InventoryHealthBand {
  assertFiniteNonNegative(score, 'score');
  if (score > 100) {
    throw new Error('score must be between 0 and 100.');
  }
  if (score >= 80) {
    return 'HEALTHY';
  }
  if (score >= 60) {
    return 'NEEDS_ATTENTION';
  }
  return score >= 40 ? 'AT_RISK' : 'CRITICAL';
}

export function calculateInventoryHealthScore(
  components: InventoryHealthComponents,
): InventoryHealthScore {
  assertNormalized(components.drrStability, 'drrStability');
  assertNormalized(components.stockMslAlignment, 'stockMslAlignment');
  assertNormalized(components.poPipelineAdequacy, 'poPipelineAdequacy');
  assertNormalized(components.capitalEfficiency, 'capitalEfficiency');
  assertNormalized(components.vendorReliability, 'vendorReliability');
  const score =
    (0.3 * components.drrStability +
      0.25 * components.stockMslAlignment +
      0.2 * components.poPipelineAdequacy +
      0.15 * components.capitalEfficiency +
      0.1 * components.vendorReliability) *
    100;

  return {
    score,
    band: classifyInventoryHealthScore(score),
    components,
  };
}
