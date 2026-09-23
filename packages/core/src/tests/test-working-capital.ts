import assert from 'node:assert/strict';
import {
  EVM_SKU_SEEDS,
  PROTOTYPE_AS_OF_DATE,
  SIMULATED_MOQ_TRAP,
  WORKING_CAPITAL_SEEDS,
  analyzeDeadStock,
  analyzeMoqTrap,
  calculateCapitalLocked,
  calculateCapitalRisk,
  calculateDrrStability,
  calculateHoldingCost,
  calculateInventoryHealthScore,
  calculateMslCapitalImpact,
  calculatePoPipelineAdequacy,
  calculateStaticMsl,
  calculateStockMslAlignment,
  classifyInventoryHealthScore,
  classifyStockMovement,
  classifySurplusAlert,
  detectSurplusStock,
  generateAgingScenarioHistory,
} from '../index.js';
import type { DailySalesPoint } from '../index.js';

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function test(name: string, run: () => void): void {
  run();
  console.log(`PASS ${name}`);
}

function point(daysAgo: number, unitsSold: number): DailySalesPoint {
  const date = new Date(`${PROTOTYPE_AS_OF_DATE}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return { date: date.toISOString().slice(0, 10), unitsSold };
}

test('surplus detector preserves signed position and clamps deficits', () => {
  const deficit = detectSurplusStock({
    sku: 'DEFICIT', currentStock: 80, openPurchaseOrders: 0, inTransitStock: 0,
    reorderLevel: 100, drr30: 10,
  });
  assert.equal(deficit.netStockPosition, -20);
  assert.equal(deficit.surplusUnits, 0);
  assert.equal(deficit.surplusDays, 0);
  assert.equal(deficit.alertLevel, 'HEALTHY');
});

test('surplus alert boundaries cover 30, 60, and 90 days', () => {
  assert.equal(classifySurplusAlert(29.999, 1), 'HEALTHY');
  assert.equal(classifySurplusAlert(30, 1), 'WATCH');
  assert.equal(classifySurplusAlert(59.999, 1), 'WATCH');
  assert.equal(classifySurplusAlert(60, 1), 'WARNING');
  assert.equal(classifySurplusAlert(90, 1), 'WARNING');
  assert.equal(classifySurplusAlert(90.001, 1), 'CRITICAL');
  assert.equal(classifySurplusAlert(null, 1), 'CRITICAL');
  assert.equal(classifySurplusAlert(null, 0), 'HEALTHY');
});

test('zero DRR surplus is critical without exposing Infinity', () => {
  const result = detectSurplusStock({
    sku: 'ZERO-DRR', currentStock: 200, openPurchaseOrders: 0, inTransitStock: 0,
    reorderLevel: 100, drr30: 0,
  });
  assert.equal(result.surplusDays, null);
  assert.equal(result.alertLevel, 'CRITICAL');
});

test('capital locked and holding cost follow exact formulas', () => {
  assert.equal(calculateCapitalLocked(1_000, 150), 150_000);
  assertClose(calculateHoldingCost(150_000, 0.12, 30), 150_000 * 0.12 * 30 / 365);
  const result = calculateCapitalRisk({
    surplusUnits: 1_000, averageProcurementPrice: 150,
    annualCostOfCapitalRate: 0.12, expectedHoldDays: 30,
  });
  assert.equal(result.capitalLocked, 150_000);
  assertClose(result.expectedHoldingCost, 150_000 * 0.12 * 30 / 365);
});

test('MSL capital impact separates increases from releasable value', () => {
  const increase = calculateMslCapitalImpact({
    currentMinimumStockLevel: 25_000, recommendedMinimumStockLevel: 38_000,
    averageProcurementPrice: 150, annualCostOfCapitalRate: 0.12, expectedHoldDays: 30,
  });
  assert.equal(increase.deltaUnits, 13_000);
  assert.equal(increase.additionalInventoryValue, 1_950_000);
  assert.equal(increase.releasableInventoryValue, 0);
  const decrease = calculateMslCapitalImpact({
    currentMinimumStockLevel: 38_000, recommendedMinimumStockLevel: 25_000,
    averageProcurementPrice: 150, annualCostOfCapitalRate: 0.12, expectedHoldDays: 30,
  });
  assert.equal(decrease.additionalInventoryValue, 0);
  assert.equal(decrease.releasableInventoryValue, 1_950_000);
});

test('capital rate validation rejects percentage-style and invalid values', () => {
  assert.throws(() => calculateHoldingCost(100, 12, 30), /between 0 and 1/);
  assert.throws(() => calculateCapitalLocked(Number.NaN, 1), /surplusUnits/);
});

test('stock movement detects active, slow, stagnant, and dead windows', () => {
  assert.equal(classifyStockMovement(1, 1, 1), 'ACTIVE');
  assert.equal(classifyStockMovement(0, 1, 1), 'SLOW_MOVING');
  assert.equal(classifyStockMovement(0, 0, 1), 'STAGNANT');
  assert.equal(classifyStockMovement(0, 0, 0), 'DEAD_STOCK');
  assert.throws(() => classifyStockMovement(2, 1, 2), /cumulative/);
});

test('dead-stock analysis keeps calendar semantics and depreciation', () => {
  const sales = [point(45, 5), point(45, 5), point(-1, 99)];
  const result = analyzeDeadStock({
    sku: 'AGING', sales, asOfDate: PROTOTYPE_AS_OF_DATE,
    currentStock: 100, averageProcurementPrice: 200, monthlyDepreciationRate: 0.02,
  });
  assert.equal(result.status, 'SLOW_MOVING');
  assert.equal(result.unitsSold30Days, 0);
  assert.equal(result.unitsSold60Days, 10);
  assert.equal(result.unitsSold90Days, 10);
  assert.equal(result.inventoryValue, 20_000);
  assert.equal(result.estimatedMonthlyDepreciation, 400);
  assert.equal(result.basis, 'SALES_ACTIVITY_ONLY');
});

test('MOQ analyzer handles below, equal, above, and zero-demand cases', () => {
  assert.equal(analyzeMoqTrap({
    sku: 'LOW', minimumOrderQuantity: 100, minimumStockLevel: 200,
    averageDailyDemand: 10, averageProcurementPrice: 5,
  }).isMoqTrap, false);
  assert.equal(analyzeMoqTrap({
    sku: 'EQUAL', minimumOrderQuantity: 200, minimumStockLevel: 200,
    averageDailyDemand: 10, averageProcurementPrice: 5,
  }).isMoqTrap, false);
  const trap = analyzeMoqTrap({
    sku: 'TRAP', minimumOrderQuantity: 1_000, minimumStockLevel: 400,
    averageDailyDemand: 1000 / 180, averageProcurementPrice: 150,
  });
  assert.equal(trap.overshootUnits, 600);
  assert.equal(trap.capitalTrapped, 90_000);
  assertClose(trap.daysOfCover ?? 0, 180);
  assertClose(trap.monthsOfCover ?? 0, 6);
  const noDemand = analyzeMoqTrap({
    sku: 'NO-DEMAND', minimumOrderQuantity: 1_000, minimumStockLevel: 400,
    averageDailyDemand: 0, averageProcurementPrice: 150,
  });
  assert.equal(noDemand.daysOfCover, null);
  assert.equal(noDemand.monthsOfCover, null);
});

test('health helpers normalize DRR stability, alignment, and pipeline', () => {
  assert.equal(calculateDrrStability(0.2), 0.8);
  assert.equal(calculateDrrStability(2), 0);
  assert.equal(calculateDrrStability(null), 0);
  assert.equal(calculateStockMslAlignment(100, 100), 1);
  assert.equal(calculateStockMslAlignment(200, 100), 0);
  assert.equal(calculatePoPipelineAdequacy(80, 20, 0, 100), 1);
  assert.equal(calculatePoPipelineAdequacy(80, 19, 0, 100), 0);
});

test('health score follows documented weights and score bands', () => {
  const result = calculateInventoryHealthScore({
    drrStability: 1, stockMslAlignment: 1, poPipelineAdequacy: 1,
    capitalEfficiency: 1, vendorReliability: 1,
  });
  assert.equal(result.score, 100);
  assert.equal(result.band, 'HEALTHY');
  assert.equal(classifyInventoryHealthScore(80), 'HEALTHY');
  assert.equal(classifyInventoryHealthScore(60), 'NEEDS_ATTENTION');
  assert.equal(classifyInventoryHealthScore(40), 'AT_RISK');
  assert.equal(classifyInventoryHealthScore(39.999), 'CRITICAL');
});

test('all observed rows still reconcile with EVM static formulas', () => {
  for (const seed of EVM_SKU_SEEDS) {
    const result = calculateStaticMsl({
      monthlySellingPlan: seed.monthlySellingPlan,
      procurementTimeDays: seed.procurementTimeDays,
      minimumOrderQuantity: seed.minimumOrderQuantity,
      currentStock: seed.currentPhysicalStock,
      openPurchaseOrders: seed.openPurchaseOrders,
      inTransitStock: seed.inTransitStock,
    });
    assert.equal(result.reorderQuantity, seed.observedReorderQuantity, seed.sku);
  }
});

test('working-capital assumptions and MOQ example remain simulated', () => {
  assert.equal(WORKING_CAPITAL_SEEDS.length, EVM_SKU_SEEDS.length);
  assert.ok(WORKING_CAPITAL_SEEDS.every(({ provenance }) =>
    provenance.skuIdentity === 'observed' &&
    provenance.inventoryPlanning === 'observed' &&
    provenance.procurementPrice === 'simulated' &&
    provenance.financeAssumptions === 'simulated',
  ));
  assert.equal(SIMULATED_MOQ_TRAP.provenance, 'simulated');
  assert.equal(generateAgingScenarioHistory('DEAD_STOCK').length, 0);
});

console.log(`\nCHUNK-3 working capital verification passed (${WORKING_CAPITAL_SEEDS.length} observed SKU identities).`);
