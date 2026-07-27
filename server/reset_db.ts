
import "dotenv/config";
import path from "node:path";
import { spawn } from "node:child_process";
import { db, pool } from "./db";
import { sql } from "drizzle-orm";

async function runTsxScript(scriptPath: string) {
  const tsxCli = path.resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, scriptPath], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Script failed: ${scriptPath} (exit code ${code ?? "unknown"})`));
    });
  });
}

async function reset() {
  console.log("⚠️  Starting full database reset...");
  console.log("ℹ️  Recommended: stop the app server before running this command.");
  
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

  await pool.end();

  console.log("⏳ Rebuilding schema...");
  await runTsxScript(path.resolve(process.cwd(), "server/migrate.ts"));

  console.log("⏳ Seeding fresh data...");
  await runTsxScript(path.resolve(process.cwd(), "server/seed.ts"));

  console.log("✅ Database reset, migration, and seed completed.");
  process.exit(0);
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
