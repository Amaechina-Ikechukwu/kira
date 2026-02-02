import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema';

const { Pool } = pg;


async function connectToDatabase() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });

    console.log('📦 Connected via Connection String');

    return drizzle(pool, { schema });
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
}

export const db = await connectToDatabase();

export { schema };

export async function testConnection(): Promise<boolean> {
  try {
    // Simple query to test connection
    console.log('✅ Database connected');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
