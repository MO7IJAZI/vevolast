require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing in .env');
    process.exit(1);
  }

  try {
    const client = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('Connected to database.');

    // Add columns to leads table
    console.log('Applying schema changes to "leads" table...');
    
    // Check if column exists first or just use IF NOT EXISTS
    await client.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS was_confirmed_client boolean DEFAULT false
    `);
    console.log('✓ Added was_confirmed_client column');

    await client.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS converted_from_client_id text
    `);
    console.log('✓ Added converted_from_client_id column');
    
    console.log('✓ Manual migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
