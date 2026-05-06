import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { neon } from '@neondatabase/serverless'

// Load .env.local before anything else
const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const val = trimmed.slice(eqIndex + 1).trim()
    if (key && !(key in process.env)) process.env[key] = val
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌ DATABASE_URL is not set — ensure .env.local exists with DATABASE_URL')
  process.exit(1)
}

const sql = neon(url)

const SCHEMA = `
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS workflow_runs CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS findings CASCADE;
DROP TABLE IF EXISTS validation_runs CASCADE;
DROP TABLE IF EXISTS historical_invoices CASCADE;
DROP TABLE IF EXISTS evidence_files CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS contract_parameters CASCADE;
DROP TABLE IF EXISTS contract_clauses CASCADE;
DROP TABLE IF EXISTS generation_data CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS wpi_index CASCADE;

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  site_name TEXT,
  asset_location TEXT,
  contract_type TEXT DEFAULT 'LTSA',
  period_start DATE,
  period_end DATE,
  pdf_path TEXT,
  raw_text TEXT,
  parameters JSONB,
  extraction_status TEXT DEFAULT 'pending',
  extraction_quality_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  field_name TEXT NOT NULL,
  value JSONB,
  clause_reference TEXT,
  page_number INTEGER,
  source_text TEXT,
  confidence TEXT CHECK (confidence IN ('high','medium','low','manual','not_found')),
  is_manual_override BOOLEAN DEFAULT false,
  overridden_at TIMESTAMPTZ,
  overridden_by TEXT
);

CREATE TABLE IF NOT EXISTS historical_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  invoice_id TEXT UNIQUE NOT NULL,
  period_start DATE,
  period_end DATE,
  base_fee NUMERIC,
  escalation_amount NUMERIC,
  variable_amount NUMERIC,
  subtotal NUMERIC,
  gst_amount NUMERIC,
  total NUMERIC,
  invoice_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'paid',
  line_items JSONB
);

CREATE TABLE IF NOT EXISTS evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  period_start DATE,
  period_end DATE,
  evidence_type TEXT,
  status TEXT DEFAULT 'uploaded',
  data JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT UNIQUE NOT NULL,
  contract_id UUID REFERENCES contracts(id),
  period_start DATE,
  period_end DATE,
  line_items JSONB,
  base_fee NUMERIC,
  escalation_amount NUMERIC,
  variable_amount NUMERIC,
  subtotal NUMERIC,
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC,
  total NUMERIC,
  invoice_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft',
  confidence_score TEXT,
  confidence_report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  invoice_id UUID REFERENCES invoices(id),
  run_type TEXT,
  checks JSONB,
  confidence_score TEXT,
  overall_status TEXT,
  run_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES validation_runs(id),
  contract_id UUID REFERENCES contracts(id),
  check_id TEXT,
  verdict TEXT,
  expected_amount NUMERIC,
  actual_amount NUMERIC,
  gap_amount NUMERIC,
  formula TEXT,
  clause_reference TEXT,
  page_number INTEGER,
  evidence_used JSONB,
  plain_english_fc TEXT,
  plain_english_it TEXT,
  recommended_action TEXT,
  status TEXT DEFAULT 'pending',
  routed_to TEXT[]
);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES findings(id),
  invoice_id UUID REFERENCES invoices(id),
  actor TEXT,
  role TEXT,
  action TEXT,
  comments TEXT,
  approved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event TEXT,
  contract_id UUID REFERENCES contracts(id),
  invoice_id UUID REFERENCES invoices(id),
  finding_id UUID REFERENCES findings(id),
  status TEXT,
  steps JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  contract_id UUID REFERENCES contracts(id),
  invoice_id UUID REFERENCES invoices(id),
  finding_id UUID REFERENCES findings(id),
  workflow_run_id UUID REFERENCES workflow_runs(id),
  actor TEXT,
  action TEXT,
  old_value JSONB,
  new_value JSONB,
  clause_reference TEXT,
  formula TEXT,
  evidence_used JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  amount_expected NUMERIC,
  amount_received NUMERIC,
  due_date DATE,
  received_date DATE,
  status TEXT DEFAULT 'pending',
  deduction_reason TEXT,
  interest_claimable NUMERIC
);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  trigger_date DATE,
  reminder_type TEXT,
  status TEXT DEFAULT 'scheduled',
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wpi_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month TEXT NOT NULL DEFAULT 'January',
  value NUMERIC NOT NULL,
  source TEXT DEFAULT 'Office of the Economic Adviser, Ministry of Commerce',
  UNIQUE(year, month)
);
`

async function migrate() {
  console.log('🚀 Running Neon Schema Enforcement...')
  try {
    // Neon neon() doesn't support multiple statements in one call easily like unsafe() in postgres.js
    // So we split by semicolon and filter empty lines
    const statements = SCHEMA.split(';').filter(s => s.trim())
    for (const statement of statements) {
      await (sql as any).query(statement)
      console.log(`  ✓ executed statement`)
    }
    console.log('\n✅ All migrations complete.')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }
}

migrate()
