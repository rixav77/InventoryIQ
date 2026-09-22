# EVM Zone Internal System — Limitations & Shortcomings Analysis

> **Executive Context:**  
> Analysis based on live screenshare with **Prashant Jain** (EVM IT & Automation Lead) on 22 September 2026, 25 high-resolution system screenshots of **Procura** (.NET/React), **CRM**, **WMS**, and **Tally ERP** integrations, and extensive e-commerce supply chain benchmarking.
>
> This document ranks every identified limitation from the **highest financial, operational, and algorithmic harm** (top) down to lower-impact secondary inefficiencies.

---

## 1. Static MSL Formula in a Hyper-Volatile E-Commerce Environment 🔴 [CRITICAL — CORE PAIN POINT]
* **Current State:**
  $$\text{MSL} = \left(\frac{\text{MSP}}{30}\right) \times \text{PT}$$
  $$\text{ROL} = \max(\text{MSL}, \text{MOQ})$$
  $$\text{ROQ} = \text{Open PO} + \text{In-transit} + \text{Stock} - \text{ROL}$$
  $$\text{Action} = \text{REORDER NOW when } \text{Stock} + \text{Open PO} + \text{In-transit} < \text{ROL}$$
  *$\text{MSP}$ (Monthly Selling Plan) is a manually typed constant, typically reviewed only quarterly.*
* **The Flaw:**
  E-commerce Daily Run Rate ($\text{DRR}$) is dynamic. Baseline sales of 100 units/day regularly jump to 120–200+ units/day during festival flash sales (Amazon Great Indian Festival, Flipkart Big Billion Days, Prime Day, Republic Day sales). A static formula cannot anticipate spikes or taper off after sales.
* **Harm & Business Impact:**
  * **Stockouts & Algorithmic Destruction:** Running out of stock on Amazon/Flipkart immediately triggers loss of the **Buy Box**. Amazon’s A10 algorithm rapidly suppresses out-of-stock listings in organic search ranking. Rebuilding organic search ranking after a 3–7 day stockout requires weeks of heavy ad spend (PPC) and price slashing.
  * **Financial Penalties:** Flipkart charges fulfillment failure penalties (effective Aug 2026: ₹30 for delayed dispatch, ₹60 for seller cancellation, ₹90 for delayed & cancelled).
  * **Trapped Working Capital:** If planners manually inflate MSP for a sale and actual demand underperforms, hundreds of thousands of units remain stranded in warehouses at full carrying cost.
* **Solution Direction:** **Chunk 1 (Dynamic MSL Engine)** — Time-decay weighted rolling DRR ($\alpha \cdot \text{DRR}_{7\text{d}} + \beta \cdot \text{DRR}_{14\text{d}} + \gamma \cdot \text{DRR}_{30\text{d}}$) with event calendar demand multipliers and automated post-sale normalization.

---

## 2. Safety Stock (SS) Hardcoded to ZERO Across All 717 SKUs 🔴 [CRITICAL]
* **Current State:**
  In the live Procura MSL Planning screen (`msl_planning_scheme.png`), the **SS (Safety Stock)** column displays `0` across every product row (e.g., `EVM-25/128GB`, `EVM-25/256GB`, `EVM-25/512GB`).
* **The Flaw:**
  The system assumes a perfectly deterministic universe where suppliers deliver exactly on time and customer demand is flat every single day.
* **Harm & Business Impact:**
  * Zero tolerance for supply chain friction. If an international container is held at Nhava Sheva port for 4 days or a promotional campaign goes viral for 48 hours, inventory drops to zero instantly.
  * Forces emergency, high-cost mitigation (e.g., expensive Air shipments instead of Sea freight).
* **Solution Direction:** **Chunk 2 (Demand Intelligence)** — Dynamic statistical safety stock calculation:
  $$\text{SS} = Z \times \sqrt{\left(\overline{\text{LT}} \times \sigma^2_D\right) + \left(\overline{D}^2 \times \sigma^2_{\text{LT}}\right)}$$
  protecting against both demand volatility ($\sigma_D$) and vendor delivery variance ($\sigma_{\text{LT}}$).

---

## 3. Massive Unmonitored Surplus Inventory & Trapped Working Capital 🔴 [CRITICAL]
* **Current State:**
  The system only triggers alerts when stock is *deficient* (`Action: REORDER NOW`). There is zero alerting or financial tracking when stock is *massively excessive*.
* **Live Evidence from EVM's Database (`msl_planning_scheme.png`):**
  * **`EVM-25/256GB`:** Current Stock = **164,347** | Open PO = **67,500** | MSL = **100,000**  
    $\rightarrow$ **Surplus Position = +131,847 units** above reorder requirement! At an estimated cost of ₹150/unit, over **₹1.97 Crore to ₹2.0+ Crore** is trapped in excess inventory on this single SKU alone.
  * **`EVM-M2/256GB`:** Stock = 19,753 vs MSL = 5,000 $\rightarrow$ **+14,753 units surplus** (~₹22 Lakhs+).
  * **`EVM-25/512GB`:** Stock = 31,207 vs MSL = 25,000 $\rightarrow$ **+6,207 units surplus** (~₹15.5 Lakhs+).
* **Harm & Business Impact:**
  * Electronics suffer rapid price erosion and obsolescence (NAND flash memory spot prices decline over time; newer controller revisions launch).
  * Incurring ongoing warehouse storage fees and cost of capital (~12% annual cost of debt on blocked capital).
* **Solution Direction:** **Chunk 3 (Working Capital Intelligence)** — Capital-at-risk scoring, surplus days-of-inventory thresholds (Healthy < 30d, Watch 30-60d, Warning 60-90d, Critical > 90d), and automated PO halt / markdown triggers.

---

## 4. Single Unified E-Commerce MSL (No Channel Segregation) 🟠 [HIGH HARM]
* **Current State:**
  Prashant confirmed: *"Currently it is one e-commerce MSL. We have multiple channels in e-commerce, but the e-commerce team plans it as a single quantity. Not bifurcated."*
* **The Flaw:**
  Treating Amazon, Flipkart, and Direct-to-Consumer (D2C) as one monolithic demand sink.
* **Harm & Business Impact:**
  * Different platforms have completely different fulfillment requirements: Amazon FBA requires stock inwarded into Amazon Fulfilment Centers (FCs) with strict cubic-foot restock/capacity limits; Flipkart Assured requires dedicated warehouse binding; D2C is fulfilled from own depot.
  * Stockouts can occur on Amazon FBA while Flipkart FC or depot holds surplus, or vice versa, causing localized loss of sales without the central tool alerting the team.
* **Solution Direction:** **Chunk 1 & 5** — Channel-segmented MSL:
  $$\text{MSL}_{\text{E-com}} = \text{MSL}_{\text{Amazon}} + \text{MSL}_{\text{Flipkart}} + \text{MSL}_{\text{D2C}} + \text{Safety Buffer}$$
  feeding into the upcoming e-commerce CRM tab.

---

## 5. Static Lead Time Assumptions vs Extreme Unmonitored Vendor Overdues 🟠 [HIGH HARM]
* **Current State:**
  Procurement Time ($\text{PT}$) is hardcoded in MSL planning as either 30 or 60 days.
* **Live Evidence from EVM's Database (`open_po.png`):**
  * PO `PO202606060002` (HK Nanotech Co.): **78 days overdue** (Value: **₹1,59,73,425**).
  * PO `PO202606250001` (CEHK Industry): **59 days overdue**.
  * Multiple Brandworks POs: **69 days overdue**.
* **The Flaw:**
  The planning engine calculates replenishment assuming goods will arrive in 30 days. In reality, actual lead times swing between 25 and 110 days due to overseas manufacturing, customs clearance delays (`Status: Under Custom Clearance`), and shipping mode variance (Air vs Sea).
* **Harm & Business Impact:**
  * Reorder recommendations trigger weeks too late because the system believes in-transit and open POs will arrive on an idealized schedule.
  * Catastrophic stockouts on mission-critical items when a vendor defaults.
* **Solution Direction:** **Chunk 2 & 7 (Vendor Intelligence)** — Track historical actual lead times ($\overline{\text{LT}}_{\text{actual}}$) and vendor On-Time In-Full (OTIF) scores; automatically replace quoted PT with empirical lead times in the MSL formula.

---

## 6. Multi-Vendor Price Disparities & Unmonitored Supplier Price Inflation 🟠 [HIGH HARM]
* **Current State:**
  EVM sources the same SKU from multiple domestic and overseas suppliers, but there is no centralized rate benchmarking or inflation detection during PO creation.
* **Live Evidence from EVM's Database (`Open_PO_which_are_in_pipeline.png` for Motherboard `EVM-H61FHL`):**
  * HK Nanotech (23-Jul-2026): **$11.99 / unit**
  * Yinghu International (28-Jul-2026): **$12.25 / unit**
  * Yinghu International (21-Aug-2026): **$13.30 / unit** *(+8.6% price surge in 3 weeks!)*
  * Shenzhen Dinggong (22-Aug-2026): **$13.30 / unit**
* **The Flaw:**
  Total spread of **$1.31 per unit (11% disparity)** on the identical component. On an order of 20,000 units, ordering from Yinghu/Shenzhen instead of HK Nanotech costs an extra **$26,200 (~₹21.8 Lakhs)** with zero system justification.
* **Harm & Business Impact:**
  * Unchecked procurement cost leakage.
  * Creeping supplier inflation goes undetected by procurement managers.
* **Solution Direction:** **Chunk 7 (Vendor Intelligence & Procurement Optimization)** — Cross-vendor rate cards, automated supplier allocation suggestions during reordering (Best Price vs Fastest Lead Time vs Lowest Risk split).

---

## 7. Warehouse-Agnostic Central Planning vs Regional Stock Imbalances 🟡 [MODERATE HARM]
* **Current State:**
  * Procura MSL Planning displays single aggregated stock numbers.
  * CRM Hundia Stock Summary shows that stock is physically fragmented across 6 locations: Vasai, Bhiwandi, Delhi, Chennai, Factory, and Depot.
* **Live Evidence (`hundia_stock_summary_2.0.png`):**
  * For Power Bank `EVM-P0109-B` (Black):
    * Bhiwandi Warehouse = **7,390 units available**
    * Delhi Warehouse = **0 units**
    * Vasai Warehouse = **0 units**
* **The Flaw:**
  The central planning screen sees 7,390 units and marks the item as healthy. However, customer orders originating from North India (Delhi) cannot be fulfilled locally and must either be cancelled, routed cross-country with high shipping latency and cost, or trigger unnecessary new production POs.
* **Harm & Business Impact:**
  * Elevated regional delivery times (3–5 days vs same-day/next-day), depressing Amazon Prime / Flipkart Assured delivery badges.
  * Inter-warehouse transfers in WMS are completely manual (request/furnish) without automated surplus-to-deficit transfer suggestions.
* **Solution Direction:** **Chunk 4 (Multi-Location Transfer Intelligence)** — Proximity-aware stock rebalancing (leveraging the 30–50 km Mumbai cluster for same-day replenishment; road/air cost-benefit models for Delhi/Chennai).

---

## 8. E-Commerce Return Rate (RTO) Ignored in Net Demand Planning 🟡 [MODERATE HARM]
* **Current State:**
  MSP and replenishment calculations are based entirely on outward shipments / gross sales.
* **The Flaw:**
  In Indian consumer electronics, Cash on Delivery (COD) Return-to-Origin (RTO) and customer return rates typically run between **20% and 35%**. These items remain locked in transit for 7 to 21 days before being inspected, repackaged, and restocked.
* **Harm & Business Impact:**
  * If EVM sells 10,000 units with an unmodeled 25% RTO, true net consumption is only 7,500 units. Planning replenishment on 10,000 leads to structural over-procurement of 2,500 units every month.
  * "Phantom stock" discrepancies during reverse transit.
* **Solution Direction:** **Chunk 2** — Net Realized DRR modeling:
  $$\text{DRR}_{\text{net}} = \text{DRR}_{\text{gross}} \times (1 - \text{RTO}_{\text{rate}})$$
  integrating reverse-logistics reconciliation.

---

## 9. Lack of SKU Classification (No ABC/XYZ Demand Segmentation) 🟡 [MODERATE HARM]
* **Current State:**
  All 717 SKUs are treated identically in a flat table.
* **The Flaw:**
  A top-selling ₹2.5 Crore SSD (`EVM-25/256GB`) is subjected to the same manual planning cadence and static formula as a ₹500 replacement enclosure or a low-volume 4TB SSD (`EVM-25/4TB`, which only has 5 units in stock and sells 25 units/month).
* **Harm & Business Impact:**
  * Planner fatigue: Planners spend disproportionate time reviewing 700+ rows instead of focusing intensely on the ~50 "AX" items that drive 80% of revenue.
  * Misallocated safety stock: High-variability, low-volume items (CZ) get overstocked, while high-velocity items (AX) experience preventable stockouts.
* **Solution Direction:** **Chunk 2** — Automated ABC (revenue contribution) $\times$ XYZ (demand unpredictability) matrix with differentiated service levels (99% for AX, 90% for CZ).

---

## 10. The MOQ Trap Causing Involuntary Multi-Month Capital Lockup 🟡 [MODERATE HARM]
* **Current State:**
  Procurement is strictly constrained by vendor Minimum Order Quantity:
  $$\text{ROL} = \max(\text{MSL}, \text{MOQ})$$
* **The Flaw:**
  As Prashant noted: *"If my MSL is 400 but MOQ is 1,000, once I order 1,000, I don't have to order for at least 6 months."* The system accepts this passively without evaluating alternatives.
* **Harm & Business Impact:**
  * Forces upfront capital commitment for half a year on slower-moving SKUs.
  * No feature to recommend split orders across warehouses or suggest domestic vendors with slightly higher unit rates but flexible smaller batches (JIT).
* **Solution Direction:** **Chunk 3** — MOQ Impact Analyzer comparing holding cost of excess MOQ against the premium of small-batch procurement.

---

## 11. Co-Mingling of Finished Goods and Spare Parts in Replenishment Planning ⚪ [LOW HARM]
* **Current State:**
  As revealed in `Screenshot 2026-09-22 at 7.31.48 PM.png`, POs allow mixing of "Items" (Finished Goods) and "Spares" in the same form.
* **The Flaw:**
  Spares demand is driven by warranty claims and RMA failure rates, whereas Finished Goods demand is driven by retail market sales.
* **Harm & Business Impact:**
  * Applying standard sales-velocity MSL logic to spare parts leads to either starved service centers (dissatisfied warranty customers) or excessive obsolete spare parts.
* **Solution Direction:** **Chunk 7** — Segregated spare parts consumption models based on historical warranty RMA rates.

---

## 12. Unverified Manual MSP Entry Without Rationale or Audit Trail ⚪ [LOW HARM]
* **Current State:**
  Planners can type any number into the `MSP` column on the Procura grid.
* **The Flaw:**
  No validation against historical run rates, no field capturing *why* the number was chosen, and no record of who changed it.
* **Harm & Business Impact:**
  * Prone to typos (e.g., adding an extra zero turns a 1,000-unit plan into 10,000 units).
  * Lack of accountability when forecasts deviate significantly from actuals.
* **Solution Direction:** **Chunk 6 (Dashboard & Alerts)** — Bounded input validation with alert warnings if manual override exceeds $\pm 30\%$ of calculated DRR trajectory, complete with user audit logging.

---

## Summary Matrix

| # | Limitation / Shortcoming | Harm Level | Primary Harm | Solution Area |
|:--|:---|:---:|:---|:---|
| 1 | Static MSL in Volatile E-Commerce | 🔴 Critical | Buy Box loss, search rank collapse, ₹90/unit penalties | Chunk 1 |
| 2 | Hardcoded Zero Safety Stock | 🔴 Critical | Instant stockouts on any shipment or demand shock | Chunk 2 |
| 3 | Unmonitored Surplus Inventory | 🔴 Critical | ₹2+ Cr trapped in dead/surplus stock on single SKUs | Chunk 3 |
| 4 | Single Unified E-Commerce MSL | 🟠 High | Stockouts in Amazon FBA despite depot surplus | Chunk 1 & 5 |
| 5 | Quoted PT vs 78-Day Vendor Delays | 🟠 High | Reorders placed weeks too late, stockout cascades | Chunk 2 & 7 |
| 6 | Unchecked 11% Multi-Vendor Disparities | 🟠 High | Direct financial leakage of ₹20L+ per cycle | Chunk 7 |
| 7 | Regional Stock Disparities (6 Warehouses)| 🟡 Moderate | Slower delivery badges, duplicate procurement | Chunk 4 |
| 8 | Ignored 20–35% E-Com RTO Rates | 🟡 Moderate | Structural over-procurement of phantom demand | Chunk 2 |
| 9 | Lack of ABC/XYZ Segmentation | 🟡 Moderate | Planner fatigue, critical SKUs neglected | Chunk 2 |
| 10| Inflexible Vendor MOQ Trap | 🟡 Moderate | 6 months of capital locked in low-velocity SKUs | Chunk 3 |
| 11| Co-Mingled Spares & Finished Goods | ⚪ Low | Starved warranty centers or dead spare inventory | Chunk 7 |
| 12| Unverified Manual MSP Entry | ⚪ Low | Typos, zero forecasting audit trail | Chunk 6 |
