import mysql from "mysql2/promise";
import { config } from "dotenv";

// Load environment variables
config();

async function verifySchema() {
  console.log("🔍 Verifying schema fixes...");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
  });

  const client = await pool.getConnection();
  
  try {
    // Check if all the missing columns now exist
    const tablesToCheck = [
      'employee_salaries',
      'leads', 
      'clients',
      'payroll_payments',
      'users',
      'client_users'
    ];
    
    for (const table of tablesToCheck) {
      const [rows] = await client.query(
        `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = ?
        ORDER BY ordinal_position
      `,
        [table]
      );
      
      console.log(`\n📊 Table: ${table}`);
      console.log('Columns:', rows.map(r => r.column_name).join(', '));
    }
    
    // Specifically check the critical columns we added
    const criticalChecks = [
      { table: 'employee_salaries', column: 'amount', expected: 'int' },
      { table: 'leads', column: 'updated_at', expected: 'timestamp' },
      { table: 'clients', column: 'updated_at', expected: 'timestamp' },
      { table: 'payroll_payments', column: 'period', expected: 'text' },
      { table: 'users', column: 'avatar', expected: 'text' },
      { table: 'users', column: 'updated_at', expected: 'timestamp' }
    ];
    
    console.log('\n✅ Critical column verification:');
    let allGood = true;
    
    for (const check of criticalChecks) {
      const [rows] = await client.query(
        `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = ? AND column_name = ?
      `,
        [check.table, check.column]
      );
      
      if (rows.length > 0) {
        console.log(`✓ ${check.table}.${check.column} - FOUND (${rows[0].data_type})`);
      } else {
        console.log(`✗ ${check.table}.${check.column} - MISSING`);
        allGood = false;
      }
    }
    
    if (allGood) {
      console.log('\n🎉 All schema fixes verified successfully!');
    } else {
      console.log('\n❌ Some fixes are missing. Please check the migration.');
    }
    
  } catch (error) {
    console.error('Verification error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifySchema().then(() => {
  console.log('\n🔍 Verification completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Verification failed:', error);
  process.exit(1);
});
