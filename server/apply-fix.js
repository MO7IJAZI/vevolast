import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

// Load environment variables
config();

async function applyFix() {
  console.log("🔧 Applying database schema fixes...");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
  });

  try {
    // Read the SQL migration file
    const migrationPath = path.join(process.cwd(), "migrations", "0001_fix_schema_mismatches.sql");
    const sql = await fs.readFile(migrationPath, "utf8");
    
    console.log("📋 Executing SQL migration...");
    
    // Split the SQL into individual statements
    const statements = sql.split(";").filter(stmt => stmt.trim());
    
    const client = await pool.getConnection();
    
    try {
      await client.query("START TRANSACTION");
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`➡️  Executing: ${statement.trim().substring(0, 50)}...`);
          await client.query(statement + ";");
        }
      }
      
      await client.query("COMMIT");
      console.log("✅ Database schema fixes applied successfully!");
      
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error applying fixes:", error);
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error("❌ Failed to apply database fixes:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyFix().then(() => {
  console.log("🎉 All fixes completed!");
  process.exit(0);
}).catch(error => {
  console.error("💥 Critical error:", error);
  process.exit(1);
});
