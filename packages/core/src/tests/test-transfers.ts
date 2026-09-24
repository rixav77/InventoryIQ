import assert from 'node:assert/strict';
import {
  EVM_SKU_SEEDS,
  SIMULATED_POWER_BANK_TRANSFER,
  WAREHOUSE_STOCK_SEEDS,
  analyzeWarehouseSurplusDeficit,
  calculateTransferCost,
  classifyTransferSpeed,
  generateTransferRecommendations,
  getProximity,
  getWarehouse,
} from '../index.js';
import type { SkuWarehouseDistribution } from '../index.js';

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function test(name: string, run: () => void): void {
  run();
  console.log(`PASS ${name}`);
}

function anchorDistribution(): SkuWarehouseDistribution {
  return {
    sku: SIMULATED_POWER_BANK_TRANSFER.sku,
    minimumStockLevel: SIMULATED_POWER_BANK_TRANSFER.minimumStockLevel,
    demandDrr: SIMULATED_POWER_BANK_TRANSFER.demandDrr,
    demandShares: { ...SIMULATED_POWER_BANK_TRANSFER.demandShares },
    positions: [...SIMULATED_POWER_BANK_TRANSFER.holdings],
  };
}

test('proximity is symmetric and matches the spec distances', () => {
  assert.equal(getProximity('VASAI', 'BHIWANDI').distanceKm, 40);
  assert.equal(getProximity('BHIWANDI', 'VASAI').distanceKm, 40);
  assert.equal(getProximity('BHIWANDI', 'DELHI').distanceKm, 1350);
  assert.equal(getProximity('DELHI', 'CHENNAI').distanceKm, 2200);
  assert.equal(getProximity('FACTORY', 'ECOM').distanceKm, 20);
});

test('unknown warehouses are rejected', () => {
  assert.throws(() => getWarehouse('NOWHERE'), /Unknown warehouse/);
  assert.throws(() => getProximity('BHIWANDI', 'NOWHERE'), /Unknown warehouse/);
});

test('transfer speed classifies cluster, regional, and inter-metro lanes', () => {
  assert.equal(classifyTransferSpeed('BHIWANDI', 'VASAI'), 'SAME_DAY');
  assert.equal(classifyTransferSpeed('BHIWANDI', 'DELHI'), 'ROAD_2_3_DAYS');
  assert.equal(classifyTransferSpeed('CHENNAI', 'DELHI'), 'ROAD_3_4_DAYS');
  const sameDay = getProximity('BHIWANDI', 'ECOM');
  assert.equal(sameDay.roadDays, 0);
  assert.equal(sameDay.airDays, 0);
});

test('transfer cost uses cluster-flat rates calibrated to the spec examples', () => {
  assert.deepEqual(calculateTransferCost('BHIWANDI', 'DELHI', 2000), {
    costPerUnit: 4,
    totalCost: 8000,
  });
  const inCluster = calculateTransferCost('BHIWANDI', 'ECOM', 5000);
  assertClose(inCluster.costPerUnit, 0.6);
  assertClose(inCluster.totalCost, 3000);
  assert.throws(() => calculateTransferCost('BHIWANDI', 'DELHI', 1.5), /integer/);
});

test('warehouse surplus and deficit split the signed position', () => {
  const positions = analyzeWarehouseSurplusDeficit({
    sku: 'SPLIT',
    minimumStockLevel: 1000,
    demandDrr: 10,
    demandShares: { BHIWANDI: 0.5, DELHI: 0.5 },
    positions: [
      { warehouseCode: 'BHIWANDI', currentStock: 800, allocatedStock: 0 },
      { warehouseCode: 'DELHI', currentStock: 200, allocatedStock: 0 },
    ],
  });
  const bhiwandi = positions.find((position) => position.warehouseCode === 'BHIWANDI');
  const delhi = positions.find((position) => position.warehouseCode === 'DELHI');
  assert.ok(bhiwandi && delhi);
  assert.equal(bhiwandi.warehouseMinimumStockLevel, 500);
  assert.equal(bhiwandi.surplusUnits, 300);
  assert.equal(bhiwandi.deficitUnits, 0);
  assert.equal(delhi.deficitUnits, 300);
  assert.equal(delhi.surplusUnits, 0);
});

test('the P0109-B anchor recommends Bhiwandi to Delhi (approx 2,000 units, LOW risk)', () => {
  const recs = generateTransferRecommendations({
    distributions: [anchorDistribution()],
    maxRecommendations: 10,
  });
  const delhi = recs.find((recommendation) => recommendation.toWarehouse === 'DELHI');
  assert.ok(delhi);
  assert.equal(delhi.fromWarehouse, 'BHIWANDI');
  assert.equal(delhi.transitSpeed, 'ROAD_2_3_DAYS');
  assert.equal(delhi.quantity, 2040);
  assert.equal(delhi.sourceSurplusAfterTransfer, 5345);
  assert.equal(delhi.estimatedCost, 8160);
  assert.equal(delhi.risk, 'LOW');
  assert.match(delhi.reason, /DELHI/);
  assert.match(delhi.reason, /BHIWANDI/);
});

test('ring-fencing never cumulatively drains a source below its buffered MSL', () => {
  const distribution = anchorDistribution();
  const positions = analyzeWarehouseSurplusDeficit(distribution);
  const recs = generateTransferRecommendations({
    distributions: [distribution],
    maxRecommendations: 10,
  });
  assert.ok(recs.length > 0);
  const transferredBySource = new Map<string, number>();
  for (const rec of recs) {
    const destination = positions.find((position) => position.warehouseCode === rec.toWarehouse);
    assert.ok(destination);
    transferredBySource.set(
      rec.fromWarehouse,
      (transferredBySource.get(rec.fromWarehouse) ?? 0) + rec.quantity,
    );
    assert.ok(rec.quantity <= destination.deficitUnits * 1.2 + 1e-9);
  }
  for (const [warehouseCode, transferred] of transferredBySource) {
    const source = positions.find((position) => position.warehouseCode === warehouseCode);
    assert.ok(source);
    assert.ok(
      source.availableStock - transferred >= source.warehouseMinimumStockLevel * 1.1 - 1e-9,
    );
  }
});

test('e-commerce warehouses are never used as a transfer source', () => {
  const recs = generateTransferRecommendations({
    distributions: [anchorDistribution()],
    maxRecommendations: 10,
  });
  assert.ok(recs.every((rec) => !getWarehouse(rec.fromWarehouse).isEcommerce));
});

test('excluded SKUs produce no recommendations', () => {
  const recs = generateTransferRecommendations({
    distributions: [anchorDistribution()],
    excludeSkus: ['P0109-B'],
  });
  assert.equal(recs.length, 0);
});

test('balanced distributions produce no recommendations', () => {
  const recs = generateTransferRecommendations({
    distributions: [
      {
        sku: 'BALANCED',
        minimumStockLevel: 1000,
        demandDrr: 10,
        demandShares: { BHIWANDI: 0.5, DELHI: 0.5 },
        positions: [
          { warehouseCode: 'BHIWANDI', currentStock: 500, allocatedStock: 0 },
          { warehouseCode: 'DELHI', currentStock: 500, allocatedStock: 0 },
        ],
      },
    ],
  });
  assert.equal(recs.length, 0);
});

test('recommendations are capped at maxRecommendations', () => {
  const recs = generateTransferRecommendations({
    distributions: [anchorDistribution()],
    maxRecommendations: 2,
  });
  assert.equal(recs.length, 2);
});

test('validation rejects malformed warehouse data', () => {
  assert.throws(
    () =>
      analyzeWarehouseSurplusDeficit({
        sku: 'BAD',
        minimumStockLevel: 100,
        demandDrr: 1,
        demandShares: { BHIWANDI: 0.5, DELHI: 0.4 },
        positions: [{ warehouseCode: 'BHIWANDI', currentStock: 10, allocatedStock: 0 }],
      }),
    /sum to 1/,
  );
  assert.throws(
    () =>
      analyzeWarehouseSurplusDeficit({
        sku: 'BAD',
        minimumStockLevel: 100,
        demandDrr: 1,
        demandShares: { BHIWANDI: 1 },
        positions: [{ warehouseCode: 'BHIWANDI', currentStock: 10, allocatedStock: 20 }],
      }),
    /allocatedStock exceeds/,
  );
  assert.throws(
    () =>
      analyzeWarehouseSurplusDeficit({
        sku: 'BAD',
        minimumStockLevel: 100,
        demandDrr: 1,
        demandShares: { NOWHERE: 1 },
        positions: [{ warehouseCode: 'BHIWANDI', currentStock: 10, allocatedStock: 0 }],
      }),
    /Unknown warehouse/,
  );
  assert.throws(
    () => generateTransferRecommendations({ distributions: [], maxRecommendations: 0 }),
    /maxRecommendations/,
  );
});

test('warehouse seeds keep observed totals and the pinned observed split', () => {
  const seed = WAREHOUSE_STOCK_SEEDS.find((entry) => entry.sku === 'EVM-25/128GB');
  assert.ok(seed);
  assert.equal(seed.provenance.perWarehouseSplit, 'observed');
  assert.equal(seed.holdings.find((h) => h.warehouseCode === 'BHIWANDI')?.currentStock, 73_000);
  assert.equal(seed.holdings.find((h) => h.warehouseCode === 'DELHI')?.currentStock, 586);
});

test('every warehouse stock seed reconciles to its observed aggregate', () => {
  for (const seed of WAREHOUSE_STOCK_SEEDS) {
    const evmSeed = EVM_SKU_SEEDS.find((entry) => entry.sku === seed.sku);
    assert.ok(evmSeed);
    const total = seed.holdings.reduce((sum, holding) => sum + holding.currentStock, 0);
    assert.equal(total, evmSeed.currentPhysicalStock, seed.sku);
  }
});

console.log(
  `\nCHUNK-4 transfer intelligence verification passed (${WAREHOUSE_STOCK_SEEDS.length} SKU distributions across 7 warehouses).`,
);
