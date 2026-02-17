
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  try {
    const client = await mysql.createConnection(process.env.DATABASE_URL);
    console.log("Connected to DB");
    await client.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_created_at timestamp');
    console.log("Column added successfully");
    await client.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
