import type { DailySalesPoint, EvmActionStatus } from '../engine/types.js';

export const PROTOTYPE_AS_OF_DATE = '2026-09-22';

export interface EvmSkuSeed {
  sku: string;
  brand: 'EVM';
  masterCategory: 'IT PERIPHERALS';
  category: 'EVM SSD';
  subcategory: 'EVM SSD 2.5" SATA3' | 'EVM SSD M.2 (2280)';
  currentPhysicalStock: number;
  monthlySellingPlan: number;
  procurementTimeDays: number;
  minimumOrderQuantity: number;
  evmSafetyStock: 0;
  openPurchaseOrders: number;
  inTransitStock: number;
  observedMinimumStockLevel: number;
  observedReorderLevel: number;
  observedReorderQuantity: number;
  observedActionStatus: EvmActionStatus;
  simulationProfile: {
    baselineFactor: number;
    recentFactor: number;
    phase: number;
    leadTimeSamples: readonly number[];
  };
  provenance: {
    planningFields: 'observed';
    salesHistory: 'simulated';
    leadTimeHistory: 'simulated';
    source: 'meeting_images/msl_planning_scheme.png';
  };
}

const shared = {
  brand: 'EVM',
  masterCategory: 'IT PERIPHERALS',
  category: 'EVM SSD',
  evmSafetyStock: 0,
  provenance: {
    planningFields: 'observed',
    salesHistory: 'simulated',
    leadTimeHistory: 'simulated',
    source: 'meeting_images/msl_planning_scheme.png',
  },
} as const;

export const EVM_SKU_SEEDS: readonly EvmSkuSeed[] = [
  {
    ...shared,
    sku: 'EVM-25/128GB',
    subcategory: 'EVM SSD 2.5" SATA3',
    currentPhysicalStock: 73_586,
    monthlySellingPlan: 75_000,
    procurementTimeDays: 30,
    minimumOrderQuantity: 1,
    openPurchaseOrders: 0,
    inTransitStock: 0,
    observedMinimumStockLevel: 75_000,
    observedReorderLevel: 75_000,
    observedReorderQuantity: -1_414,
    observedActionStatus: 'REORDER NOW',
    simulationProfile: {
      baselineFactor: 0.76,
      recentFactor: 1.22,
      phase: 1,
      leadTimeSamples: [29, 31, 34, 30, 36, 32],
    },
  },
  {
    ...shared,
    sku: 'EVM-25/256GB',
    subcategory: 'EVM SSD 2.5" SATA3',
    currentPhysicalStock: 164_347,
    monthlySellingPlan: 100_000,
    procurementTimeDays: 30,
    minimumOrderQuantity: 0,
    openPurchaseOrders: 67_500,
    inTransitStock: 0,
    observedMinimumStockLevel: 100_000,
    observedReorderLevel: 100_000,
    observedReorderQuantity: 131_847,
    observedActionStatus: 'OK',
    simulationProfile: {
      baselineFactor: 0.84,
      recentFactor: 1.30,
      phase: 2,
      leadTimeSamples: [32, 35, 31, 39, 34, 37],
    },
  },
  {
    ...shared,
    sku: 'EVM-25/512GB',
    subcategory: 'EVM SSD 2.5" SATA3',
    currentPhysicalStock: 31_207,
    monthlySellingPlan: 25_000,
    procurementTimeDays: 30,
    minimumOrderQuantity: 1,
    openPurchaseOrders: 0,
    inTransitStock: 0,
    observedMinimumStockLevel: 25_000,
    observedReorderLevel: 25_000,
    observedReorderQuantity: 6_207,
    observedActionStatus: 'OK',
    simulationProfile: {
      baselineFactor: 0.92,
      recentFactor: 1.48,
      phase: 3,
      leadTimeSamples: [28, 33, 36, 31, 40, 35],
    },
  },
  {
    ...shared,
    sku: 'EVM-25/1TB',
    subcategory: 'EVM SSD 2.5" SATA3',
    currentPhysicalStock: 10_704,
    monthlySellingPlan: 6_000,
    procurementTimeDays: 30,
    minimumOrderQuantity: 0,
    openPurchaseOrders: 0,
    inTransitStock: 0,
    observedMinimumStockLevel: 6_000,
    observedReorderLevel: 6_000,
    observedReorderQuantity: 4_704,
    observedActionStatus: 'OK',
    simulationProfile: {
      baselineFactor: 0.88,
      recentFactor: 1.15,
      phase: 4,
      leadTimeSamples: [30, 29, 33, 34, 32, 36],
    },
  },
  {
    ...shared,
    sku: 'EVM-25/2TB',
    subcategory: 'EVM SSD 2.5" SATA3',
    currentPhysicalStock: 502,
    monthlySellingPlan: 500,
    procurementTimeDays: 30,
    minimumOrderQuantity: 0,
    openPurchaseOrders: 0,
    inTransitStock: 0,
    observedMinimumStockLevel: 500,
    observedReorderLevel: 500,
    observedReorderQuantity: 2,
    observedActionStatus: 'OK',
    simulationProfile: {
      baselineFactor: 0.96,
      recentFactor: 1.35,
      phase: 5,
      leadTimeSamples: [35, 38, 32, 41, 36, 39],
    },
  },
  {
    ...shared,
    sku: 'EVM-25/4TB',
    subcategory: 'EVM SSD 2.5" SATA3',
    currentPhysicalStock: 5,
    monthlySellingPlan: 25,
    procurementTimeDays: 30,
    minimumOrderQuantity: 0,
    openPurchaseOrders: 54,
    inTransitStock: 0,
    observedMinimumStockLevel: 25,
    observedReorderLevel: 25,
    observedReorderQuantity: 34,
    observedActionStatus: 'OK',
    simulationProfile: {
      baselineFactor: 0.72,
      recentFactor: 0.82,
      phase: 6,
      leadTimeSamples: [39, 44, 36, 42, 47, 40],
    },
  },
  {
    ...shared,
    sku: 'EVM-M2/128GB',
    subcategory: 'EVM SSD M.2 (2280)',
    currentPhysicalStock: 8_203,
    monthlySellingPlan: 3_000,
    procurementTimeDays: 30,
    minimumOrderQuantity: 0,
    openPurchaseOrders: 0,
    inTransitStock: 0,
    observedMinimumStockLevel: 3_000,
    observedReorderLevel: 3_000,
    observedReorderQuantity: 5_203,
    observedActionStatus: 'OK',
    simulationProfile: {
      baselineFactor: 0.78,
      recentFactor: 1.26,
      phase: 7,
      leadTimeSamples: [31, 34, 30, 37, 35, 33],
    },
  },
  {
    ...shared,
    sku: 'EVM-M2/256GB',
    subcategory: 'EVM SSD M.2 (2280)',
    currentPhysicalStock: 19_753,
    monthlySellingPlan: 5_000,
    procurementTimeDays: 30,
    minimumOrderQuantity: 0,
    openPurchaseOrders: 0,
    inTransitStock: 0,
    observedMinimumStockLevel: 5_000,
    observedReorderLevel: 5_000,
    observedReorderQuantity: 14_753,
    observedActionStatus: 'OK',
    simulationProfile: {
      baselineFactor: 0.86,
      recentFactor: 1.40,
      phase: 8,
      leadTimeSamples: [30, 36, 33, 38, 34, 41],
    },
  },
] as const;

function parseUtcDate(date: string): Date {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid ISO calendar date: ${date}`);
  }
  return parsed;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generateSimulatedSalesHistory(
  seed: EvmSkuSeed,
  asOfDate = PROTOTYPE_AS_OF_DATE,
  days = 90,
): DailySalesPoint[] {
  if (!Number.isInteger(days) || days < 30) {
    throw new Error('Simulated sales history must contain at least 30 calendar days.');
  }

  const end = parseUtcDate(asOfDate);
  const plannedDailyDemand = seed.monthlySellingPlan / 30;
  const baseline = plannedDailyDemand * seed.simulationProfile.baselineFactor;

  return Array.from({ length: days }, (_, index) => {
    const daysAgo = days - 1 - index;
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - daysAgo);
    const recentFactor = daysAgo < 14 ? seed.simulationProfile.recentFactor : 1;
    const weeklyVariation = 1 + 0.12 * Math.sin((index + seed.simulationProfile.phase) * 1.7);
    const unitsSold = Math.max(0, Math.round(baseline * recentFactor * weeklyVariation));

    return { date: toIsoDate(date), unitsSold };
  });
}

export function getSimulatedLeadTimeSamples(seed: EvmSkuSeed): readonly number[] {
  return seed.simulationProfile.leadTimeSamples;
}
