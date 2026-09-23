import assert from 'node:assert/strict';
import {
  EVM_SKU_SEEDS,
  PROTOTYPE_AS_OF_DATE,
  SIMULATED_MOQ_TRAP,
  WORKING_CAPITAL_SEEDS,
  analyzeDeadStock,
  analyzeMoqTrap,
  calculateCapitalRisk,
  calculateDemandProfile,
  calculateDrrStability,
  calculateInventoryHealthScore,
  calculatePoPipelineAdequacy,
  calculateStockMslAlignment,
  detectSurplusStock,
  generateAgingScenarioHistory,
  generateSimulatedSalesHistory,
} from '../packages/core/src/index.js';

const rows = EVM_SKU_SEEDS.map((seed) => {
  const assumptions = WORKING_CAPITAL_SEEDS.find(({ sku }) => sku === seed.sku);
  assert.ok(assumptions, `Missing working-capital assumptions for ${seed.sku}`);
  const demandProfile = calculateDemandProfile(
    generateSimulatedSalesHistory(seed),
    PROTOTYPE_AS_OF_DATE,
  );
  const surplus = detectSurplusStock({
    sku: seed.sku,
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
    reorderLevel: seed.observedReorderLevel,
    drr30: demandProfile.drr30,
  });
  const expectedHoldDays = surplus.surplusDays ?? 365;
  const capital = calculateCapitalRisk({
    surplusUnits: surplus.surplusUnits,
    averageProcurementPrice: assumptions.averageProcurementPrice,
    annualCostOfCapitalRate: assumptions.annualCostOfCapitalRate,
    expectedHoldDays,
  });
  const aging = analyzeDeadStock({
    sku: seed.sku,
    sales: generateAgingScenarioHistory(assumptions.agingScenario),
    asOfDate: PROTOTYPE_AS_OF_DATE,
    currentStock: seed.currentPhysicalStock,
    averageProcurementPrice: assumptions.averageProcurementPrice,
    monthlyDepreciationRate: assumptions.monthlyDepreciationRate,
  });
  const moq = analyzeMoqTrap({
    sku: seed.sku,
    minimumOrderQuantity: seed.minimumOrderQuantity,
    minimumStockLevel: seed.observedMinimumStockLevel,
    averageDailyDemand: demandProfile.drr30,
    averageProcurementPrice: assumptions.averageProcurementPrice,
  });
  const health = calculateInventoryHealthScore({
    drrStability: calculateDrrStability(demandProfile.demandCoefficientOfVariation),
    stockMslAlignment: calculateStockMslAlignment(
      seed.currentPhysicalStock,
      seed.observedMinimumStockLevel,
    ),
    poPipelineAdequacy: calculatePoPipelineAdequacy(
      seed.currentPhysicalStock,
      seed.openPurchaseOrders,
      seed.inTransitStock,
      seed.observedReorderLevel,
    ),
    capitalEfficiency: assumptions.capitalEfficiencyScore,
    vendorReliability: assumptions.vendorReliabilityScore,
  });

  return {
    sku: seed.sku,
    stock: seed.currentPhysicalStock,
    openPo: seed.openPurchaseOrders,
    reorderLevel: seed.observedReorderLevel,
    netPosition: surplus.netStockPosition,
    surplusUnits: surplus.surplusUnits,
    drr30: Math.round(demandProfile.drr30),
    surplusDays: surplus.surplusDays === null ? 'N/A' : surplus.surplusDays.toFixed(1),
    alert: surplus.alertLevel,
    simulatedProcurementPrice: assumptions.averageProcurementPrice,
    capitalLocked: Math.round(capital.capitalLocked),
    holdingCost: Math.round(capital.expectedHoldingCost),
    movement: aging.status,
    moqTrap: moq.isMoqTrap,
    moqCapitalTrapped: Math.round(moq.capitalTrapped),
    healthScore: health.score.toFixed(1),
    healthBand: health.band,
    deadStockValue: aging.status === 'DEAD_STOCK' ? aging.inventoryValue : 0,
  };
});

const simulatedMoq = analyzeMoqTrap(SIMULATED_MOQ_TRAP);
const capitalByAlert = new Map<string, number>();
for (const row of rows) {
  capitalByAlert.set(row.alert, (capitalByAlert.get(row.alert) ?? 0) + row.capitalLocked);
}
const totalCapitalLocked = rows.reduce((sum, row) => sum + row.capitalLocked, 0);
const deadStockValue = rows.reduce((sum, row) => sum + row.deadStockValue, 0);
const observedMoqTrapped = rows.reduce((sum, row) => sum + row.moqCapitalTrapped, 0);

console.log('\nInventoryIQ CHUNK-3: Working Capital Intelligence');
console.log(`As of ${PROTOTYPE_AS_OF_DATE}; static EVM reorder-level basis\n`);
console.table(rows.map(({ deadStockValue: _deadStockValue, ...row }) => row));

console.log('\nPrototype portfolio summary');
console.table([
  { metric: 'Total capital locked above static ROL', value: Math.round(totalCapitalLocked) },
  { metric: 'WATCH capital', value: Math.round(capitalByAlert.get('WATCH') ?? 0) },
  { metric: 'WARNING capital', value: Math.round(capitalByAlert.get('WARNING') ?? 0) },
  { metric: 'CRITICAL capital', value: Math.round(capitalByAlert.get('CRITICAL') ?? 0) },
  { metric: 'Potential sales-based dead-stock value', value: Math.round(deadStockValue) },
  { metric: 'Observed-row MOQ trapped capital', value: Math.round(observedMoqTrapped) },
]);
console.log(
  `\nSimulated MOQ example: MSL ${SIMULATED_MOQ_TRAP.minimumStockLevel}, MOQ ${SIMULATED_MOQ_TRAP.minimumOrderQuantity}, ` +
    `${simulatedMoq.monthsOfCover?.toFixed(1)} months cover, ₹${Math.round(simulatedMoq.capitalTrapped)} trapped.`,
);
console.log(
  '\nData note: SKU identity, stock, MSL, MOQ, open PO, and reorder level are observed from EVM screenshots. ' +
    'Demand, aging scenarios, procurement prices, finance assumptions, capital efficiency, and vendor reliability are deterministic prototype simulations. ' +
    'Capital values are estimates, not accounting records; movement status uses sales activity only.',
);
console.log('\nCHUNK-3 verification completed successfully.');
