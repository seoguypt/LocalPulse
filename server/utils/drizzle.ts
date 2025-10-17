import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
export { sql, eq, and, or, isNotNull } from 'drizzle-orm';

import * as schema from '../database/schema';

export const tables = schema;

let pool: Pool | null = null;

export function useDrizzle() {
  if (!pool) {
    const config = useRuntimeConfig();
    pool = new Pool({
      connectionString: config.databaseUrl || process.env.DATABASE_URL,
    });
  }
  return drizzle(pool, { schema });
}
