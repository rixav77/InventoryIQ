# Questions for Prashant — InventoryIQ Setup

Hi Prashant,

To build the MSL / Inventory automation system tailored to EVM's workflow, we need clarity on a few things. These are kept short — just enough for us to get started on the right track.

---

## A. Inventory & Warehouses

**1.** How many warehouses/stock locations does EVM manage? (e.g., just Vasai East, or are there regional ones too?)

**2.** For Amazon & Flipkart — does EVM send stock to their warehouses (FBA / Flipkart Assured)? If yes, is that stock tracked in your internal system or only on the marketplace dashboards?

**3.** Does e-commerce (Amazon, Flipkart, own site) have its own **separate MSL** from general/wholesale stock? Or is it one combined MSL per SKU?

---

## B. Current Process & Systems

**4.** The ReactJS + .NET internal app — what does it primarily handle? (inventory tracking / order management / reporting / all of these?)

**5.** What data lives in **Google Sheets** vs. the **internal app**? Roughly:
   - SKU/product master → Sheets or App?
   - Current stock levels → Sheets or App?
   - MSL values → Sheets or App?
   - Purchase orders → Sheets or App?

**6.** How are MSL values decided today? Fixed numbers per SKU, or do they change with seasons / demand?

---

## C. Purchase Orders & Pipeline

**7.** How do you currently track orders placed with vendors (POs)? Is there a system showing "X units ordered, expected by Y date" — or is it managed informally?

**8.** Do partial shipments happen? (e.g., ordered 1000, vendor ships 600 first, 400 later)

---

## D. Transfers

**9.** Does EVM do internal stock transfers between locations/channels today? If yes, how often — daily, weekly, or rarely?

---

## E. What We'll Need from EVM

To build a working first version quickly, it would really help if we could get:

**10.** A **sample data export** (even partial / anonymized is fine):
   - Product/SKU list with categories
   - Current stock snapshot (SKU × location × quantity)
   - MSL values
   - Recent purchase orders (last 2-3 months)
   - Vendor list with MOQ and lead time info

**11.** **View-only access** to:
   - The internal ReactJS/.NET app (so we understand the data model)
   - Relevant Google Sheets
   - Amazon Seller Central (for API feasibility check)

---

That's it! Just 11 questions. Once we have these answers + sample data, we can start building the first version of InventoryIQ tailored to EVM's actual workflow.

Looking forward to connecting, Prashant 🙌

— Team Axiom Labs
