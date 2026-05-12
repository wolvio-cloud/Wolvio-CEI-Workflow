import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

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
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(url);

async function reset() {
  console.log('🧨 Resetting database...');
  
  try {
    // Drop in reverse order of dependencies
    await sql`DROP TABLE IF EXISTS reminders CASCADE`;
    await sql`DROP TABLE IF EXISTS approvals CASCADE`;
    await sql`DROP TABLE IF EXISTS audit_log CASCADE`;
    await sql`DROP TABLE IF EXISTS findings CASCADE`;
    await sql`DROP TABLE IF EXISTS invoices CASCADE`;
    await sql`DROP TABLE IF EXISTS wpi_index CASCADE`;
    await sql`DROP TABLE IF EXISTS contracts CASCADE`;
    
    console.log('✅ Tables dropped');

    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('📜 Applying schema statements...');
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await sql.query(statement);
    }
    
    console.log('✅ Schema recreated from schema.sql');
    console.log('🎉 Database reset complete!');
  } catch (err) {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  }
}

reset();
