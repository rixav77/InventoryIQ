import assert from 'node:assert/strict';
import {
  EVM_SKU_SEEDS,
  PROTOTYPE_AS_OF_DATE,
  SIMULATED_POWER_BANK_TRANSFER,
  WAREHOUSE_DEMAND_SHARES,
  WAREHOUSE_STOCK_SEEDS,
  WORKING_CAPITAL_SEEDS,
  analyzeDeadStock,
  analyzeWarehouseSurplusDeficit,
  calculateDemandProfile,
  generateAgingScenarioHistory,
  generateSimulatedSalesHistory,
  generateTransferRecommendations,
  listWarehouses,
} from '../packages/core/src/index.js';
import type { SkuWarehouseDistribution } from '../packages/core/src/index.js';

const distributions: SkuWarehouseDistribution[] = WAREHOUSE_STOCK_SEEDS.map((seed) => {
  const evmSeed = EVM_SKU_SEEDS.find((entry) => entry.sku === seed.sku);
  assert.ok(evmSeed, `Missing EVM seed for ${seed.sku}`);
  const demandProfile = calculateDemandProfile(
    generateSimulatedSalesHistory(evmSeed),
    PROTOTYPE_AS_OF_DATE,
  );

  return {
    sku: seed.sku,
    minimumStockLevel: evmSeed.observedReorderLevel,
    demandDrr: demandProfile.drr30,
    demandShares: WAREHOUSE_DEMAND_SHARES,
    positions: [...seed.holdings],
  };
});

const excludeSkus = EVM_SKU_SEEDS.filter((seed) => {
  const assumptions = WORKING_CAPITAL_SEEDS.find((entry) => entry.sku === seed.sku);
  assert.ok(assumptions, `Missing working-capital assumptions for ${seed.sku}`);
  const aging = analyzeDeadStock({
    sku: seed.sku,
    sales: generateAgingScenarioHistory(assumptions.agingScenario),
    asOfDate: PROTOTYPE_AS_OF_DATE,
    currentStock: seed.currentPhysicalStock,
    averageProcurementPrice: assumptions.averageProcurementPrice,
    monthlyDepreciationRate: assumptions.monthlyDepreciationRate,
  });

  return aging.status !== 'ACTIVE';
}).map((seed) => seed.sku);

const recommendations = generateTransferRecommendations({
  distributions,
  excludeSkus,
  maxRecommendations: 5,
});

const warehouseRows = new Map<string, { warehouse: string; surplusUnits: number; deficitUnits: number }>();
for (const distribution of distributions) {
  if (excludeSkus.includes(distribution.sku)) {
    continue;
  }
  for (const position of analyzeWarehouseSurplusDeficit(distribution)) {
    const row = warehouseRows.get(position.warehouseCode) ?? {
      warehouse: position.warehouseCode,
      surplusUnits: 0,
      deficitUnits: 0,
    };
    row.surplusUnits += Math.round(position.surplusUnits);
    row.deficitUnits += Math.round(position.deficitUnits);
    warehouseRows.set(position.warehouseCode, row);
  }
}

const anchorDistribution: SkuWarehouseDistribution = {
  sku: SIMULATED_POWER_BANK_TRANSFER.sku,
  minimumStockLevel: SIMULATED_POWER_BANK_TRANSFER.minimumStockLevel,
  demandDrr: SIMULATED_POWER_BANK_TRANSFER.demandDrr,
  demandShares: { ...SIMULATED_POWER_BANK_TRANSFER.demandShares },
  positions: [...SIMULATED_POWER_BANK_TRANSFER.holdings],
};
const anchorPositions = analyzeWarehouseSurplusDeficit(anchorDistribution);
const anchorRecommendations = generateTransferRecommendations({
  distributions: [anchorDistribution],
  maxRecommendations: 5,
});

const totalSurplus = [...warehouseRows.values()].reduce((sum, row) => sum + row.surplusUnits, 0);
const totalDeficit = [...warehouseRows.values()].reduce((sum, row) => sum + row.deficitUnits, 0);
const totalTransferCost = recommendations.reduce((sum, rec) => sum + rec.estimatedCost, 0);

console.log('\nInventoryIQ CHUNK-4: Multi-Location Transfer Intelligence');
console.log(`As of ${PROTOTYPE_AS_OF_DATE}; 7 warehouses, Mumbai cluster + Delhi + Chennai\n`);

console.log('Warehouse registry');
console.table(
  listWarehouses().map(({ code, city, region, isEcommerce }) => ({
    code,
    city,
    region,
    ecommerce: isEcommerce,
  })),
);

console.log('\nAggregate surplus/deficit by warehouse (active SKUs only)');
console.table(
  [...warehouseRows.values()].sort((a, b) => b.surplusUnits - a.surplusUnits),
);

console.log(`\nExcluded as non-active (no transfers): ${excludeSkus.join(', ') || 'none'}`);

console.log('\nAnchor example: P0109-B Power Bank (Bhiwandi surplus vs Delhi deficit)');
console.table(
  anchorPositions.map((position) => ({
    warehouse: position.warehouseCode,
    available: position.availableStock,
    warehouseMsl: Math.round(position.warehouseMinimumStockLevel),
    surplus: Math.round(position.surplusUnits),
    deficit: Math.round(position.deficitUnits),
  })),
);
console.table(
  anchorRecommendations.map((rec) => ({
    from: rec.fromWarehouse,
    to: rec.toWarehouse,
    units: rec.quantity,
    transit: rec.transitSpeed,
    km: rec.distanceKm,
    cost: Math.round(rec.estimatedCost),
    risk: rec.risk,
  })),
);

console.log('\nTop transfer recommendations (portfolio)');
console.table(
  recommendations.map((rec) => ({
    sku: rec.sku,
    from: rec.fromWarehouse,
    to: rec.toWarehouse,
    units: rec.quantity,
    transit: rec.transitSpeed,
    km: rec.distanceKm,
    estCost: Math.round(rec.estimatedCost),
    risk: rec.risk,
  })),
);
if (recommendations[0] !== undefined) {
  console.log(`\nRationale (top): ${recommendations[0].reason}`);
}

console.log('\nPortfolio summary');
console.table([
  { metric: 'Total surplus units (active SKUs)', value: totalSurplus },
  { metric: 'Total deficit units (active SKUs)', value: totalDeficit },
  { metric: 'Transfer recommendations', value: recommendations.length },
  { metric: 'Estimated total transfer cost', value: Math.round(totalTransferCost) },
]);

console.log(
  '\nData note: warehouse registry, proximity distances, and the P0109-B and EVM-25/128GB anchors are ' +
    'observed from the CHUNK-4 spec and EVM screenshots. Per-warehouse splits (except pinned anchors), ' +
    'allocated stock, demand shares, and transfer cost rates are deterministic prototype simulations. ' +
    'Transfers are recommendations only; no write-back to the WMS.',
);
console.log('\nCHUNK-4 verification completed successfully.');
