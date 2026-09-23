import assert from 'node:assert/strict';
import {
  EVM_SKU_SEEDS,
  PROTOTYPE_AS_OF_DATE,
  generateSimulatedSalesHistory,
  getSimulatedLeadTimeSamples,
} from '../data/seed-skus.js';
import {
  DEFAULT_DRR_WEIGHTS,
  calculateDynamicMinimumStockLevel,
  calculateRollingDrr,
  calculateSafetyStock,
  calculateStaticMsl,
  classifyInventoryRisk,
  generateDynamicMslRecommendation,
} from '../msl-engine.js';
import type { DailySalesPoint } from '../msl-engine.js';

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function dateDaysAgo(daysAgo: number): string {
  const date = new Date(`${PROTOTYPE_AS_OF_DATE}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function historyFromDailyValues(valuesOldestToNewest: readonly number[]): DailySalesPoint[] {
  return valuesOldestToNewest.map((unitsSold, index) => ({
    date: dateDaysAgo(valuesOldestToNewest.length - 1 - index),
    unitsSold,
  }));
}

function test(name: string, run: () => void): void {
  run();
  console.log(`PASS ${name}`);
}

const constantHistory = historyFromDailyValues(Array<number>(90).fill(10));

test('constant history produces equal 7d, 14d, and 30d DRR', () => {
  const result = calculateRollingDrr(constantHistory, { asOfDate: PROTOTYPE_AS_OF_DATE });
  assert.equal(result.trailing7Days, 10);
  assert.equal(result.trailing14Days, 10);
  assert.equal(result.trailing30Days, 10);
  assert.equal(result.weightedBaseDrr, 10);
  assert.equal(result.dynamicDrr, 10);
});

test('recent demand receives the specified 7d, 14d, and 30d decay weights', () => {
  const history = historyFromDailyValues([
    ...Array<number>(60).fill(0),
    ...Array<number>(16).fill(10),
    ...Array<number>(7).fill(10),
    ...Array<number>(7).fill(20),
  ]);
  const result = calculateRollingDrr(history, { asOfDate: PROTOTYPE_AS_OF_DATE });
  assert.equal(result.trailing7Days, 20);
  assert.equal(result.trailing14Days, 15);
  assertClose(result.trailing30Days, 370 / 30);
  assertClose(result.weightedBaseDrr, 0.5 * 20 + 0.3 * 15 + 0.2 * (370 / 30));
});

test('missing dates are zero-filled and duplicate dates are aggregated', () => {
  const history: DailySalesPoint[] = [
    { date: PROTOTYPE_AS_OF_DATE, unitsSold: 7 },
    { date: PROTOTYPE_AS_OF_DATE, unitsSold: 7 },
    { date: dateDaysAgo(1), unitsSold: 14 },
    { date: '2026-09-23', unitsSold: 9_999 },
  ];
  const result = calculateRollingDrr(history, { asOfDate: PROTOTYPE_AS_OF_DATE });
  assert.equal(result.trailing7Days, 4);
});

test('event overlays support normal, BBDD, and GIF multipliers', () => {
  const normal = calculateRollingDrr(constantHistory, {
    asOfDate: PROTOTYPE_AS_OF_DATE,
    eventMultiplier: 1,
  });
  const bbdd = calculateRollingDrr(constantHistory, {
    asOfDate: PROTOTYPE_AS_OF_DATE,
    eventMultiplier: 1.8,
  });
  const gif = calculateRollingDrr(constantHistory, {
    asOfDate: PROTOTYPE_AS_OF_DATE,
    eventMultiplier: 2.1,
  });
  assert.equal(normal.dynamicDrr, 10);
  assert.equal(bbdd.dynamicDrr, 18);
  assert.equal(gif.dynamicDrr, 21);
});

test('invalid event multipliers and DRR weights are rejected', () => {
  assert.throws(
    () =>
      calculateRollingDrr(constantHistory, {
        asOfDate: PROTOTYPE_AS_OF_DATE,
        eventMultiplier: 0,
      }),
    /eventMultiplier/,
  );
  assert.throws(
    () =>
      calculateRollingDrr(constantHistory, {
        asOfDate: PROTOTYPE_AS_OF_DATE,
        weights: { trailing7Days: 0.5, trailing14Days: 0.3, trailing30Days: 0.3 },
      }),
    /sum to 1/,
  );
  assert.deepEqual(DEFAULT_DRR_WEIGHTS, {
    trailing7Days: 0.5,
    trailing14Days: 0.3,
    trailing30Days: 0.2,
  });
});

test('safety stock follows the combined demand and lead-time variability formula', () => {
  const result = calculateSafetyStock({
    serviceLevelZ: 1.65,
    actualAverageLeadTimeDays: 30,
    demandStandardDeviation: 4,
    averageDailyRunRate: 10,
    leadTimeStandardDeviationDays: 2,
  });
  assertClose(result, 1.65 * Math.sqrt(30 * 4 ** 2 + 10 ** 2 * 2 ** 2));
  assert.equal(
    calculateSafetyStock({
      serviceLevelZ: 1.65,
      actualAverageLeadTimeDays: 30,
      demandStandardDeviation: 0,
      averageDailyRunRate: 10,
      leadTimeStandardDeviationDays: 0,
    }),
    0,
  );
});

test('dynamic MSL rounds final required units upward', () => {
  assert.equal(calculateDynamicMinimumStockLevel(10.1, 30, 5.2), 309);
  assert.equal(calculateDynamicMinimumStockLevel(10, 0, 5.2), 6);
});

test('all observed seed rows reconcile with EVM static formulas', () => {
  for (const seed of EVM_SKU_SEEDS) {
    const result = calculateStaticMsl({
      monthlySellingPlan: seed.monthlySellingPlan,
      procurementTimeDays: seed.procurementTimeDays,
      minimumOrderQuantity: seed.minimumOrderQuantity,
      currentStock: seed.currentPhysicalStock,
      openPurchaseOrders: seed.openPurchaseOrders,
      inTransitStock: seed.inTransitStock,
    });
    assert.equal(result.minimumStockLevel, seed.observedMinimumStockLevel, seed.sku);
    assert.equal(result.reorderLevel, seed.observedReorderLevel, seed.sku);
    assert.equal(result.reorderQuantity, seed.observedReorderQuantity, seed.sku);
    assert.equal(result.actionStatus, seed.observedActionStatus, seed.sku);
  }
});

test('inventory risk distinguishes deficits, balanced positions, and surplus units', () => {
  assert.equal(classifyInventoryRisk(-1, 10), 'STOCKOUT_RISK');
  assert.equal(classifyInventoryRisk(100, 10), 'BALANCED');
  assert.equal(classifyInventoryRisk(301, 10), 'CAPITAL_SURPLUS');
});

test('recommendations are deterministic and preserve provenance', () => {
  const seed = EVM_SKU_SEEDS[2];
  assert.ok(seed);
  const input = {
    sku: seed.sku,
    dailySales: generateSimulatedSalesHistory(seed),
    asOfDate: PROTOTYPE_AS_OF_DATE,
    eventMultiplier: 2.1,
    leadTimeSamples: getSimulatedLeadTimeSamples(seed),
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
    minimumOrderQuantity: seed.minimumOrderQuantity,
    currentMinimumStockLevel: seed.observedMinimumStockLevel,
    provenance: seed.provenance,
  } as const;
  const first = generateDynamicMslRecommendation(input);
  const second = generateDynamicMslRecommendation(input);
  assert.deepEqual(first, second);
  assert.equal(first.sku, seed.sku);
  assert.equal(first.provenance.salesHistory, 'simulated');
  assert.match(first.rationale, /2\.1x event multiplier/);
});

test('invalid numeric values, dates, and empty histories are rejected', () => {
  assert.throws(
    () => calculateDynamicMinimumStockLevel(Number.NaN, 30, 0),
    /dynamicDailyRunRate/,
  );
  assert.throws(
    () => calculateRollingDrr([], { asOfDate: PROTOTYPE_AS_OF_DATE }),
    /At least one/,
  );
  assert.throws(
    () => calculateRollingDrr(constantHistory, { asOfDate: '2026-02-30' }),
    /Invalid ISO/,
  );
});

console.log(`\nCHUNK-1 mathematical verification passed (${EVM_SKU_SEEDS.length} observed SKU rows).`);
