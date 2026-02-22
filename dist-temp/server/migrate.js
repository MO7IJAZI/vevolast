import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { db } from "./db";
async function runMigrate() {
    console.log("⏳ Running migrations...");
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("✅ Migrations completed!");
    process.exit(0);
}
runMigrate().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
