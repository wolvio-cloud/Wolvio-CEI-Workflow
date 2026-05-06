import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

// Load .env.local
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

const sql = neon(process.env.DATABASE_URL!)

async function seed() {
  console.log('🌱 Seeding Wolvio CEI Demo Data...')

  // 1. Contract
  const contractId = 'WFA-LTSA-2019-001'
  const contractData = {
    contract_id: contractId,
    customer_name: "ReNew Sustainable Energy Private Limited",
    site_name: "Wind Farm Alpha",
    asset_location: "Jaisalmer, Rajasthan",
    contract_type: "LTSA",
    period_start: "2019-04-01",
    period_end: "2034-03-31",
    extraction_status: "completed",
    extraction_quality_score: 98,
    parameters: {
      "base_monthly_fee": {
        "value": 12000000,
        "clause_reference": "Clause 4.1",
        "page_number": 8,
        "source_text": "The Base Monthly Fee payable by the Customer to the Service Provider shall be Rupees One Crore Twenty Lakhs (₹1,20,00,000) per month.",
        "confidence": "high"
      },
      "base_annual_fee": {
        "value": 144000000,
        "clause_reference": "Clause 4.1",
        "page_number": 8,
        "source_text": "The Base Annual Fee shall be Rupees Fourteen Crores Forty Lakhs (₹14,40,00,000) per annum.",
        "confidence": "high"
      },
      "wpi_escalation": {
        "value": {
          "type": "WPI",
          "effective_date": "April 1",
          "base_month": "January",
          "base_year": 2019,
          "base_wpi": 141.3,
          "cap_pct": 8,
          "floor_pct": 0
        },
        "clause_reference": "Clause 5.2",
        "page_number": 14,
        "source_text": "The Base Monthly Fee shall be escalated annually on April 1 of each contract year. Each annual escalation shall be calculated using the January WPI of the current contract year compared against the January WPI of the immediately preceding contract year, as published by the Office of the Economic Adviser, Ministry of Commerce and Industry, Government of India. The escalation in any single year shall not exceed 8% nor result in a reduction of the Base Monthly Fee.",
        "confidence": "high"
      },
      "variable_rate": {
        "value": { "rate_per_kwh": 0.042, "currency": "INR" },
        "clause_reference": "Clause 6.1",
        "page_number": 18,
        "source_text": "In addition to the Base Monthly Fee, the Customer shall pay the Service Provider a variable charge of Rupees 0.042 (Paise Four and Two-Tenths only) per kWh of net energy generated as recorded in the Joint Meter Reading. For the avoidance of doubt, generation shall be measured in kilowatt-hours (kWh).",
        "confidence": "high"
      },
      "gst_treatment": {
        "value": { "rate_pct": 18, "type": "IGST" },
        "clause_reference": "Clause 6.2",
        "page_number": 19,
        "source_text": "All fees and charges under this Agreement are exclusive of Goods and Services Tax. IGST at the applicable rate, currently 18%, shall be charged separately on all invoices.",
        "confidence": "high"
      },
      "payment_terms": {
        "value": { "net_days": 45 },
        "clause_reference": "Clause 10.1",
        "page_number": 35,
        "source_text": "All invoices raised under this Agreement shall be payable within forty-five (45) days of the invoice date.",
        "confidence": "high"
      },
      "late_payment_interest": {
        "value": { "rate": "SBI_BASE_PLUS_2", "description": "SBI base rate + 2% per annum" },
        "clause_reference": "Clause 10.3",
        "page_number": 36,
        "source_text": "Any invoice not paid within the payment period shall attract interest at the rate of the State Bank of India base lending rate plus two percent (2%) per annum from the due date until actual payment.",
        "confidence": "high"
      },
      "availability_guarantee": {
        "value": { "percentage": 96.0 },
        "clause_reference": "Clause 7.1",
        "page_number": 22,
        "source_text": "The Service Provider shall ensure a minimum Contractual Availability of 96.0% (ninety-six percent) of the Wind Turbine Generators during each contract year, calculated on a Time-Based Availability basis.",
        "confidence": "high"
      },
      "availability_methodology": {
        "value": {
          "type": "Time-Based Availability",
          "formula": "(Total contract hours - Unavailable hours due to turbine fault) / (Total contract hours - Excluded hours) × 100"
        },
        "clause_reference": "Clause 7.1",
        "page_number": 22,
        "source_text": "Contractual Availability shall be calculated as the ratio of (a) total contract hours less hours during which turbines are unavailable due to Service Provider fault, to (b) total contract hours less Excluded Hours, expressed as a percentage.",
        "confidence": "high"
      },
      "curtailment_exclusion": {
        "value": {
          "authority": "SLDC_POSOCO",
          "description": "Grid curtailment hours per SLDC or POSOCO order are excluded from both numerator and denominator"
        },
        "clause_reference": "Clause 7.3",
        "page_number": 24,
        "source_text": "Hours during which the Wind Turbine Generators are curtailed pursuant to a valid order of the State Load Despatch Centre (SLDC) or the Power System Operation Corporation (POSOCO) shall be treated as Excluded Hours and removed from both the numerator and denominator of the Contractual Availability calculation.",
        "confidence": "high"
      },
      "planned_maintenance_exclusion": {
        "value": { "notice_hours": 72 },
        "clause_reference": "Clause 7.4",
        "page_number": 25,
        "source_text": "Planned maintenance outages agreed between the parties with a minimum of seventy-two (72) hours advance written notice shall constitute Excluded Hours.",
        "confidence": "high"
      },
      "ld_formula": {
        "value": {
          "rate_per_pp": 0.005,
          "cap_pct": 15,
          "base": "annual_fee"
        },
        "clause_reference": "Clause 8.2",
        "page_number": 27,
        "source_text": "For each percentage point by which Contractual Availability falls below the guaranteed level, the Service Provider shall pay Liquidated Damages equal to 0.5% of the Base Annual Fee, subject to a maximum of 15% of the Base Annual Fee in any contract year.",
        "confidence": "high"
      },
      "bonus_formula": {
        "value": {
          "threshold_pct": 98.0,
          "rate_per_pp": 0.003,
          "cap_pct": 5
        },
        "clause_reference": "Clause 9.1",
        "page_number": 31,
        "source_text": "If Contractual Availability exceeds 98.0% in any contract year, the Customer shall pay a Performance Bonus of 0.3% of the Base Annual Fee for each percentage point above 98.0%, subject to a maximum bonus of 5% of the Base Annual Fee.",
        "confidence": "high"
      },
      "force_majeure": {
        "value": {
          "events": ["cyclone", "flood", "lightning"],
          "treatment": "excluded from availability if qualifying event and notice requirements are met"
        },
        "clause_reference": "Clause 18",
        "page_number": 42,
        "source_text": "Force Majeure Events shall include cyclone, flood, lightning and other events beyond the reasonable control of the affected Party, subject to timely notice and mitigation obligations.",
        "confidence": "high"
      },
      "contract_period": {
        "value": {
          "start_date": "2019-04-01",
          "end_date": "2034-03-31",
          "term_years": 15
        },
        "clause_reference": "Clause 3.1",
        "page_number": 6,
        "source_text": "This Agreement shall commence on April 1, 2019 and shall remain in force until March 31, 2034, unless terminated earlier in accordance with this Agreement.",
        "confidence": "high"
      }
    }
  }

  const { id: dbId } = (await sql`
    INSERT INTO contracts (
      contract_id, customer_name, site_name, asset_location, contract_type, 
      period_start, period_end, extraction_status, extraction_quality_score, parameters
    ) VALUES (
      ${contractData.contract_id}, ${contractData.customer_name}, ${contractData.site_name}, 
      ${contractData.asset_location}, ${contractData.contract_type}, ${contractData.period_start}, 
      ${contractData.period_end}, ${contractData.extraction_status}, ${contractData.extraction_quality_score}, 
      ${JSON.stringify(contractData.parameters)}
    ) ON CONFLICT (contract_id) DO UPDATE SET parameters = EXCLUDED.parameters
    RETURNING id
  `)[0]

  // 2. Contract Parameters (Flat table)
  for (const [key, param] of Object.entries(contractData.parameters)) {
    const p = param as any
    await sql`
      INSERT INTO contract_parameters (
        contract_id, field_name, value, clause_reference, page_number, source_text, confidence
      ) VALUES (
        ${dbId}, ${key}, ${JSON.stringify(p.value)}, ${p.clause_reference}, ${p.page_number}, 
        ${p.source_text}, ${p.confidence}
      )
    `
  }

  // 3. WPI Index
  const wpiData = [
    { year: 2019, month: "January", value: 141.3 },
    { year: 2020, month: "January", value: 147.2 },
    { year: 2021, month: "January", value: 149.8 },
    { year: 2022, month: "January", value: 154.1 },
    { year: 2023, month: "January", value: 156.4 },
    { year: 2024, month: "January", value: 158.8 },
    { year: 2025, month: "January", value: 163.4 }
  ]
  for (const w of wpiData) {
    await sql`
      INSERT INTO wpi_index (year, month, value) 
      VALUES (${w.year}, ${w.month}, ${w.value})
      ON CONFLICT (year, month) DO UPDATE SET value = EXCLUDED.value
    `
  }

  // 4. Historical Invoices
  const historical = [
    { 
      invoice_id: "INV-2025-01", period_start: "2025-01-01", period_end: "2025-01-31", 
      base_fee: 12000000, escalation_amount: 0, variable_amount: 1218000, 
      subtotal: 13218000, gst_amount: 2379240, total: 15597240, 
      invoice_date: "2025-02-05", due_date: "2025-03-22" 
    },
    { 
      invoice_id: "INV-2025-02", period_start: "2025-02-01", period_end: "2025-02-28", 
      base_fee: 12000000, escalation_amount: 0, variable_amount: 1092000, 
      subtotal: 13092000, gst_amount: 2356560, total: 15448560, 
      invoice_date: "2025-03-05", due_date: "2025-04-19" 
    },
    { 
      invoice_id: "INV-2025-03", period_start: "2025-03-01", period_end: "2025-03-31", 
      base_fee: 12000000, escalation_amount: 0, variable_amount: 1344000, 
      subtotal: 13344000, gst_amount: 2401920, total: 15745920, 
      invoice_date: "2025-04-05", due_date: "2025-05-20" 
    }
  ]
  for (const inv of historical) {
    await sql`
      INSERT INTO historical_invoices (
        contract_id, invoice_id, period_start, period_end, base_fee, 
        escalation_amount, variable_amount, subtotal, gst_amount, total, 
        invoice_date, due_date, status
      ) VALUES (
        ${dbId}, ${inv.invoice_id}, ${inv.period_start}, ${inv.period_end}, 
        ${inv.base_fee}, ${inv.escalation_amount}, ${inv.variable_amount}, 
        ${inv.subtotal}, ${inv.gst_amount}, ${inv.total}, 
        ${inv.invoice_date}, ${inv.due_date}, 'paid'
      ) ON CONFLICT (invoice_id) DO NOTHING
    `
  }

  // 5. April 2025 Evidence Data
  const evidenceData = {
    net_kwh: 33360000,
    scada_raw_available_hours: 661.68,
    total_hours: 720,
    sldc_curtailment_hours: 87.4,
    planned_maintenance_hours: 18.0,
    overlap_hours: 12.0
  }
  await sql`
    INSERT INTO evidence_files (
      contract_id, period_start, period_end, evidence_type, status, data
    ) VALUES (
      ${dbId}, '2025-04-01', '2025-04-30', 'APRIL_2025_PACK', 'uploaded', ${JSON.stringify(evidenceData)}
    )
  `

  console.log('✅ Seeding complete.')
}

seed().catch(console.error)
