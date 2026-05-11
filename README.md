# Wolvio CEI — Contract Execution Intelligence

## Product Status

Wolvio CEI (Contract Execution Intelligence) is a Phase 1 working model designed as a precision control layer for renewable energy O&M contract execution.

It connects contract clauses, operational evidence, SAP billing data, approval decisions, and audit records into one controlled workflow. The goal is to reduce manual invoice validation, improve LD visibility, and produce SAP-entry-ready approval packets without writing back to SAP in Phase 1.

**Core principle:** AI reads. Math validates. Humans approve. Workflow executes inside CEI. Audit log records every decision. SAP remains the system of record.

---

## 🚀 DEMO RUNBOOK

### 1. Environment Readiness

Ensure the following environment variables are set in your `.env.local` file:

```env
# AI Extraction Engine (used for variance explanation generation only)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Neon Postgres Database
DATABASE_URL=postgresql://...

# Optional: n8n Webhook for approval notifications
N8N_WEBHOOK_URL_INVOICE_APPROVED=...
N8N_WEBHOOK_URL_FINDING_APPROVED=...
```

### 2. Start the Server

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`

### 3. Demo Flow

Navigate the following path for the full end-to-end demonstration:

**Dashboard → Contract Digital Twin → Invoice Draft Builder → Invoice Confidence Report → Approval Hub → Availability / LD Review → Approval Packet → Audit Trail**

### 4. Demo Pilot Controls

Use the **Demo Control Panel** (bottom-right overlay) to:
- Switch active persona (Finance Controller, Ops Manager, Legal, IT Observer, CEI Admin)
- Reset demo data to Day 1 state (CEI Admin only)

### 5. Locked Demo Numbers

These values are deterministic and must not change:

| Line Item | Value |
| :--- | :--- |
| Base Fee (Escalated) | ₹1,23,47,607 |
| WPI Escalation Amount | ₹3,47,607 |
| Variable Generation Charge | ₹14,01,120 |
| Total Invoice (incl. GST) | ₹1,62,23,498 |
| Unexplained Variance | ₹0 |
| Contractual Availability | 92.5% |
| LD Exposure | ₹25,20,000 |

---

## Technical Architecture

- **Framework:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Database:** Neon Serverless Postgres
- **Math Engine:** Deterministic TypeScript engine — zero AI involvement in financial calculations
- **AI Usage:** Claude API used only for plain-English variance explanation generation
- **PDF Generation:** PDFKit for SAP-entry-ready approval packets
- **Role-Based Access:** Demo-grade RBAC with 6 personas

## Phase 1 Boundary

- CEI does **not** post invoices into live SAP
- CEI does **not** modify SAP, SCADA, SharePoint, or contract repository data
- CEI does **not** send external customer communications automatically
- CEI prepares SAP-entry-ready approval packets for the client's Finance team to post manually
- Final financial execution remains with the client's Finance team in SAP

## Test Harness

```bash
node scripts/preflight.js
```

This validates the deterministic engine, database state, and locked demo numbers before any demonstration.
