import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // schemes using 'pg' driver
  // dialect: 'postgresql', // This is already present in the file, keeping context implies I just replace the credentials block

} satisfies Config;
