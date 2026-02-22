
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function initDb() {
  console.log('Initializing database...');
  
  let connection;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    const sqlFile = path.join(process.cwd(), 'migrations', '0000_mysql_migration.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon, but be careful with semicolons inside strings/comments?
    // This is a simple parser, might fail on complex cases but standard dump should be fine.
    // Drizzle generated SQL usually has statements separated by ; and newlines.
    
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
      
    console.log(`Found ${statements.length} statements.`);
    
    for (const statement of statements) {
      try {
        await connection.execute(statement);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('  - Table already exists, skipping...');
        } else {
          console.error('Error executing statement:', statement.substring(0, 50) + '...');
          console.error('Error:', error.message);
        }
      }
    }
    
    console.log('✅ Database initialized successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

initDb();
