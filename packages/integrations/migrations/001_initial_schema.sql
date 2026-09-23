-- InventoryIQ initial schema (AWS RDS PostgreSQL)
-- Covers the ingestion pipeline (CHUNK-5), multi-location transfers (CHUNK-4),
-- and vendor intelligence (CHUNK-7). Recommend-only: writes stay advisory.

CREATE TABLE IF NOT EXISTS sku_master (
  sku_code VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  master_category TEXT,
  category TEXT,
  subcategory TEXT,
  status VARCHAR(20) DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_sales (
  id BIGSERIAL PRIMARY KEY,
  sku_code VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  sales_date DATE NOT NULL,
  units_sold INTEGER NOT NULL DEFAULT 0,
  units_returned INTEGER NOT NULL DEFAULT 0,
  gross_revenue NUMERIC(14,2),
  last_synced TIMESTAMPTZ,
  UNIQUE (sku_code, channel, sales_date)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  is_ecommerce BOOLEAN DEFAULT FALSE,
  is_fba BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS warehouse_proximity (
  from_warehouse_id INTEGER REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  distance_km DECIMAL(8,1),
  transit_days_road DECIMAL(3,1),
  transit_days_air DECIMAL(3,1),
  cost_per_unit DECIMAL(8,2),
  PRIMARY KEY (from_warehouse_id, to_warehouse_id)
);

CREATE TABLE IF NOT EXISTS warehouse_stock (
  sku_code VARCHAR(50) NOT NULL,
  warehouse_id INTEGER REFERENCES warehouses(id),
  current_qty INTEGER NOT NULL DEFAULT 0,
  allocated_qty INTEGER NOT NULL DEFAULT 0,
  available_qty INTEGER NOT NULL DEFAULT 0,
  last_synced TIMESTAMPTZ,
  PRIMARY KEY (sku_code, warehouse_id)
);

CREATE TABLE IF NOT EXISTS transfer_recommendations (
  id SERIAL PRIMARY KEY,
  sku_code VARCHAR(50) NOT NULL,
  from_warehouse_id INTEGER REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  recommended_qty INTEGER NOT NULL,
  reason TEXT,
  transit_time VARCHAR(50),
  estimated_cost DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ,
  actioned_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(30) UNIQUE NOT NULL,
  sku_code VARCHAR(50) NOT NULL,
  vendor_code VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  received_qty INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(12,4),
  currency VARCHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(8,4),
  status VARCHAR(30),
  expected_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(30) REFERENCES purchase_orders(po_number),
  awb_bl VARCHAR(60),
  etd DATE,
  eta DATE,
  customs_status VARCHAR(40),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_performance (
  id SERIAL PRIMARY KEY,
  vendor_code VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_pos INTEGER,
  on_time_pos INTEGER,
  in_full_pos INTEGER,
  otif_score DECIMAL(5,2),
  avg_lead_time_days DECIMAL(6,1),
  lead_time_stddev DECIMAL(6,1),
  quality_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS procurement_prices (
  id SERIAL PRIMARY KEY,
  sku_code VARCHAR(50) NOT NULL,
  vendor_code VARCHAR(20) NOT NULL,
  po_number VARCHAR(30),
  po_date DATE,
  unit_price DECIMAL(12,4),
  currency VARCHAR(3) DEFAULT 'USD',
  unit_price_inr DECIMAL(12,4),
  exchange_rate DECIMAL(8,4),
  quantity INTEGER
);

CREATE TABLE IF NOT EXISTS vendor_concentration (
  sku_code VARCHAR(50) NOT NULL,
  vendor_code VARCHAR(20) NOT NULL,
  share_pct DECIMAL(5,2),
  risk_level VARCHAR(20),
  last_calculated TIMESTAMPTZ,
  PRIMARY KEY (sku_code, vendor_code)
);
