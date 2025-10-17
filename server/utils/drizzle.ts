import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
export { sql, eq, and, or, isNotNull } from 'drizzle-orm';

import * as schema from '../database/schema';

export const tables = schema;

let pool: Pool | null = null;

export function useDrizzle() {
  if (!pool) {
    const config = useRuntimeConfig();
    const connectionString = config.databaseUrl || process.env.DATABASE_URL;
    
    console.log('[useDrizzle] Checking database configuration...');
    console.log('[useDrizzle] config.databaseUrl:', config.databaseUrl ? 'SET (length: ' + config.databaseUrl.length + ')' : 'NOT SET');
    console.log('[useDrizzle] process.env.DATABASE_URL:', process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET');
    console.log('[useDrizzle] Final connectionString:', connectionString ? connectionString.substring(0, 30) + '...' : 'NOT SET');
    
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured. Please add a PostgreSQL database to your Railway project.');
    }
    
    pool = new Pool({
      connectionString,
    });
  }
  return drizzle(pool, { schema });
}
