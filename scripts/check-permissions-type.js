import mysql from "mysql2/promise";
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
});

async function check() {
  const client = await pool.getConnection();
  try {
    const [rows] = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'permissions';
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit();
  }
}

check();
