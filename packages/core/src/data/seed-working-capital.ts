import type { DailySalesPoint } from '../engine/types.js';
import { EVM_SKU_SEEDS, PROTOTYPE_AS_OF_DATE } from './seed-skus.js';

export type AgingScenario = 'ACTIVE' | 'SLOW_MOVING' | 'STAGNANT' | 'DEAD_STOCK';

export interface WorkingCapitalSeed {
  sku: string;
  averageProcurementPrice: number;
  annualCostOfCapitalRate: number;
  monthlyDepreciationRate: number;
  capitalEfficiencyScore: number;
  vendorReliabilityScore: number;
  agingScenario: AgingScenario;
  provenance: {
    skuIdentity: 'observed';
    inventoryPlanning: 'observed';
    demandHistory: 'simulated';
    procurementPrice: 'simulated';
    financeAssumptions: 'simulated';
    healthComponents: 'simulated';
  };
}

const scenarioOrder: readonly AgingScenario[] = [
  'ACTIVE',
  'ACTIVE',
  'ACTIVE',
  'SLOW_MOVING',
  'STAGNANT',
  'DEAD_STOCK',
  'SLOW_MOVING',
  'ACTIVE',
];

export const WORKING_CAPITAL_SEEDS: readonly WorkingCapitalSeed[] = EVM_SKU_SEEDS.map(
  (seed, index) => ({
    sku: seed.sku,
    averageProcurementPrice: 110 + index * 20,
    annualCostOfCapitalRate: 0.12,
    monthlyDepreciationRate: 0.02,
    capitalEfficiencyScore: Math.max(0.35, 0.82 - index * 0.05),
    vendorReliabilityScore: Math.max(0.55, 0.9 - index * 0.04),
    agingScenario: scenarioOrder[index] ?? 'ACTIVE',
    provenance: {
      skuIdentity: 'observed',
      inventoryPlanning: 'observed',
      demandHistory: 'simulated',
      procurementPrice: 'simulated',
      financeAssumptions: 'simulated',
      healthComponents: 'simulated',
    },
  }),
);

function dateDaysAgo(daysAgo: number): string {
  const date = new Date(`${PROTOTYPE_AS_OF_DATE}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function generateAgingScenarioHistory(
  scenario: AgingScenario,
): DailySalesPoint[] {
  if (scenario === 'ACTIVE') {
    return [{ date: dateDaysAgo(5), unitsSold: 10 }];
  }
  if (scenario === 'SLOW_MOVING') {
    return [{ date: dateDaysAgo(45), unitsSold: 10 }];
  }
  if (scenario === 'STAGNANT') {
    return [{ date: dateDaysAgo(75), unitsSold: 10 }];
  }
  return [];
}

export const SIMULATED_MOQ_TRAP = {
  sku: 'SIMULATED-MOQ-TRAP',
  minimumStockLevel: 400,
  minimumOrderQuantity: 1_000,
  averageDailyDemand: 1000 / 180,
  averageProcurementPrice: 150,
  provenance: 'simulated',
} as const;
