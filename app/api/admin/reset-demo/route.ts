import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('🌱 API-based Reset & Seed starting...')

    // 1. Ensure Schema exists (Self-healing environment)
    await sql`
      CREATE TABLE IF NOT EXISTS contracts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contract_id VARCHAR(100) UNIQUE NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          site_name VARCHAR(255),
          asset_location VARCHAR(255),
          site_location VARCHAR(255),
          contract_type VARCHAR(50),
          pdf_storage_path TEXT,
          extraction_status VARCHAR(20) DEFAULT 'pending',
          confidence_score NUMERIC(5, 2),
          extraction_quality_score NUMERIC(5, 2),
          parameters JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id VARCHAR(100) UNIQUE NOT NULL,
          contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          invoice_date DATE DEFAULT CURRENT_DATE,
          due_date DATE,
          base_amount NUMERIC(15, 2) DEFAULT 0,
          variable_amount NUMERIC(15, 2) DEFAULT 0,
          tax_amount NUMERIC(15, 2) DEFAULT 0,
          total_amount NUMERIC(15, 2) DEFAULT 0,
          currency VARCHAR(10) DEFAULT 'INR',
          status VARCHAR(20) DEFAULT 'draft',
          source VARCHAR(20) DEFAULT 'internal',
          calculation_evidence JSONB DEFAULT '{}'::jsonb,
          confidence_explanation TEXT,
          sap_reference_number VARCHAR(100),
          posting_comment TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS findings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
          invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
          check_id VARCHAR(50) NOT NULL,
          verdict VARCHAR(50) NOT NULL,
          severity VARCHAR(20) DEFAULT 'medium',
          financial_impact NUMERIC(15, 2) DEFAULT 0,
          expected_amount NUMERIC(15, 2) DEFAULT 0,
          actual_amount NUMERIC(15, 2) DEFAULT 0,
          gap_amount NUMERIC(15, 2) DEFAULT 0,
          formula TEXT,
          clause_reference VARCHAR(50),
          page_number INTEGER,
          evidence_used JSONB,
          plain_english_fc TEXT,
          plain_english_it TEXT,
          recommended_action TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          routed_to VARCHAR(50),
          assigned_role JSONB DEFAULT '[]'::jsonb,
          period_start DATE,
          period_end DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS wpi_index (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          year INTEGER NOT NULL,
          month VARCHAR(20) NOT NULL,
          value NUMERIC(10, 4) NOT NULL,
          source VARCHAR(100) DEFAULT 'Office of Economic Adviser',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(year, month)
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type VARCHAR(50) NOT NULL,
          contract_id UUID REFERENCES contracts(id),
          invoice_id UUID REFERENCES invoices(id),
          finding_id UUID REFERENCES findings(id),
          workflow_run_id UUID,
          actor VARCHAR(100) NOT NULL,
          role VARCHAR(50),
          action TEXT NOT NULL,
          old_value JSONB,
          new_value JSONB,
          clause_reference VARCHAR(50),
          formula TEXT,
          evidence_used JSONB,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS contract_parameters (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
          field_name VARCHAR(100) NOT NULL,
          value JSONB NOT NULL,
          confidence VARCHAR(20) DEFAULT 'medium',
          clause_reference VARCHAR(100),
          page_number INTEGER,
          is_manual_override BOOLEAN DEFAULT false,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    await sql`
      CREATE TABLE IF NOT EXISTS evidence_files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
          file_type VARCHAR(20) NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          storage_path TEXT,
          data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    // 2. Seed Alpha Contract
    const [contract] = await sql`
      INSERT INTO contracts (contract_id, customer_name, site_name, asset_location, contract_type, extraction_status, confidence_score, extraction_quality_score)
      VALUES (
        'WFA-LTSA-2019-001', 
        'Wind Farm Alpha', 
        'Rajasthan Site',
        'India',
        'LTSA',
        'completed', 
        98,
        95
      )
      ON CONFLICT (contract_id) DO UPDATE SET 
        customer_name = EXCLUDED.customer_name,
        confidence_score = EXCLUDED.confidence_score
      RETURNING *
    `;

    // 3. Seed WPI
    await sql`
      INSERT INTO wpi_index (year, month, value) 
      VALUES (2019, 'January', 158.8), (2025, 'January', 163.4) 
      ON CONFLICT (year, month) DO UPDATE SET value = EXCLUDED.value
    `;

    // 4. Clean existing dependencies
    await sql`DELETE FROM audit_log WHERE contract_id = ${contract.id}`;
    await sql`DELETE FROM findings WHERE contract_id = ${contract.id}`;
    await sql`DELETE FROM contract_parameters WHERE contract_id = ${contract.id}`;
    await sql`DELETE FROM evidence_files WHERE contract_id = ${contract.id}`;
    await sql`DELETE FROM invoices WHERE contract_id = ${contract.id}`;

    // 5. Create "Current" Invoice (Historical for Trend)
    const [prevInvoice] = await sql`
      INSERT INTO invoices (
        invoice_id, contract_id, period_start, period_end, 
        base_amount, variable_amount, tax_amount, total_amount,
        status, source
      ) VALUES (
        'INV-WFA-2025-03', ${contract.id}, '2025-03-01', '2025-03-31',
        12000000, 1350000, 2403000, 15753000,
        'approved', 'internal'
      )
      RETURNING *
    `;

    // 6. Create Current Scenario Data
    const [invoice] = await sql`
      INSERT INTO invoices (
        invoice_id, contract_id, period_start, period_end, 
        base_amount, variable_amount, tax_amount, total_amount,
        status, source, confidence_explanation
      ) VALUES (
        'INV-WFA-2025-04', ${contract.id}, '2025-04-01', '2025-04-30',
        12347607, 1401120, 2474771, 16223498,
        'draft', 'internal',
        'Invoice draft is validated and ready for approval. Variance explained by WPI escalation and generation increase.'
      )
      RETURNING *
    `;

    // 7. Create Findings
    await sql`
      INSERT INTO findings (
        contract_id, invoice_id, check_id, verdict, severity, financial_impact, 
        expected_amount, actual_amount, status, routed_to, assigned_role,
        recommended_action, period_start, period_end,
        plain_english_fc, plain_english_it
      ) VALUES (
        ${contract.id}, ${invoice.id}, 'LD_EXPOSURE', 'LD_EXPOSURE', 'high', 2520000,
        96.0, 92.5, 'open', 'OPERATIONS_MANAGER', '["OPERATIONS_MANAGER", "FINANCE_CONTROLLER"]',
        'Verify SLDC curtailment certificate to potentially offset LDs.',
        '2025-04-01', '2025-04-30',
        'Availability was 92.5%, below the 96% guaranteed threshold. This triggers an LD exposure of ₹25.2L.',
        'Math: (96% - 92.5%) * Contractual Rate * Annualized Hours. Logic executed against Digital Twin LD clause.'
      )
    `;

    // 8. Create Contract Parameters
    const paramsToSeed = [
      { name: 'base_monthly_fee', val: 12000000, conf: 'high', ref: 'Clause 4.1' },
      { name: 'wpi_escalation', val: { base_year: 2019, cap_pct: 5, floor_pct: 0 }, conf: 'high', ref: 'Clause 4.2' },
      { name: 'variable_rate', val: { rate_per_kwh: 0.042 }, conf: 'high', ref: 'Clause 4.3' },
      { name: 'availability_guarantee', val: 96.0, conf: 'high', ref: 'Clause 7.1' },
      { name: 'availability_methodology', val: 'Time-based', conf: 'medium', ref: 'Clause 7.2' },
      { name: 'ld_formula', val: 'Gap * Rate', conf: 'high', ref: 'Clause 8.1' },
      { name: 'gst_treatment', val: { rate_pct: 18 }, conf: 'high', ref: 'Clause 6.2' },
      { name: 'payment_terms', val: { net_days: 30 }, conf: 'high', ref: 'Clause 9.1' }
    ];

    for (const p of paramsToSeed) {
      await sql`
        INSERT INTO contract_parameters (contract_id, field_name, value, confidence, clause_reference)
        VALUES (${contract.id}, ${p.name}, ${p.val}, ${p.conf}, ${p.ref})
      `;
    }

    // 9. Create Evidence Files
    await sql`
      INSERT INTO evidence_files (contract_id, file_type, period_start, period_end, data)
      VALUES (
        ${contract.id}, 'JMR', '2025-04-01', '2025-04-30', 
        ${JSON.stringify({ net_kwh: 33360000, solar_insolation: 5.8 })}
      )
    `;

    // 10. Create Audit Logs
    await sql`
      INSERT INTO audit_log (event_type, contract_id, actor, role, action, timestamp)
      VALUES 
        ('CONTRACT_EXTRACTED', ${contract.id}, 'SYSTEM', 'AI', 'Digital Twin generated from PDF Source (LTSA-2019-001)', NOW() - INTERVAL '2 days'),
        ('WPI_UPDATED', ${contract.id}, 'SYSTEM', 'AI', 'WPI Index synchronized with Office of Economic Adviser', NOW() - INTERVAL '1 day'),
        ('INVOICE_VALIDATED', ${contract.id}, 'SYSTEM', 'AI', 'Validation complete for INV-WFA-2025-04. LD Exposure detected.', NOW() - INTERVAL '2 hours')
    `;

    return NextResponse.json({ success: true, message: 'Demo data reset successfully' })
  } catch (err: any) {
    console.error('Reset API Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
