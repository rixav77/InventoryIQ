# InventoryIQ — Automated MSL & Replenishment System
## First-Iteration Solution Proposal for EVM Zone

**Prepared by:** Axiom Labs  
**Target Stakeholders:** Prashant & EVM Operations Team  
**Date:** September 2026  

---

## 1. Executive Summary

EVM currently manages 500+ active SKUs across offline distribution, e-commerce (Amazon, Flipkart), and central warehousing. Every day, 2 dedicated team members manually review Google Sheets and the internal .NET system to figure out:
1. Which SKUs are running low?
2. Are replacement units already on order or in transit from overseas vendors (China/Taiwan/Hong Kong)?
3. Can we fulfill the shortage by transferring surplus stock internally without hurting another channel's MSL?
4. If a vendor reorder is strictly necessary, what quantity should be placed considering vendor MOQs?

**InventoryIQ** is a dedicated decision-intelligence engine designed to automate this entire workflow. It eliminates hours of manual cross-referencing, prevents costly stockouts on key channels like Amazon & Flipkart, and ensures EVM never ties up working capital in accidental duplicate orders.

---

## 2. How the Decision Engine Works (The Core Logic)

InventoryIQ runs continuously in the background and evaluates every SKU using a clean, step-by-step logic gate:

```text
               [ Current Stock < MSL? ]
                          │
                  YES ────┴──── NO ───> ✅ Stock Healthy (No Action)
                   │
         [ Check Pipeline / In-Transit ]
         (Existing POs arriving within lead time)
                   │
           Sufficient? ──── YES ───> ⏳ In-Transit Sufficient (Wait for PO)
                   │ NO
                   ▼
         [ Check Internal Transfer Possibilities ]
         (Surplus at other locations above their own MSL)
                   │
       Can Transfer Safely? ──── YES ───> 🔄 Internal Transfer Recommended
                   │ NO
                   ▼
         [ Vendor Reorder Required ]
         (Calculate deficit + Apply Vendor MOQ & Pack Size)
                   │
                   ▼
         🛒 Recommend Vendor PO (Exact Qty + Full Reason)
```

---

## 3. Key Capabilities Built for EVM

### 1. Smart Pipeline Awareness
- A basic alert system sees `Stock (150) < MSL (200)` and tells you to buy.
- **InventoryIQ checks the pipeline first**: If 500 units are already booked under PO #482 arriving in 12 days, it tells you to **WAIT**, preventing unnecessary cash lockup.

### 2. Channel & E-Commerce Protection (Ring-Fencing)
- E-commerce inventory (Amazon FBA, Flipkart Assured) operates under strict fulfillment SLAs.
- InventoryIQ prevents blind stock transfers: it will **never** recommend pulling stock from a warehouse or channel if doing so would cause that channel to drop below its own required safety threshold.

### 3. Vendor MOQ & Lead-Time Integration
- Overseas electronics procurement requires ordering in batch multiples (MOQ 500, 1000, carton sizes).
- The system automatically rounds up recommendations to vendor-compliant order quantities.

### 4. Zero Disruption to Existing Tools
- EVM does not need to abandon its current ReactJS + .NET system or Google Sheets.
- InventoryIQ works as an intelligent companion layer—reading data from your existing sheets/APIs, processing the decisions, and delivering clean, actionable daily recommendations.

---

## 4. What EVM Receives Daily: The Morning Recommendation Digest

Every morning, Prashant and the operations team receive a clear, actionable summary (available via Web Dashboard, WhatsApp, or Excel/Sheets export):

| SKU | Product Description | Location / Channel | Current Stock | In-Transit (PO) | Required MSL | Recommended Action | Action Qty | Why / Rationale |
|---|---|---|---|---|---|---|---|---|
| **EVM-SSD-512G** | 512GB 2.5" SATA SSD | Central (Vasai) | 120 | 0 | 300 | 🛒 **REORDER** | 500 (MOQ) | Current (120) < MSL (300). Zero pipeline. Deficit = 180. Rounded up to vendor MOQ (500). |
| **EVM-RAM-16G** | 16GB DDR4 Desktop RAM | Amazon FBA | 45 | 300 (Arriving 28-Sep) | 150 | ⏳ **WAIT** | — | Current stock (45) < MSL (150), but PO #882 for 300 units lands in 4 days. |
| **EVM-NVME-1TB** | 1TB NVMe Gen4 SSD | Flipkart Assured | 30 | 0 | 100 | 🔄 **TRANSFER** | 120 | Flipkart stock critical. Central WH has 450 units (Surplus: 150 above Central MSL). Transfer 120 units from Central to FK. |
| **EVM-USB-64G** | 64GB Metal Pendrive | Central (Vasai) | 1,200 | 0 | 800 | ✅ **HEALTHY** | — | Stock exceeds MSL. No action needed. |

---

## 5. Implementation Roadmap (Phased Approach)

We recommend a lightweight 3-phase rollout to deliver value in days, not months:

### Phase 1: Prototype & Rule Calibration (Week 1–2)
- Connect sample data (Google Sheets / manual CSV exports).
- Set up the MSL + Pipeline + Transfer calculation engine.
- Verify recommendations against recent manual decisions made by EVM's ops team to validate 100% accuracy.

### Phase 2: Operations Dashboard & Daily Alerts (Week 3–4)
- Live automated synchronization with Google Sheets / .NET app.
- Dedicated dashboard with SKU filters, low-stock warnings, and pipeline trackers.
- Automated daily morning digest delivered to the operations team.

### Phase 3: Marketplace & Ecosystem Expansion (Week 5+)
- Direct Amazon SP-API and Flipkart integration for live FBA inventory sync.
- 1-click PO generation and export back into EVM's accounting/ERP tools.

---

## 6. Next Steps

1. **Review Questionnaire:** Quick review of the 11 practical questions shared with Prashant.
2. **Sample Data Export:** EVM shares a sample snapshot of 15–20 SKUs (stock levels, MSL, open POs) to run a quick proof-of-concept run.
3. **15-Minute Alignment Call:** Connect with Prashant to finalize business logic assumptions.
