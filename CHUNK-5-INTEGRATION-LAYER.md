# Chunk 5 — Integration Layer 🔗

> How InventoryIQ connects to EVM's existing ecosystem without disrupting their workflows.

---

## EVM's Current System Map

```
┌─────────────────────────────────────────────────────────┐
│                    EVM's Systems                        │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐    │
│  │ Tally ERP │◄─►│ Procura  │   │  WMS (Warehouse) │    │
│  │           │   │ (.NET +  │   │   - Transfers     │    │
│  │ - Ledgers │   │  React)  │   │   - Request/      │    │
│  │ - Bills   │   │          │   │     Furnish        │    │
│  │ - Vouchers│   │ - POs    │   └──────────────────┘    │
│  │ - PO Qty  │   │ - MSL    │                           │
│  └──────────┘   │ - Ships  │   ┌──────────────────┐    │
│                  │ - Vendors│   │    EasyEcom       │    │
│                  │ - SKUs   │   │ - E-com orders    │    │
│                  │ - Stock  │   │ - Channel sync    │    │
│                  └──────────┘   └──────────────────┘    │
│                                                         │
│  ┌──────────┐   ┌──────────┐                           │
│  │   CRM    │   │  Admin   │                           │
│  │ - Sales  │   │ - Tally  │                           │
│  │ - Stock  │   │   Sync   │                           │
│  │ - Distrib│   │ - EasyE  │                           │
│  │ - Pricing│   │   Creds  │                           │
│  └──────────┘   └──────────┘                           │
└─────────────────────────────────────────────────────────┘

              ┌─────────────────────┐
              │   InventoryIQ       │
              │   (Our Solution)    │
              │                     │
              │ ← Reads from above  │
              │ → Writes recommend- │
              │   ations back       │
              └─────────────────────┘
```

---

## Integration Priority

### Phase 1: Read-Only (Prototype + V1)

| Data Source | What We Pull | How | Fallback |
|---|---|---|---|
| **EasyEcom** | Daily sales per SKU per channel, returns, orders | EasyEcom API (already integrated in their system) | CSV/Excel export from EasyEcom dashboard |
| **Procura** | SKU master, current stock, MSL, PT, MOQ, Open PO, In-transit | Procura API (endpoints confirmed by Prashant) | CSV export from MSL Planning screen |
| **CRM** | Per-warehouse stock (Current, Allocated, Available) | Procura/CRM API | CSV export from Hundia Stock Summary |
| **Tally** | PO outstanding quantities, financial reconciliation | Via Procura (Procura already syncs with Tally) | Not needed directly |

### Phase 2: Write-Back (V1+)

| Target | What We Push | How | Condition |
|---|---|---|---|
| **Procura E-com CRM tab** | Recommended e-com MSL values | API write (pending dev team approval) | After Prashant's CRM tab is live |
| **WMS** | Transfer recommendations | API or webhook | After security review |
| **WhatsApp / Email** | Daily alerts, MSL review reports | WhatsApp Business API / AWS SES | No dependency |

### Phase 3: Marketplace Direct (V2)

| Source | What We Pull | How |
|---|---|---|
| **Amazon SP-API** | FBA stock levels, Buy Box status, sales velocity | Amazon Selling Partner API |
| **Flipkart Seller API** | Assured stock, order velocity, returns | Flipkart Marketplace API |

---

## EasyEcom Integration (Priority 1)

EasyEcom is **already integrated** in EVM's Admin panel (visible in screenshots: EasyEcom Credentials + EasyEcom Sync). This is our fastest path to sales data.

### EasyEcom API Endpoints We Need

```
GET /api/v1/orders          → Daily orders with channel, SKU, qty, status
GET /api/v1/returns         → Return orders with reason codes
GET /api/v1/inventory       → Current channel-wise inventory levels
GET /api/v1/products        → Product/SKU master with channel mappings
GET /api/v1/channels        → Active marketplace channels

Authentication: API Key + Secret (from EasyEcom Credentials in Admin)
Rate Limits: Typically 2 req/sec, 5000 req/day
```

### Data Sync Strategy

```
Daily sync at 2 AM IST:
  1. Pull all orders from yesterday → aggregate into daily_sales table
  2. Pull all returns from yesterday → update daily_sales.units_returned
  3. Pull current inventory → update warehouse_stock table

Event-triggered sync:
  - On sale event start → increase sync frequency to every 4 hours
  - On MSL recommendation generation → pull latest stock for accuracy
```

---

## Procura API Integration (Priority 1)

Prashant confirmed: *"Yes, this app has API endpoints."*

Pending: *"I might need to check with my dev team if there are any security concerns."*

### Endpoints We Need to Request

```
# SKU Master
GET /api/skus                    → SKU list with code, name, category hierarchy, status
GET /api/skus/{code}/stock       → Per-warehouse stock for a SKU

# MSL Planning Data
GET /api/msl-planning            → Full MSL planning grid (SKU, Stock, MSP, PT, MSL, MOQ, SS, ROL, Open PO, Intransit, ROQ, Action)
GET /api/msl-planning/{sku}      → Single SKU MSL data

# Purchase Orders
GET /api/purchase-orders         → PO list with status, vendor, value
GET /api/purchase-orders/open    → Open POs with balance quantities
GET /api/purchase-orders/{id}    → PO detail with line items

# Shipments
GET /api/shipments               → Active shipments with ETD/ETA
GET /api/shipments/{id}          → Shipment detail

# Vendors
GET /api/vendors                 → Vendor list with performance data
```

### If API Access is Denied

Fallback: **CSV/Excel Export Automation**
- Procura has "Export to Excel" buttons on multiple screens (visible in screenshots)
- User uploads CSV weekly → we process
- Or: browser automation (Playwright) to auto-export (not recommended for V1)

---

## Data Pipeline Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  EasyEcom   │────►│   Ingestion  │────►│  PostgreSQL   │
│  API        │     │   Service    │     │  (AWS RDS)    │
└─────────────┘     │              │     │               │
                    │  - Validate  │     │  - daily_sales│
┌─────────────┐     │  - Transform │     │  - sku_master │
│  Procura    │────►│  - Dedupe    │     │  - stock      │
│  API/CSV    │     │  - Load      │     │  - po_data    │
└─────────────┘     └──────────────┘     │  - shipments  │
                                         └──────┬───────┘
                                                │
                    ┌──────────────┐             │
                    │  Calculation │◄────────────┘
                    │  Engine      │
                    │              │
                    │  - DRR calc  │     ┌──────────────┐
                    │  - MSL reco  │────►│  Dashboard   │
                    │  - ABC/XYZ   │     │  (React/Vite)│
                    │  - Alerts    │     └──────────────┘
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Notification │
                    │  Service      │
                    │  - WhatsApp   │
                    │  - Email      │
                    │  - Webhook    │
                    └──────────────┘
```

---

## Sync Error Handling

```
Retry Policy:
  - API failures: 3 retries with exponential backoff (1s, 4s, 16s)
  - If all retries fail: use last-known-good data + flag as STALE
  - Alert admin if data is > 24 hours stale

Data Validation:
  - SKU code format check
  - Negative stock detection (flag, don't reject)
  - Duplicate order detection (by order ID)
  - Timezone normalization (all to IST)
```

---

## Prototype Scope (2-3 Days)

For the prototype, we **don't need live API integration**:

1. ✅ Export MSL Planning data from Procura as CSV → import into our system
2. ✅ Export Hundia Stock Summary as CSV → import per-warehouse stock
3. ✅ Mock EasyEcom data (or get a real export from Prashant)
4. ✅ Build the ingestion pipeline to handle CSV uploads
5. ✅ Schema ready for API integration in V1

### Schema Request to Prashant

Draft message to Prashant asking for:
```
Hi Prashant, for the prototype, could your team share:
1. MSL Planning export (Excel) — the full grid with all 717 SKUs
2. Hundia Stock Summary export — "By Warehouse" view
3. Open PO list export
4. EasyEcom: last 90 days of order data (if possible, per-channel)

This will help us run the dynamic MSL engine on your real data 
and show you meaningful recommendations.
```
