import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.warn("DATABASE_URL or DB_HOST is not set. Database connection may fail.");
}

// Support both connection string and individual parameters
let poolConfig: any;

if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    poolConfig = {
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1), // Remove leading slash
      port: Number(dbUrl.port) || 3306,
    };
  } catch (e) {
    console.error("Invalid DATABASE_URL, falling back to individual params", e);
    poolConfig = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
    };
  }
} else {
  poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  };
}

export const pool = createPool({
  ...poolConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // Important for running migrations or batch queries
});

export const db = drizzle(pool, { schema, mode: 'default' });
