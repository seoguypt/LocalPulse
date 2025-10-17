#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:soBiyCYvbIodYBbrTHkmCfkgizvCAUhk@switchyard.proxy.rlwy.net:51246/railway';

console.log('🔄 Connecting to database...');
console.log('📍 URL:', DATABASE_URL.substring(0, 30) + '...');

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const db = drizzle(pool);

async function migrate() {
  try {
    console.log('\n📦 Creating tables...\n');

    // Create businesses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        website_url TEXT,
        facebook_url TEXT,
        instagram_username TEXT,
        tiktok_username TEXT,
        x_username TEXT,
        linkedin_url TEXT,
        youtube_url TEXT,
        uber_eats_url TEXT,
        door_dash_url TEXT,
        deliveroo_url TEXT,
        menulog_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Created businesses table');

    // Create business_locations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS business_locations (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        google_place_id TEXT,
        apple_maps_id TEXT,
        name TEXT,
        address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Created business_locations table');

    console.log('\n🎉 Migration completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
