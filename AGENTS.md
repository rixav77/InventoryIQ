# AGENTS.md — Master Context & Project Guide for Autonomous Agents

> 🚨 **MANDATORY NOTICE & QUEUE PROTOCOL FOR ALL AI AGENTS & SUBAGENTS:**  
> If you are an AI assistant, subagent, or fresh agent session with no prior conversation history entering this workspace, **you MUST thoroughly review this file and the core specification documents referenced in Section 4 before proposing code, making architectural changes, or executing tasks.**  
> Do not make generic e-commerce assumptions. You are operating on real production data, confirmed formulas, and verified constraints gathered directly from EVM Zone's leadership.

---

## 1. Quick Identity & Stakeholder Map

* **The Leadership & Engineering Team (Axiom Labs — `axiomlabs.live`):**
  * **Rishav Kumar** (`rixav77`) & **Shyam**: Co-Founders & Lead Engineers at Axiom Labs (equal partners leading engineering & product).
* **The Client:** **EVM Zone** (`evmzone.com`) / **Hundia Info Solutions Pvt. Ltd.** (leading Indian consumer electronics & IT peripheral manufacturer — SSDs, DRAM, motherboards, power banks, cabinets, accessories).
* **Client Key Contact:**
  * **Prashant Jain:** Lead of IT, Systems & Automation at EVM. Conducted the live product screenshare walkthrough on 22 September 2026.
* **Repository:** `InventoryIQ` (standalone repo inside `/Users/apple/Documents/evmzone/InventoryIQ`, excluded from parent `evmzone` git via `.gitignore`).
* **Current Commitment & Urgency:** Rishav and Shyam committed on the 22 Sep call to deliver a **working prototype within 2–3 days** (target: 24–25 September 2026).

---

## 2. The Core Problem (Why InventoryIQ Exists)

EVM currently manages procurement through an internal web app called **Procura** (.NET + ReactJS) and **CRM**.

### The Fundamental Flaw
* **Channel / General Trade (GT) Demand is Stable:** Goods sent to offline distributors and retail stores have predictable, quarterly buying patterns. Their current static minimum stock level formula works fine for offline.
* **E-Commerce Demand is Hyper-Volatile:** On Amazon India, Flipkart, and D2C, the Daily Run Rate ($\text{DRR}$) swings wildly. Baseline demand of 100 units/day surges to 120–200+ units/day during festival flash sales (Amazon Great Indian Festival, Flipkart Big Billion Days).
* **Current Procura Formula is Static:**
  $$\mathbf{Minimum\ Stock\ Level\ (MSL)} = \left(\frac{\mathbf{Monthly\ Selling\ Plan\ (MSP)}}{30\ \text{Days}}\right) \times \mathbf{Procurement\ Time\ (PT\ in\ Days)}$$
  $$\mathbf{Reorder\ Level\ (ROL)} = \max\Big(\mathbf{Minimum\ Stock\ Level\ (MSL)},\ \mathbf{Minimum\ Order\ Quantity\ (MOQ)}\Big)$$
  $$\mathbf{Reorder\ Quantity\ (ROQ)} = \mathbf{Open\ Purchase\ Orders} + \mathbf{In\text{-}Transit\ Stock} + \mathbf{Current\ Stock\ on\ Hand} - \mathbf{Reorder\ Level\ (ROL)}$$
  $$\mathbf{Action} = \mathbf{REORDER\ NOW} \quad \text{when} \quad (\mathbf{Current\ Stock} + \mathbf{Open\ PO} + \mathbf{In\text{-}Transit}) < \mathbf{Reorder\ Level\ (ROL)}$$
  * $\text{MSP}$ (Monthly Selling Plan) is typed in manually and rarely changes.
  * $\text{PT}$ (Procurement Time) is assumed to be a fixed 30 or 60 days, ignoring massive supplier delivery delays.
  * **Safety Stock ($\text{SS}$) is hardcoded to ZERO across all 717 SKUs.**
  * E-commerce has **no separate, dedicated MSL** (one flat number for both channel and e-com).
* **The Consequences:**
  1. **Stockouts during sales:** Losing Buy Box on Amazon, organic search rank collapse via A10 algorithm, ₹30–₹90/unit Flipkart dispatch failure penalties.
  2. **Trapped Working Capital:** Over **₹2.0 Crore** in surplus stock is currently sitting in single SKUs (e.g., `EVM-25/256GB` has 164K stock + 67.5K PO vs 100K MSL = 131K excess units).

---

## 3. What EVM Already Has vs What We Build

> ⚠️ **CRITICAL RULE FOR ALL AGENTS:**  
> **DO NOT rebuild what EVM already has.** EVM’s existing internal suite is mature. We are building an **intelligent decision & recommendation layer on top of their system**, NOT an ERP replacement.

| Domain | What EVM Already Has (DO NOT REBUILD) | What InventoryIQ Delivers (OUR VALUE ADD) |
|---|---|---|
| **Catalog** | 717 active SKUs with multi-level category hierarchy in Procura | ABC/XYZ classification, demand predictability scoring |
| **Inventory** | Real-time stock across 6 warehouses (Current, Allocated, Available) | Working capital risk analysis, dead stock detection, surplus alerting |
| **MSL** | Static formula based on manual MSP | **Dynamic DRR-driven MSL Engine** with sale event multipliers |
| **Procurement** | Full PO creation (FOB/EXW, FG/SFG, INR/USD), Tally sync | Multi-vendor price comparison, OTIF scoring, smart vendor allocation |
| **Shipments** | Logistics tracking (AWB/BL, BoE, CI, ETD, ETA, Customs status) | Real lead time variance tracking ($\sigma_{\text{LT}}$) replacing static 30-day PT |
| **Transfers** | WMS request/furnish manual workflow | Proximity-aware transfer suggestions (30-50km Mumbai cluster rebalancing) |
| **Integrations** | Deep Tally API sync (9 endpoints) & EasyEcom sync in Admin | Reads sales data from EasyEcom/Procura; outputs MSL recommendations to upcoming E-Com CRM tab |

---

## 4. Key Solution Chunks (File Directory Map)

The solution is strictly architected into 7 modular chunks. Every agent working in this repo must understand where each piece lives:

| File | Title & Scope | Priority Phase |
|---|---|:---:|
| [EVM-SYSTEM-LIMITATIONS-AND-SHORTCOMINGS.md](./EVM-SYSTEM-LIMITATIONS-AND-SHORTCOMINGS.md) | **12 prioritized system flaws** ranked from critical harm to minor inefficiencies | Baseline Spec |
| [CHUNK-1-DYNAMIC-MSL-ENGINE.md](./CHUNK-1-DYNAMIC-MSL-ENGINE.md) | **Dynamic MSL Calculation Engine:** Weighted rolling DRR (7d/14d/30d), event multipliers, channel split | **Prototype (P0)** |
| [CHUNK-2-DEMAND-INTELLIGENCE.md](./CHUNK-2-DEMAND-INTELLIGENCE.md) | **Demand & Safety Stock Layer:** Statistical SS formula, ABC/XYZ segmentation, seasonality, RTO return rate | **Prototype (P0)** |
| [CHUNK-3-WORKING-CAPITAL-INTELLIGENCE.md](./CHUNK-3-WORKING-CAPITAL-INTELLIGENCE.md) | **CFO / Capital Layer:** Surplus stock alerting (>30/60/90d), dead stock detector, MOQ trap analyzer | **Prototype (P0)** |
| [CHUNK-4-TRANSFER-INTELLIGENCE.md](./CHUNK-4-TRANSFER-INTELLIGENCE.md) | **Multi-Location Logistics:** Proximity matrix across 6 EVM warehouses, surplus-to-deficit rebalancing | **V2** |
| [CHUNK-5-INTEGRATION-LAYER.md](./CHUNK-5-INTEGRATION-LAYER.md) | **Integration Architecture:** EasyEcom API, Procura API, Tally data flows, CSV fallback ingestion | **V1** |
| [CHUNK-6-DASHBOARD-AND-ALERTS.md](./CHUNK-6-DASHBOARD-AND-ALERTS.md) | **UI/UX & Workflows:** Executive health overview, SKU deep dive, daily WhatsApp/Email digest, approval flow | **Prototype (P0)** |
| [CHUNK-7-VENDOR-INTELLIGENCE.md](./CHUNK-7-VENDOR-INTELLIGENCE.md) | **Procurement Optimization:** Multi-vendor rate cards ($11.99 vs $13.30), OTIF vendor scorecards, concentration risk | **V1** |

### Historical & Foundation Docs (Preserve Integrity)
* [MEETING-SUMMARY-SCREENSHARE.md](./MEETING-SUMMARY-SCREENSHARE.md) — 22 Sep 2026 meeting summary with Prashant.
* [MEETING-TRANSCRIPT-SCREENSHARE.md](./MEETING-TRANSCRIPT-SCREENSHARE.md) — Verbatim audio transcript from the screenshare.
* [meeting_images/](./meeting_images/) — 25 PNG screenshots of EVM's live Procura, CRM, POs, and Tally screens.
* [UNDERSTANDING.md](./UNDERSTANDING.md) — Full operational profile of EVM Zone.
* [PLAN.md](./PLAN.md) — Original full-scale architecture and DB schema.
* [EVM-PROPOSAL-V1.md](./EVM-PROPOSAL-V1.md) — Client-facing proposal.
* [QUESTIONNAIRE-FOR-PRASHANT.md](./QUESTIONNAIRE-FOR-PRASHANT.md) — Initial discovery questionnaire.
* [README.md](./README.md) — Repository master index.
* [CHECKPOINTS.md](./CHECKPOINTS.md) — Live state tracking & multi-agent concurrency matrix.

---

## 5. Parallel Execution & Multi-Agent Checkpoint Protocol

> ⚡ **CRITICAL PROTOCOL FOR MULTI-AGENT / CONCURRENT DEVELOPMENT:**  
> Rishav and Shyam (and their respective AI agents) frequently work on different chunks in parallel.  
> **Scenario:** Rishav + Agent is building **Chunk 2** (Demand Intelligence). Simultaneously, Shyam + Agent is building **Chunk 3** (Working Capital Intelligence).

### The Concurrency Rules for Agents:
1. **Consult [CHECKPOINTS.md](./CHECKPOINTS.md) on Every Session Start:**
   * `CHECKPOINTS.md` is the single source of truth for execution state.
   * Check what is `COMPLETED`, what is `IN_PROGRESS` (locked), and what is `PENDING`.
2. **Never Duplicate In-Progress Work:**
   * If another agent/engineer has marked a chunk `IN_PROGRESS`, do not write competing code.
3. **Fast Verification & Skipping Ahead:**
   * When you finish your assigned chunk (e.g., Chunk 2), check `CHECKPOINTS.md`.
   * If the next logical chunk (e.g., Chunk 3) is ALREADY marked `COMPLETED` by your teammate:
     1. Inspect the deliverables listed in `CHECKPOINTS.md`.
     2. Run the quick verification command (e.g. `npx tsx scripts/verify-...`).
     3. Mark it `VERIFIED` in the matrix.
     4. **Immediately jump directly to Chunk 4, Chunk 5, or Chunk 6.** Do not re-implement or stall.
4. **Claiming (Locking) a Chunk:**
   * Before writing code, edit `CHECKPOINTS.md`: set status to `IN_PROGRESS`, specify your worker tag (e.g. `Rishav + Agent`), and commit.
5. **Signing Off:**
   * When finished, run your verification script, record deliverables in `CHECKPOINTS.md`, mark as `COMPLETED`, and push.

---

## 6. Technical Stack & Infrastructure Decisions

* **Cloud Infrastructure:** **Amazon Web Services (AWS)** — Rishav has active AWS promotional credits.
  * **Database:** AWS RDS PostgreSQL (stores time-series sales, DRR records, recommendations, audit logs).
  * **Caching & Queue:** AWS ElastiCache Redis + BullMQ (scheduled daily DRR calculation runs at 6:00 AM IST).
  * **Compute / API:** AWS App Runner or EC2 (Fastify + TypeScript backend).
  * **Storage & Frontend Hosting:** AWS S3 + CloudFront CDN (React + Vite SPA).
  * **Alerts:** AWS SES (transactional emails) + WhatsApp Cloud API.
* **Operating Principle:** **V1 is strictly RECOMMEND-ONLY.** Human-in-the-loop approval workflow; no automatic execution of POs or live MSL changes in EVM's system without Prashant's sign-off.

---

## 6. Prohibited Actions & Strict Guardrails for Agents

1. **DO NOT delete or truncate existing chunk files** (`CHUNK-1` to `CHUNK-7`), `UNDERSTANDING.md`, or `PLAN.md`.
2. **DO NOT assume EVM is an early-stage startup without software.** They run an enterprise-scale operation with 360+ purchase orders, international freight tracking, serial-level scanning, and live Tally ERP integration.
3. **DO NOT propose replacing their ERP, WMS, or Tally.** InventoryIQ is an **intelligence & recommendation plug-in**.
4. **ALWAYS use GitHub-style Markdown links** with file scheme (`[file.md](file:///Users/apple/Documents/evmzone/InventoryIQ/file.md)`) when referencing code or documents in responses.
5. **DO NOT execute live background commands in parent directory (`/Users/apple/Documents/evmzone`)** that modify the sibling `PriceWatch` project unless explicitly instructed. Keep all operations within `InventoryIQ/`.
