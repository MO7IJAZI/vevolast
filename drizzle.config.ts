
import { defineConfig } from "drizzle-kit";
import "dotenv/config";

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error("DATABASE_URL or DB_HOST, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: process.env.DATABASE_URL 
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST!,
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_NAME!,
        port: Number(process.env.DB_PORT) || 3306,
      },
});
