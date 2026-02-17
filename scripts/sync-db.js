import mysql from "mysql2/promise";
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
});

async function sync() {
  const client = await pool.getConnection();
  try {
    console.log("Checking and updating schema...");
    
    // Users table fixes
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar text,
      ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS name_en text,
      ADD COLUMN IF NOT EXISTS department text,
      ADD COLUMN IF NOT EXISTS employee_id text,
      ADD COLUMN IF NOT EXISTS last_login timestamp,
      ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()
    `);
    
    // Invitations table
    await client.query(`
      ALTER TABLE invitations
      ADD COLUMN IF NOT EXISTS name text,
      ADD COLUMN IF NOT EXISTS name_en text,
      ADD COLUMN IF NOT EXISTS department text,
      ADD COLUMN IF NOT EXISTS employee_id text,
      ADD COLUMN IF NOT EXISTS used_at timestamp,
      ADD COLUMN IF NOT EXISTS invited_by text
    `);

    // Client Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_users (
        id varchar(255) PRIMARY KEY DEFAULT (UUID()),
        email text NOT NULL UNIQUE,
        password text NOT NULL,
        client_id text NOT NULL,
        client_name text NOT NULL,
        client_name_en text,
        is_active boolean NOT NULL DEFAULT true,
        last_login timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    console.log("Schema sync completed successfully!");
  } catch (err) {
    console.error("Error syncing schema:", err);
  } finally {
    client.release();
    process.exit();
  }
}

sync();
