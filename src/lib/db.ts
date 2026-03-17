import { drizzle } from 'drizzle-orm/node-postgres'; 
import { Pool } from 'pg';
import 'dotenv/config';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export const checkDbConnection = async () => {
  try {
    await pool.query('SELECT 1'); 
    console.log('✅ Local DB connected');
  } catch (error) {
    console.error('❌ Failed to connect to local Postgres:', error);
    process.exit(1); 
  }
};
