import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    env.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) process.env[match[1]] = (match[2] || '').replace(/\"/g, '');
    });
  }
}

loadEnv();

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  console.log('🌱 Seeding locked demo data (Clean & Rebuild)...');

  try {
    // 1. Upsert Alpha Contract
    const [contract] = await sql`
      INSERT INTO contracts (contract_id, customer_name, site_name, asset_location, contract_type, extraction_status, extraction_quality_score, parameters)
      VALUES (
        'WFA-LTSA-2019-001', 
        'Wind Farm Alpha', 
        'Rajasthan Site',
        'India',
        'LTSA',
        'completed', 
        95,
        ${JSON.stringify({
          base_monthly_fee: { value: 12000000 },
          wpi_escalation: { value: { base_year: 2019, cap_pct: 5, floor_pct: 0 } },
          variable_rate: { value: { rate_per_kwh: 1.2 } },
          gst_treatment: { value: { rate_pct: 18 } },
          payment_terms: { value: { net_days: 45 } }
        })}
      )
      ON CONFLICT (contract_id) DO UPDATE SET 
        parameters = EXCLUDED.parameters,
        customer_name = EXCLUDED.customer_name
      RETURNING *
    `;

    // 2. Seed WPI
    await sql`
      INSERT INTO wpi_index (year, month, value) 
      VALUES (2019, 'January', 120.0), (2025, 'January', 123.476) 
      ON CONFLICT (year, month) DO UPDATE SET value = EXCLUDED.value
    `;

    // 3. Clean existing dependencies for this contract
    await sql`DELETE FROM approvals WHERE invoice_id IN (SELECT id FROM invoices WHERE contract_id = ${contract.id})`;
    await sql`DELETE FROM audit_log WHERE contract_id = ${contract.id}`;
    await sql`DELETE FROM findings WHERE contract_id = ${contract.id}`;
    await sql`DELETE FROM invoices WHERE contract_id = ${contract.id}`;
    console.log('✅ Existing contract data cleaned');

    // 4. Create "Previous" Invoice (INV-001) for variance comparison
    await sql`
      INSERT INTO invoices (
        invoice_id, contract_id, period_start, period_end, 
        base_amount, variable_amount, tax_amount, total_amount,
        status, source
      ) VALUES (
        'INV-WFA-2025-03', ${contract.id}, '2025-03-01', '2025-03-31',
        12000000, 1000000, 2340000, 15340000,
        'approved', 'internal'
      )
    `;

    // 5. Create "Current" Invoice (INV-002) with LOCKED NUMBERS
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

    // 6. Clean and seed LD Finding
    await sql`DELETE FROM findings WHERE contract_id = ${contract.id}`;
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

    // 7. Seed Explicit Contract Parameters
    await sql`DELETE FROM contract_parameters WHERE contract_id = ${contract.id}`;
    const paramsToSeed = [
      { name: 'base_monthly_fee', val: 12000000, conf: 'high', ref: 'Clause 4.1' },
      { name: 'wpi_escalation', val: { base_year: 2019, cap_pct: 5 }, conf: 'high', ref: 'Clause 4.2' },
      { name: 'variable_rate', val: { rate_per_kwh: 1.2 }, conf: 'high', ref: 'Clause 4.3' },
      { name: 'availability_guarantee', val: 96.0, conf: 'high', ref: 'Clause 7.1' },
      { name: 'availability_methodology', val: 'Time-based', conf: 'medium', ref: 'Clause 7.2' },
      { name: 'ld_formula', val: 'Gap * Rate', conf: 'high', ref: 'Clause 8.1' }
    ];

    for (const p of paramsToSeed) {
      await sql`
        INSERT INTO contract_parameters (contract_id, field_name, value, confidence, clause_reference)
        VALUES (${contract.id}, ${p.name}, ${p.val}, ${p.conf}, ${p.ref})
      `;
    }

    // 8. Seed Audit Log for Demo Narrative
    await sql`
      INSERT INTO audit_log (event_type, contract_id, actor, role, action, timestamp)
      VALUES 
        ('CONTRACT_EXTRACTED', ${contract.id}, 'SYSTEM', 'AI', 'Digital Twin generated from PDF Source (LTSA-2019-001)', NOW() - INTERVAL '2 days'),
        ('WPI_UPDATED', ${contract.id}, 'SYSTEM', 'AI', 'WPI Index synchronized with Office of Economic Adviser', NOW() - INTERVAL '1 day'),
        ('INVOICE_VALIDATED', ${contract.id}, 'SYSTEM', 'AI', 'Validation complete for INV-WFA-2025-04. LD Exposure detected.', NOW() - INTERVAL '2 hours')
    `;

    console.log('✅ Locked demo data seeded successfully');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

seed();
