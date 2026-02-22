import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.warn("DATABASE_URL or DB_HOST is not set. Database connection may fail.");
}

// Support both connection string and individual parameters
const connectionConfig = process.env.DATABASE_URL 
  ? { uri: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
    };

export const pool = createPool({
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // Important for running migrations or batch queries
});

export const db = drizzle(pool, { schema, mode: 'default' });
