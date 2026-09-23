import { assertFiniteNonNegative } from './engine/statistics.js';
import {
  calculateTransferCost,
  classifyTransferSpeed,
  getProximity,
  getWarehouse,
} from './proximity-matrix.js';
import type { TransferSpeed } from './proximity-matrix.js';

export const DEFAULT_SOURCE_BUFFER_FACTOR = 1.1;
export const DEFAULT_MAX_DEFICIT_MULTIPLE = 1.2;
export const DEFAULT_MAX_RECOMMENDATIONS = 5;

const DEMAND_SHARE_TOLERANCE = 1e-9;

export type TransferRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WarehouseStockInput {
  warehouseCode: string;
  currentStock: number;
  allocatedStock: number;
}

export interface WarehouseStockPosition {
  warehouseCode: string;
  currentStock: number;
  allocatedStock: number;
  availableStock: number;
  demandShare: number;
  warehouseMinimumStockLevel: number;
  surplusUnits: number;
  deficitUnits: number;
}

export interface SkuWarehouseDistribution {
  sku: string;
  minimumStockLevel: number;
  demandDrr: number;
  demandShares: Readonly<Record<string, number>>;
  positions: readonly WarehouseStockInput[];
}

export interface TransferRecommendation {
  sku: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
  reason: string;
  transitSpeed: TransferSpeed;
  distanceKm: number;
  estimatedCostPerUnit: number;
  estimatedCost: number;
  risk: TransferRisk;
  sourceSurplusAfterTransfer: number;
}

export interface TransferOptimizerInput {
  distributions: readonly SkuWarehouseDistribution[];
  excludeSkus?: readonly string[];
  sourceBufferFactor?: number;
  maxDeficitMultiple?: number;
  maxRecommendations?: number;
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
}

function validateDemandShares(shares: Readonly<Record<string, number>>): void {
  let sum = 0;
  for (const [code, share] of Object.entries(shares)) {
    getWarehouse(code);
    assertFiniteNonNegative(share, `demandShares.${code}`);
    sum += share;
  }
  if (Math.abs(sum - 1) > DEMAND_SHARE_TOLERANCE) {
    throw new Error('demandShares must sum to 1.');
  }
}

export function analyzeWarehouseSurplusDeficit(
  input: SkuWarehouseDistribution,
): readonly WarehouseStockPosition[] {
  if (input.sku.trim().length === 0) {
    throw new Error('sku must not be empty.');
  }
  assertFiniteNonNegative(input.minimumStockLevel, 'minimumStockLevel');
  assertFiniteNonNegative(input.demandDrr, 'demandDrr');
  validateDemandShares(input.demandShares);

  return input.positions.map((position) => {
    getWarehouse(position.warehouseCode);
    assertNonNegativeInteger(position.currentStock, 'currentStock');
    assertNonNegativeInteger(position.allocatedStock, 'allocatedStock');
    if (position.allocatedStock > position.currentStock) {
      throw new Error(`allocatedStock exceeds currentStock for ${position.warehouseCode}.`);
    }
    const availableStock = position.currentStock - position.allocatedStock;
    const demandShare = input.demandShares[position.warehouseCode] ?? 0;
    const warehouseMinimumStockLevel = demandShare * input.minimumStockLevel;
    const netPosition = availableStock - warehouseMinimumStockLevel;

    return {
      warehouseCode: position.warehouseCode,
      currentStock: position.currentStock,
      allocatedStock: position.allocatedStock,
      availableStock,
      demandShare,
      warehouseMinimumStockLevel,
      surplusUnits: Math.max(netPosition, 0),
      deficitUnits: Math.max(-netPosition, 0),
    };
  });
}

function rankSources(
  sources: readonly WarehouseStockPosition[],
  destination: WarehouseStockPosition,
): WarehouseStockPosition[] {
  return [...sources].sort((a, b) => {
    const speedA = classifyTransferSpeed(a.warehouseCode, destination.warehouseCode);
    const speedB = classifyTransferSpeed(b.warehouseCode, destination.warehouseCode);
    const rankA = speedA === 'SAME_DAY' ? 0 : 1;
    const rankB = speedB === 'SAME_DAY' ? 0 : 1;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const distanceA = getProximity(a.warehouseCode, destination.warehouseCode).distanceKm;
    const distanceB = getProximity(b.warehouseCode, destination.warehouseCode).distanceKm;
    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }
    return b.surplusUnits - a.surplusUnits;
  });
}

function buildRecommendation(
  distribution: SkuWarehouseDistribution,
  source: WarehouseStockPosition,
  destination: WarehouseStockPosition,
  quantity: number,
): TransferRecommendation {
  const transitSpeed = classifyTransferSpeed(source.warehouseCode, destination.warehouseCode);
  const { distanceKm } = getProximity(source.warehouseCode, destination.warehouseCode);
  const { costPerUnit, totalCost } = calculateTransferCost(
    source.warehouseCode,
    destination.warehouseCode,
    quantity,
  );
  const sourceSurplusAfterTransfer = source.availableStock - quantity;
  const surplusConsumedRatio = source.surplusUnits === 0 ? 1 : quantity / source.surplusUnits;
  const risk: TransferRisk =
    surplusConsumedRatio <= 0.5 ? 'LOW' : surplusConsumedRatio <= 0.8 ? 'MEDIUM' : 'HIGH';
  const daysOfCover = distribution.demandDrr === 0 ? null : quantity / distribution.demandDrr;
  const coverText =
    daysOfCover === null
      ? ''
      : ` (about ${daysOfCover.toFixed(0)} days of cover at DRR ${Math.round(distribution.demandDrr)})`;
  const reason =
    `${destination.warehouseCode} available stock is ${destination.availableStock} against a warehouse MSL of ` +
    `${Math.round(destination.warehouseMinimumStockLevel)}. ${source.warehouseCode} holds ${Math.round(source.surplusUnits)} ` +
    `surplus above its own MSL. Transfer ${quantity} units${coverText}. ${source.warehouseCode} retains ` +
    `${Math.round(sourceSurplusAfterTransfer)} after transfer.`;

  return {
    sku: distribution.sku,
    fromWarehouse: source.warehouseCode,
    toWarehouse: destination.warehouseCode,
    quantity,
    reason,
    transitSpeed,
    distanceKm,
    estimatedCostPerUnit: costPerUnit,
    estimatedCost: totalCost,
    risk,
    sourceSurplusAfterTransfer,
  };
}

export function generateTransferRecommendations(
  input: TransferOptimizerInput,
): readonly TransferRecommendation[] {
  const bufferFactor = input.sourceBufferFactor ?? DEFAULT_SOURCE_BUFFER_FACTOR;
  const maxDeficitMultiple = input.maxDeficitMultiple ?? DEFAULT_MAX_DEFICIT_MULTIPLE;
  const maxRecommendations = input.maxRecommendations ?? DEFAULT_MAX_RECOMMENDATIONS;
  if (!Number.isFinite(bufferFactor) || bufferFactor < 1) {
    throw new Error('sourceBufferFactor must be a finite number >= 1.');
  }
  if (!Number.isFinite(maxDeficitMultiple) || maxDeficitMultiple < 1) {
    throw new Error('maxDeficitMultiple must be a finite number >= 1.');
  }
  if (!Number.isInteger(maxRecommendations) || maxRecommendations <= 0) {
    throw new Error('maxRecommendations must be a positive integer.');
  }
  const excluded = new Set(input.excludeSkus ?? []);
  const recommendations: TransferRecommendation[] = [];

  for (const distribution of input.distributions) {
    if (excluded.has(distribution.sku)) {
      continue;
    }
    const positions = analyzeWarehouseSurplusDeficit(distribution);
    const sources = positions.filter(
      (position) => position.surplusUnits > 0 && !getWarehouse(position.warehouseCode).isEcommerce,
    );
    const destinations = positions.filter((position) => position.deficitUnits > 0);
    if (sources.length === 0 || destinations.length === 0) {
      continue;
    }

    for (const destination of destinations) {
      const source = rankSources(sources, destination)[0];
      if (source === undefined) {
        continue;
      }
      const maxFromSource = Math.floor(
        source.availableStock - source.warehouseMinimumStockLevel * bufferFactor,
      );
      const maxForDeficit = Math.floor(destination.deficitUnits * maxDeficitMultiple);
      const quantity = Math.min(maxFromSource, maxForDeficit);
      if (quantity <= 0) {
        continue;
      }
      recommendations.push(buildRecommendation(distribution, source, destination, quantity));
    }
  }

  return recommendations
    .sort(
      (a, b) =>
        b.quantity - a.quantity ||
        a.sku.localeCompare(b.sku) ||
        a.toWarehouse.localeCompare(b.toWarehouse),
    )
    .slice(0, maxRecommendations);
}
