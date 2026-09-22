# Meeting Summary — EVM × Axiom Labs (Screenshare with Prashant)

**Date:** 22 September 2026
**Participants:** Prashant Jain (EVM), Rishav Kumar (Axiom Labs)
**Format:** Screenshare walkthrough of EVM's internal tools

---

## Overview

Prashant Jain walked Rishav through EVM's order procurement tool, MSL planning, warehouses, POs, and shipment terms. Key pain point confirmed: the e-commerce MSL is volatile and needs a dynamic solution, which Rishav's team will prototype in 2-3 days.

---

## MSL Planning Tool Walkthrough

- Tool tracks SKU, current stock, monthly selling plan (MSP), procurement time, and MOQ per item.
- Procurement time varies by SKU (e.g. 30 or 60 days), which adjusts the minimum stock level.
- MOQ drives order size: if MSL is 400 but MOQ is 1,000, one order covers ~6 months.
- Open POs flow into an in-transit state once the logistics team ships them, reflecting live in MSL planning.

## Warehouses & Stock

- Six EVM-owned warehouses: Vasai, Bhiwandi, Delhi, Chennai, Factory, E-commerce, and Depot.
- 3-4 warehouses are in Bombay, 30-50 km apart; others in Delhi and Chennai.
- Noted as an important signal for the feature being designed.
- Same SKU can exist across multiple warehouses with differing stock levels.
- Warehouse-to-warehouse transfers happen in the WMS, not procurement, via request/furnish flow.

## Purchase Orders & Shipment Terms

- PO fields include bill-to, consignee, supplier, PO type (SFG/FG), currency, shipment terms, SKU, quantity, rate, amount.
- Shipment terms mostly FOB or ex-works, defining how freight cost is split between supplier and EVM.
- Partial deliveries handled via GRN knock-off against the PO; ~20% of orders are partial, 80% single-shot.

## E-commerce MSL Pain Point

- Currently one combined e-commerce MSL across channels (Amazon, Flipkart), not bifurcated per channel.
- Channel/general trade MSL is stable (quarterly); e-commerce MSL is volatile and needs monthly review.
- DRR can spike from 100 to 120-200 during sales; MSL must adjust to avoid overstocking and locked capital.
- E-commerce MSL will be managed in a new upcoming CRM tab and reflected in MSL planning.

## Integration & Next Steps

- Procurement app has API endpoints; data also flows from WMS, ERP and other systems.
- Rishav's team will deliver a working prototype in 2-3 days based on info gathered.
- Read-only endpoint access is optional and pending Prashant Jain's dev team's security review.

---

## Action Items

| Owner | Action |
|---|---|
| Prashant Jain | Ask developer to share SKU (and other required) schemas with Rishav's team |
| Prashant Jain | Check with dev team on security concerns around exposing read-only API endpoints, and share if cleared |
| Rishav (Axiom Labs) | Deliver a working prototype for the dynamic e-commerce MSL solution within 2-3 days |

## Decisions Made

- E-commerce MSL is the primary pain point and target for the solution, given its volatility vs stable channel MSL.
- E-commerce MSL will be segregated into a separate tab in the upcoming e-commerce CRM, feeding into MSL planning.
