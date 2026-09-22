# InventoryIQ — Intelligent Dynamic MSL & Capital Optimizer

> **Built for EVM Zone / Hundia Info Solutions Pvt. Ltd.**  
> **Engineering Leadership:** Rishav Kumar & Shyam — Co-Founders at **Axiom Labs** (`axiomlabs.live`)  
> **Target Prototype Delivery:** 24–25 September 2026 (2–3 days from 22 Sep call)

---

## 🤖 Mandatory Notice for All AI Agents & Subagents
> 🚨 **QUEUE PROTOCOL:** If you are an AI assistant, subagent, or fresh agent session entering this workspace, **you MUST thoroughly review [AGENTS.md](./AGENTS.md) and the 7 chunk specifications before taking action.** Do not make generic e-commerce assumptions.
* **👉 [AGENTS.md](./AGENTS.md)** — Master onboarding, rules, and system ground truth.
* **👉 [CONTEXT.md](./CONTEXT.md)** — Fast project summary pointer.
* **👉 [EVM-SYSTEM-LIMITATIONS-AND-SHORTCOMINGS.md](./EVM-SYSTEM-LIMITATIONS-AND-SHORTCOMINGS.md)** — 12 system shortcomings ranked by business harm.

---

## 📋 Solution Chunks

| # | Chunk | File | Priority | Scope |
|---|---|---|---|---|
| 1 | 🧠 [Dynamic MSL Engine](./CHUNK-1-DYNAMIC-MSL-ENGINE.md) | Core deliverable | **Prototype** | Dynamic DRR-based MSL formula, event overlays, per-channel MSL |
| 2 | 📊 [Demand Intelligence](./CHUNK-2-DEMAND-INTELLIGENCE.md) | Data layer | **Prototype** | DRR tracking, ABC-XYZ classification, safety stock, seasonality |
| 3 | 💰 [Working Capital Intelligence](./CHUNK-3-WORKING-CAPITAL-INTELLIGENCE.md) | Finance layer | **Prototype** | Overstocking detection, capital-at-risk, dead stock, MOQ traps |
| 4 | 🚚 [Transfer Intelligence](./CHUNK-4-TRANSFER-INTELLIGENCE.md) | Logistics layer | **V2** | Cross-warehouse surplus/deficit, proximity-based transfers |
| 5 | 🔗 [Integration Layer](./CHUNK-5-INTEGRATION-LAYER.md) | Connectivity | **V1** | EasyEcom, Procura API, Tally, marketplace APIs |
| 6 | 📱 [Dashboard & Alerts](./CHUNK-6-DASHBOARD-AND-ALERTS.md) | UI/UX layer | **Prototype** | Health overview, SKU deep dive, notifications, approval flow |
| 7 | 🏭 [Vendor Intelligence](./CHUNK-7-VENDOR-INTELLIGENCE.md) | Procurement layer | **V1** | OTIF scoring, price tracking, vendor concentration risk |

## 📎 Meeting & Foundation Artifacts

| File | Description |
|---|---|
| [Meeting Summary](./MEETING-SUMMARY-SCREENSHARE.md) | Key takeaways from Prashant screenshare (22 Sep 2026) |
| [Meeting Transcript](./MEETING-TRANSCRIPT-SCREENSHARE.md) | Full transcript of the screenshare call |
| [PLAN.md](./PLAN.md) | Master implementation plan and architecture |
| [UNDERSTANDING.md](./UNDERSTANDING.md) | Comprehensive EVM business & operational profile |
| [EVM-PROPOSAL-V1.md](./EVM-PROPOSAL-V1.md) | Client proposal document |
| [QUESTIONNAIRE-FOR-PRASHANT.md](./QUESTIONNAIRE-FOR-PRASHANT.md) | Original questionnaire document |
| [meeting_images/](./meeting_images/) | 25 screenshots from Prashant's screen (Procura, CRM, POs, MSL planning, etc.) |

## 🔬 Analysis

| File | Description |
|---|---|
| [.analysis/screenshots-batch2.md](./.analysis/screenshots-batch2.md) | Detailed analysis of 15 screenshots (batch 2) |

---

## 🗓️ Timeline

| Phase | Target | Deliverables |
|---|---|---|
| **Prototype** | 24-25 Sep 2026 (2-3 days) | Chunks 1+2+3+6 with mock/CSV data. Show dynamic MSL vs static MSL side-by-side |
| **V1** | Week 2-4 (Oct 2026) | Chunks 5+7. Real API integration, vendor intelligence, live data |
| **V2** | Week 5+ (Nov 2026) | Chunk 4. Multi-location transfers, marketplace API, advanced forecasting |

---

## 🎯 Core Pain Point

> **E-commerce MSL is volatile (DRR swings 100→200 during sales). Channel MSL is stable (quarterly). EVM needs a system that dynamically adjusts e-com MSL based on demand signals, sale events, and DRR trends — without overstocking and locking capital.**

## ✅ What We're NOT Building

EVM already has: SKU master, stock tracking, PO management, shipments, vendor management, Tally sync, warehouse transfers (WMS), serial tracking, EasyEcom sync. **We don't rebuild any of this.**
