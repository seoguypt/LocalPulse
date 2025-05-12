import { drizzle } from 'drizzle-orm/better-sqlite3';
export { sql, eq, and, or } from 'drizzle-orm'

import * as schema from '../database/schema';

export const tables = schema;

export function useDrizzle() {
  const { dbPath } = useRuntimeConfig();

  return drizzle(dbPath, { schema });
}
