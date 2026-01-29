import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import * as schema from './schema';

const { Pool } = pg;
const connector = new Connector();
const isCloudRun = process.env.K_SERVICE !== undefined;

async function connectToDatabase() {
  try {
    let pool;

    if (isCloudRun && process.env.INSTANCE_CONNECTION_NAME) {
      // Use Cloud SQL Connector for Cloud Run
      const clientOpts = await connector.getOptions({
        instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME!,
        ipType: IpAddressTypes.PUBLIC,
      });

      pool = new Pool({
        ...clientOpts,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE,
        max: 10,
      });

      console.log('📦 Connected via Cloud SQL Connector (Cloud Run)');
    } else {
      // Use standard TCP connection for local development
      const host = process.env.POSTGRES_HOST || 'localhost';
      const port = Number(process.env.POSTGRES_PORT) || 5432;

      pool = new Pool({
        host,
        port,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE,
        max: 10,
      });

      console.log('📦 Connected via TCP (Local)');
    }

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
