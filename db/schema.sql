-- Wolvio Contract Execution Intelligence
-- Scalable Production Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONTRACTS TABLE: Master records for agreements
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id VARCHAR(100) UNIQUE NOT NULL, -- Commercial ID like 'WFA-LTSA-2019-001'
    customer_name VARCHAR(255) NOT NULL,
    site_location VARCHAR(255),
    pdf_storage_path TEXT,
    
    -- Processing status
    extraction_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    confidence_score NUMERIC(5, 2),
    
    -- Extracted Parameters (Full JSON Snapshot)
    parameters JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. INVOICES TABLE: Billing documents (Drafts or External)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id VARCHAR(100) UNIQUE NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Financials
    base_amount NUMERIC(15, 2) DEFAULT 0,
    variable_amount NUMERIC(15, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    
    -- Status & Metadata
    status VARCHAR(20) DEFAULT 'draft', -- draft, pending_approval, approved, posted, paid
    source VARCHAR(20) DEFAULT 'internal', -- internal (CEI generated), external (SAP import)
    
    -- Calculation Evidence
    calculation_evidence JSONB DEFAULT '{}'::jsonb,
    confidence_explanation TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. FINDINGS TABLE: Individual validation issues or availability alerts
CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    
    check_id VARCHAR(50) NOT NULL, -- e.g., 'WPI_ESCALATION', 'AVAILABILITY_LD'
    verdict VARCHAR(50) NOT NULL, -- CLEAN, GAP, OPPORTUNITY, LD_EXPOSURE
    
    expected_amount NUMERIC(15, 2) DEFAULT 0,
    actual_amount NUMERIC(15, 2) DEFAULT 0,
    gap_amount NUMERIC(15, 2) DEFAULT 0,
    
    formula TEXT,
    clause_reference VARCHAR(50),
    page_number INTEGER,
    evidence_used JSONB,
    
    plain_english_fc TEXT, -- Narrative for Finance Controller
    plain_english_it TEXT, -- Narrative for IT/Ops
    recommended_action TEXT,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, dismissed
    routed_to VARCHAR(50), -- FINANCE, OPERATIONS, IT
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. WPI_INDEX: Historical inflation data for escalations
CREATE TABLE IF NOT EXISTS wpi_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER UNIQUE NOT NULL,
    value NUMERIC(10, 4) NOT NULL,
    month VARCHAR(20) DEFAULT 'January',
    source VARCHAR(100) DEFAULT 'Office of Economic Adviser',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. AUDIT_LOG: Immutable record of every system and human action
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL, -- e.g., 'INVOICE_GENERATED', 'FINDING_APPROVED'
    contract_id UUID REFERENCES contracts(id),
    invoice_id UUID REFERENCES invoices(id),
    finding_id UUID REFERENCES findings(id),
    workflow_run_id UUID, -- For external workflow mapping
    
    actor VARCHAR(100) NOT NULL, -- SYSTEM, user_email, etc.
    action TEXT NOT NULL,
    
    old_value JSONB,
    new_value JSONB,
    
    clause_reference VARCHAR(50),
    formula TEXT,
    evidence_used JSONB,
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. APPROVALS TABLE: Human-in-the-loop decisions
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id),
    finding_id UUID REFERENCES findings(id),
    
    actor VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- FC, OPS_MANAGER, etc.
    action VARCHAR(20) NOT NULL, -- APPROVE, REJECT
    comments TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for massive scale
CREATE INDEX IF NOT EXISTS idx_contracts_cid ON contracts(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_findings_contract ON findings(contract_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_audit_contract ON audit_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_wpi_year ON wpi_index(year);
CREATE INDEX IF NOT EXISTS idx_params_jsonb ON contracts USING GIN (parameters);
