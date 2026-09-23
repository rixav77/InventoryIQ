import assert from 'node:assert/strict';
import {
  EVM_SKU_SEEDS,
  PROTOTYPE_AS_OF_DATE,
  calculateStaticMsl,
  generateDynamicMslRecommendation,
  generateSimulatedSalesHistory,
  getSimulatedLeadTimeSamples,
} from '../packages/core/src/index.js';

const normalMultiplier = 1;
const greatIndianFestivalMultiplier = 2.1;

const rows = EVM_SKU_SEEDS.map((seed) => {
  const staticResult = calculateStaticMsl({
    monthlySellingPlan: seed.monthlySellingPlan,
    procurementTimeDays: seed.procurementTimeDays,
    minimumOrderQuantity: seed.minimumOrderQuantity,
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
  });

  assert.equal(staticResult.minimumStockLevel, seed.observedMinimumStockLevel, seed.sku);
  assert.equal(staticResult.reorderLevel, seed.observedReorderLevel, seed.sku);
  assert.equal(staticResult.reorderQuantity, seed.observedReorderQuantity, seed.sku);
  assert.equal(staticResult.actionStatus, seed.observedActionStatus, seed.sku);

  const sharedInput = {
    sku: seed.sku,
    dailySales: generateSimulatedSalesHistory(seed),
    asOfDate: PROTOTYPE_AS_OF_DATE,
    leadTimeSamples: getSimulatedLeadTimeSamples(seed),
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
    minimumOrderQuantity: seed.minimumOrderQuantity,
    currentMinimumStockLevel: seed.observedMinimumStockLevel,
    provenance: seed.provenance,
  } as const;

  const normal = generateDynamicMslRecommendation({
    ...sharedInput,
    eventMultiplier: normalMultiplier,
  });
  const festival = generateDynamicMslRecommendation({
    ...sharedInput,
    eventMultiplier: greatIndianFestivalMultiplier,
  });

  return {
    sku: seed.sku,
    currentStock: seed.currentPhysicalStock,
    staticMsl: staticResult.minimumStockLevel,
    evmStatus: staticResult.actionStatus,
    drr7: Math.round(normal.drr.trailing7Days),
    drr14: Math.round(normal.drr.trailing14Days),
    drr30: Math.round(normal.drr.trailing30Days),
    dynamicDrr: Math.round(normal.drr.dynamicDrr),
    normalDynamicMsl: normal.recommendedMinimumStockLevel,
    gifDynamicDrr: Math.round(festival.drr.dynamicDrr),
    gifDynamicMsl: festival.recommendedMinimumStockLevel,
    gifMslUplift: festival.recommendedMinimumStockLevel - normal.recommendedMinimumStockLevel,
    safetyStock: Math.ceil(normal.safetyStock),
    normalFlag: normal.riskFlag,
    gifFlag: festival.riskFlag,
    rationale: festival.rationale,
  };
});

console.log('\nInventoryIQ CHUNK-1: Static vs Dynamic MSL');
console.log(`As of ${PROTOTYPE_AS_OF_DATE}; Great Indian Festival multiplier: ${greatIndianFestivalMultiplier}x\n`);
console.table(
  rows.map(({ rationale: _rationale, ...row }) => row),
);

console.log('\nGreat Indian Festival rationale');
for (const row of rows) {
  console.log(`- ${row.sku}: ${row.rationale} Flag: ${row.gifFlag}.`);
}

console.log(
  '\nData note: stock/MSP/PT/MOQ/PO/MSL values are observed from EVM Procura screenshots. ' +
    'The 90-day daily sales histories and actual lead-time samples are deterministic prototype simulations. ' +
    'CAPITAL_SURPLUS is unit-based because no evidenced procurement prices are available.',
);
console.log('\nCHUNK-1 verification completed successfully.');
