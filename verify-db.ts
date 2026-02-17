import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const result = await db.execute(sql`SELECT version()`);
    console.log("Database version:", result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

main();
