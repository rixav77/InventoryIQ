import assert from 'node:assert/strict';
import {
  aggregateEasyEcomSales,
  extractTableNames,
  listMigrations,
  parseCsv,
  parseCsvToRecords,
  parseHundiaStockExport,
  parseNumericField,
  parseProcuraMslExport,
  validateEasyEcomOrders,
} from '../index.js';
import type { EasyEcomOrder } from '../index.js';

function test(name: string, run: () => void): void {
  run();
  console.log(`PASS ${name}`);
}

test('CSV parser handles quoted fields, escaped quotes, and CRLF', () => {
  const csv = 'a,b,c\r\n"x,1","say ""hi""",plain\r\n';
  const { headers, rows } = parseCsv(csv);
  assert.deepEqual([...headers], ['a', 'b', 'c']);
  assert.equal(rows.length, 1);
  assert.deepEqual([...(rows[0] ?? [])], ['x,1', 'say "hi"', 'plain']);
});

test('CSV parser can skip the header row', () => {
  const { headers, rows } = parseCsv('1,2\n3,4', { hasHeader: false });
  assert.equal(headers.length, 0);
  assert.equal(rows.length, 2);
});

test('parseCsvToRecords zips headers to values', () => {
  const records = parseCsvToRecords('sku,qty\nA,5\nB,7');
  assert.equal(records.length, 2);
  assert.equal(records[0]?.sku, 'A');
  assert.equal(records[1]?.qty, '7');
});

test('numeric fields strip currency and thousands separators', () => {
  assert.equal(parseNumericField('75,000', 'msp'), 75000);
  assert.equal(parseNumericField('₹1,234.5', 'cost'), 1234.5);
  assert.throws(() => parseNumericField('', 'msp'), /Missing numeric/);
  assert.throws(() => parseNumericField('n/a', 'msp'), /Invalid numeric/);
});

test('Procura MSL export parses aliased headers and comma numbers', () => {
  const csv = [
    'SKU,Monthly Selling Plan,Procurement Time,Minimum Order Quantity,Stock,Open PO,In-Transit,MSL,ROL',
    '"EVM-25/128GB","75,000",30,1,"73,586",0,0,"75,000","75,000"',
    'EVM-25/256GB,"1,00,000",30,0,"1,64,347","67,500",0,"1,00,000","1,00,000"',
  ].join('\n');
  const rows = parseProcuraMslExport(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.sku, 'EVM-25/128GB');
  assert.equal(rows[0]?.monthlySellingPlan, 75000);
  assert.equal(rows[0]?.currentStock, 73586);
  assert.equal(rows[1]?.openPurchaseOrders, 67500);
  assert.equal(rows[1]?.minimumStockLevel, 100000);
});

test('Procura parser rejects missing columns and empty SKUs', () => {
  assert.throws(() => parseProcuraMslExport('SKU,Stock\nA,1'), /Missing required column/);
  const csv = [
    'SKU,MSP,PT,MOQ,Stock,Open PO,In-Transit,MSL,ROL',
    ',100,30,1,10,0,0,50,50',
  ].join('\n');
  assert.throws(() => parseProcuraMslExport(csv), /empty SKU/);
});

test('Hundia stock export parses per-warehouse holdings', () => {
  const csv = [
    'SKU,Warehouse,Current,Allocated,Available',
    'P0109-B,Bhiwandi,"7,390",5,"7,385"',
    'P0109-B,Delhi,0,0,0',
  ].join('\n');
  const rows = parseHundiaStockExport(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.warehouse, 'Bhiwandi');
  assert.equal(rows[0]?.currentStock, 7390);
  assert.equal(rows[0]?.availableStock, 7385);
});

test('EasyEcom aggregation counts fulfilled orders and nets returns', () => {
  const orders: EasyEcomOrder[] = [
    { orderId: 'o1', sku: 'S', channel: 'amazon', quantity: 10, orderDate: '2026-09-20', status: 'DELIVERED' },
    { orderId: 'o2', sku: 'S', channel: 'amazon', quantity: 5, orderDate: '2026-09-20', status: 'DELIVERED' },
    { orderId: 'o3', sku: 'S', channel: 'flipkart', quantity: 8, orderDate: '2026-09-20', status: 'SHIPPED' },
    { orderId: 'o4', sku: 'S', channel: 'amazon', quantity: 3, orderDate: '2026-09-20', status: 'PENDING' },
    { orderId: 'o5', sku: 'S', channel: 'amazon', quantity: 2, orderDate: '2026-09-20', status: 'CANCELLED' },
  ];
  const returns = [
    { orderId: 'o1', sku: 'S', channel: 'amazon' as const, quantity: 4, returnDate: '2026-09-23' },
  ];
  const aggregated = aggregateEasyEcomSales(orders, returns);
  assert.equal(aggregated.length, 2);
  assert.deepEqual(aggregated[0], {
    date: '2026-09-20',
    sku: 'S',
    channel: 'amazon',
    unitsSold: 15,
    unitsReturned: 4,
  });
  assert.equal(aggregated[1]?.channel, 'flipkart');
  assert.equal(aggregated[1]?.unitsSold, 8);
  assert.equal(aggregated[1]?.unitsReturned, 0);
});

test('EasyEcom returns must reference matching fulfilled orders within fulfilled quantity', () => {
  const orders: EasyEcomOrder[] = [
    { orderId: 'o1', sku: 'S', channel: 'amazon', quantity: 5, orderDate: '2026-09-20', status: 'DELIVERED' },
  ];
  assert.throws(
    () => aggregateEasyEcomSales(orders, [
      { orderId: 'missing', sku: 'S', channel: 'amazon', quantity: 1, returnDate: '2026-09-21' },
    ]),
    /unknown or unfulfilled/,
  );
  assert.throws(
    () => aggregateEasyEcomSales(orders, [
      { orderId: 'o1', sku: 'OTHER', channel: 'amazon', quantity: 1, returnDate: '2026-09-21' },
    ]),
    /does not match/,
  );
  assert.throws(
    () => aggregateEasyEcomSales(orders, [
      { orderId: 'o1', sku: 'S', channel: 'amazon', quantity: 3, returnDate: '2026-09-21' },
      { orderId: 'o1', sku: 'S', channel: 'amazon', quantity: 3, returnDate: '2026-09-22' },
    ]),
    /exceed fulfilled quantity/,
  );
});

test('EasyEcom validation flags duplicates and bad fields', () => {
  const issues = validateEasyEcomOrders([
    { orderId: 'dup', sku: 'S', channel: 'amazon', quantity: 1, orderDate: '2026-09-20', status: 'DELIVERED' },
    { orderId: 'dup', sku: '', channel: 'amazon', quantity: -1, orderDate: '2026-13-40', status: 'DELIVERED' },
  ]);
  assert.ok(issues.some((issue) => issue.includes('duplicate orderId')));
  assert.ok(issues.some((issue) => issue.includes('empty sku')));
  assert.ok(issues.some((issue) => issue.includes('invalid quantity')));
  assert.ok(issues.some((issue) => issue.includes('invalid orderDate')));
});

test('migrations expose the initial schema and its tables', () => {
  const migrations = listMigrations();
  assert.equal(migrations.length, 1);
  assert.equal(migrations[0]?.name, '001_initial_schema.sql');
  const tables = extractTableNames(migrations[0]?.sql ?? '');
  for (const expected of [
    'sku_master',
    'daily_sales',
    'warehouses',
    'warehouse_stock',
    'transfer_recommendations',
    'purchase_orders',
    'vendor_performance',
    'procurement_prices',
    'vendor_concentration',
  ]) {
    assert.ok(tables.includes(expected), `missing table ${expected}`);
  }
});

console.log('\nCHUNK-5 integration ingestion verification passed.');
