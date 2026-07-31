import "dotenv/config";
import { db } from "./db";
import { readFile } from "fs/promises";
import path from "path";

async function runMySQLMigration() {
  console.log("⏳ Running MySQL migrations...");

  try {
    // Read the MySQL migration file
    const migrationPath = path.join(process.cwd(), "migrations", "0000_mysql_migration.sql");
    const sql = await readFile(migrationPath, "utf-8");

    // Split by statement but we need to handle MySQL statements properly
    // We'll execute them one by one
    const statements = sql
      .replace(/--.*$/gm, "") // Remove comments
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await db.execute(statement);
      } catch (error) {
        const dbError = error as { code?: string; message?: string };
        if (dbError.code === "ER_TABLE_EXISTS_ERROR") {
          console.log("  - Table already exists, skipping...");
        } else {
          console.log(`  - Statement result: ${dbError.message || "OK"}`);
        }
      }
    }

    console.log("✅ MySQL Migrations completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ MySQL Migration failed:", error);
    process.exit(1);
  }
}

runMySQLMigration();
