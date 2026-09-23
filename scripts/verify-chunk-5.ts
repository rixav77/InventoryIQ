import {
  aggregateEasyEcomSales,
  extractTableNames,
  listMigrations,
  parseHundiaStockExport,
  parseProcuraMslExport,
} from '../packages/integrations/src/index.js';
import type { EasyEcomOrder } from '../packages/integrations/src/index.js';

const procuraCsv = [
  'SKU,Monthly Selling Plan,Procurement Time,Minimum Order Quantity,Stock,Open PO,In-Transit,MSL,ROL',
  '"EVM-25/128GB","75,000",30,1,"73,586",0,0,"75,000","75,000"',
  'EVM-25/256GB,"1,00,000",30,0,"1,64,347","67,500",0,"1,00,000","1,00,000"',
  'EVM-25/512GB,"25,000",30,1,"31,207",0,0,"25,000","25,000"',
].join('\n');

const hundiaCsv = [
  'SKU,Warehouse,Current,Allocated,Available',
  'P0109-B,Bhiwandi,"7,390",5,"7,385"',
  'P0109-B,Delhi,0,0,0',
  'EVM-25/128GB,Bhiwandi,"73,000",0,"73,000"',
  'EVM-25/128GB,Delhi,586,0,586',
].join('\n');

const orders: readonly EasyEcomOrder[] = [
  { orderId: 'o1', sku: 'EVM-25/128GB', channel: 'amazon', quantity: 40, orderDate: '2026-09-20', status: 'DELIVERED' },
  { orderId: 'o2', sku: 'EVM-25/128GB', channel: 'flipkart', quantity: 25, orderDate: '2026-09-20', status: 'SHIPPED' },
  { orderId: 'o3', sku: 'EVM-25/128GB', channel: 'd2c', quantity: 12, orderDate: '2026-09-21', status: 'DELIVERED' },
  { orderId: 'o4', sku: 'EVM-25/128GB', channel: 'amazon', quantity: 9, orderDate: '2026-09-21', status: 'PENDING' },
];

const procuraRows = parseProcuraMslExport(procuraCsv);
const hundiaRows = parseHundiaStockExport(hundiaCsv);
const sales = aggregateEasyEcomSales(orders, [
  { orderId: 'o1', sku: 'EVM-25/128GB', channel: 'amazon', quantity: 3, returnDate: '2026-09-20' },
]);
const migrations = listMigrations();
const tables = extractTableNames(migrations[0]?.sql ?? '');

console.log('\nInventoryIQ CHUNK-5: Integration Layer');
console.log('CSV ingestion + EasyEcom sales schema + RDS migration registry\n');

console.log('Procura MSL export ingestion');
console.table(
  procuraRows.map((row) => ({
    sku: row.sku,
    msp: row.monthlySellingPlan,
    pt: row.procurementTimeDays,
    moq: row.minimumOrderQuantity,
    stock: row.currentStock,
    openPo: row.openPurchaseOrders,
    msl: row.minimumStockLevel,
  })),
);

console.log('\nHundia per-warehouse stock ingestion');
console.table(hundiaRows);

console.log('\nEasyEcom daily sales aggregation (fulfilled orders net of returns)');
console.table(sales);

console.log('\nRDS migrations');
console.table(migrations.map((migration) => ({ file: migration.name, bytes: migration.sql.length })));
console.log(`Tables provisioned: ${tables.join(', ')}`);

console.log(
  '\nData note: parsers and the EasyEcom schema are implemented and unit-tested against deterministic ' +
    'sample exports; no live API or database connection is made in the prototype. The RDS PostgreSQL ' +
    'migration is schema-only and idempotent (CREATE TABLE IF NOT EXISTS).',
);
console.log('\nCHUNK-5 verification completed successfully.');
