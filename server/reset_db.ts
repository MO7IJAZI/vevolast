
import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("⚠️  Dropping all tables...");
  
  // Disable foreign key checks
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

  const [rows] = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE()
  `);

  // @ts-ignore
  for (const row of rows) {
    const tableName = row.TABLE_NAME || row.table_name;
    console.log(`Dropping table ${tableName}...`);
    await db.execute(sql.raw(`DROP TABLE IF EXISTS \`${tableName}\``));
  }

  // Re-enable foreign key checks
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  
  console.log("✅ All tables dropped.");
  process.exit(0);
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
