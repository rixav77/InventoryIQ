export interface CsvParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
}

export interface ParsedCsv {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}

export interface ProcuraMslRow {
  sku: string;
  monthlySellingPlan: number;
  procurementTimeDays: number;
  minimumOrderQuantity: number;
  currentStock: number;
  openPurchaseOrders: number;
  inTransitStock: number;
  minimumStockLevel: number;
  reorderLevel: number;
}

export interface HundiaStockRow {
  sku: string;
  warehouse: string;
  currentStock: number;
  allocatedStock: number;
  availableStock: number;
}

function tokenizeCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let index = 0;

  const pushField = (): void => {
    row.push(field);
    field = '';
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (index < text.length) {
    const char = text.charAt(index);
    if (inQuotes) {
      if (char === '"') {
        if (text.charAt(index + 1) === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === delimiter) {
      pushField();
      index += 1;
      continue;
    }
    if (char === '\r') {
      index += 1;
      continue;
    }
    if (char === '\n') {
      pushRow();
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((candidate) => !(candidate.length === 1 && candidate[0] === ''));
}

export function parseCsv(text: string, options: CsvParseOptions = {}): ParsedCsv {
  const delimiter = options.delimiter ?? ',';
  const hasHeader = options.hasHeader ?? true;
  const records = tokenizeCsv(text, delimiter);

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }
  if (!hasHeader) {
    return { headers: [], rows: records };
  }
  const [headerRow, ...dataRows] = records;
  return {
    headers: (headerRow ?? []).map((header) => header.trim()),
    rows: dataRows,
  };
}

export function parseCsvToRecords(
  text: string,
  options?: CsvParseOptions,
): readonly Record<string, string>[] {
  const { headers, rows } = parseCsv(text, options);
  return rows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? '';
    });
    return record;
  });
}

export function parseNumericField(value: string, field: string): number {
  const cleaned = value.replace(/[,\s₹$]/g, '');
  if (cleaned === '') {
    throw new Error(`Missing numeric value for ${field}.`);
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${field}: ${value}`);
  }
  return parsed;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_\-/.]+/g, '');
}

function resolveColumn(headers: readonly string[], aliases: readonly string[]): string | undefined {
  return headers.find((header) => {
    const normalized = normalizeHeader(header);
    return aliases.some((alias) => normalizeHeader(alias) === normalized);
  });
}

function requireColumn(headers: readonly string[], aliases: readonly string[], label: string): string {
  const column = resolveColumn(headers, aliases);
  if (column === undefined) {
    throw new Error(`Missing required column for ${label}.`);
  }
  return column;
}

const PROCURA_COLUMNS = {
  sku: ['SKU', 'SKU Code', 'Item Code'],
  monthlySellingPlan: ['MSP', 'Monthly Selling Plan'],
  procurementTimeDays: ['PT', 'Procurement Time', 'Procurement Time Days'],
  minimumOrderQuantity: ['MOQ', 'Minimum Order Quantity'],
  currentStock: ['Stock', 'Current Stock'],
  openPurchaseOrders: ['Open PO', 'Open Purchase Orders', 'Open Purchase Order'],
  inTransitStock: ['In-Transit', 'In Transit', 'InTransit'],
  minimumStockLevel: ['MSL', 'Minimum Stock Level'],
  reorderLevel: ['ROL', 'Reorder Level'],
} as const;

export function parseProcuraMslExport(text: string): readonly ProcuraMslRow[] {
  const { headers, rows } = parseCsv(text);
  const skuColumn = requireColumn(headers, PROCURA_COLUMNS.sku, 'sku');
  const mspColumn = requireColumn(headers, PROCURA_COLUMNS.monthlySellingPlan, 'monthlySellingPlan');
  const ptColumn = requireColumn(headers, PROCURA_COLUMNS.procurementTimeDays, 'procurementTimeDays');
  const moqColumn = requireColumn(headers, PROCURA_COLUMNS.minimumOrderQuantity, 'minimumOrderQuantity');
  const stockColumn = requireColumn(headers, PROCURA_COLUMNS.currentStock, 'currentStock');
  const openPoColumn = requireColumn(headers, PROCURA_COLUMNS.openPurchaseOrders, 'openPurchaseOrders');
  const inTransitColumn = requireColumn(headers, PROCURA_COLUMNS.inTransitStock, 'inTransitStock');
  const mslColumn = requireColumn(headers, PROCURA_COLUMNS.minimumStockLevel, 'minimumStockLevel');
  const rolColumn = requireColumn(headers, PROCURA_COLUMNS.reorderLevel, 'reorderLevel');

  const cell = (row: readonly string[], column: string): string => row[headers.indexOf(column)] ?? '';

  return rows.map((row) => {
    const sku = cell(row, skuColumn).trim();
    if (sku === '') {
      throw new Error('Encountered a Procura row with an empty SKU.');
    }
    return {
      sku,
      monthlySellingPlan: parseNumericField(cell(row, mspColumn), 'monthlySellingPlan'),
      procurementTimeDays: parseNumericField(cell(row, ptColumn), 'procurementTimeDays'),
      minimumOrderQuantity: parseNumericField(cell(row, moqColumn), 'minimumOrderQuantity'),
      currentStock: parseNumericField(cell(row, stockColumn), 'currentStock'),
      openPurchaseOrders: parseNumericField(cell(row, openPoColumn), 'openPurchaseOrders'),
      inTransitStock: parseNumericField(cell(row, inTransitColumn), 'inTransitStock'),
      minimumStockLevel: parseNumericField(cell(row, mslColumn), 'minimumStockLevel'),
      reorderLevel: parseNumericField(cell(row, rolColumn), 'reorderLevel'),
    };
  });
}

const HUNDIA_COLUMNS = {
  sku: ['SKU', 'SKU Code', 'Item Code'],
  warehouse: ['Warehouse', 'Location', 'Godown'],
  currentStock: ['Current', 'Current Stock', 'Stock'],
  allocatedStock: ['Allocated', 'Allocated Stock'],
  availableStock: ['Available', 'Available Stock'],
} as const;

export function parseHundiaStockExport(text: string): readonly HundiaStockRow[] {
  const { headers, rows } = parseCsv(text);
  const skuColumn = requireColumn(headers, HUNDIA_COLUMNS.sku, 'sku');
  const warehouseColumn = requireColumn(headers, HUNDIA_COLUMNS.warehouse, 'warehouse');
  const currentColumn = requireColumn(headers, HUNDIA_COLUMNS.currentStock, 'currentStock');
  const allocatedColumn = requireColumn(headers, HUNDIA_COLUMNS.allocatedStock, 'allocatedStock');
  const availableColumn = requireColumn(headers, HUNDIA_COLUMNS.availableStock, 'availableStock');

  const cell = (row: readonly string[], column: string): string => row[headers.indexOf(column)] ?? '';

  return rows.map((row) => {
    const sku = cell(row, skuColumn).trim();
    const warehouse = cell(row, warehouseColumn).trim();
    if (sku === '' || warehouse === '') {
      throw new Error('Encountered a Hundia stock row with an empty SKU or warehouse.');
    }
    return {
      sku,
      warehouse,
      currentStock: parseNumericField(cell(row, currentColumn), 'currentStock'),
      allocatedStock: parseNumericField(cell(row, allocatedColumn), 'allocatedStock'),
      availableStock: parseNumericField(cell(row, availableColumn), 'availableStock'),
    };
  });
}
