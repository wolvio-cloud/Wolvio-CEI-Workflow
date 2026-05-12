import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

// Manual env parsing since dotenv might not be available
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    env.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(url);

async function migrate() {
  console.log('🚀 Running migration...');

  try {
    // 1. Create reminders table
    await sql`
      CREATE TABLE IF NOT EXISTS reminders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
          invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
          owner_role VARCHAR(50) NOT NULL,
          due_date TIMESTAMP WITH TIME ZONE NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'scheduled',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE
      );
    `;
    console.log('✅ Reminders table verified');

    // 2. Add columns to findings
    await sql`ALTER TABLE findings ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium'`;
    await sql`ALTER TABLE findings ADD COLUMN IF NOT EXISTS financial_impact NUMERIC(15, 2) DEFAULT 0`;
    await sql`ALTER TABLE findings ADD COLUMN IF NOT EXISTS period_start DATE`;
    await sql`ALTER TABLE findings ADD COLUMN IF NOT EXISTS period_end DATE`;
    await sql`ALTER TABLE findings ADD COLUMN IF NOT EXISTS assigned_role VARCHAR(50)`;
    console.log('✅ Findings columns verified');

    // 3. Add columns to invoices
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sap_reference_number VARCHAR(100)`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS posting_comment TEXT`;
    console.log('✅ Invoices columns verified');

    // 4. Add role to audit_log
    await sql`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS role VARCHAR(50)`;
    console.log('✅ Audit log columns verified');

    console.log('🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
