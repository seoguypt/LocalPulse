import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const businesses = sqliteTable('businesses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  abn: text('abn'),
  placeId: text('place_id'),
  websiteUrl: text('website_url'),
  facebookUrl: text('facebook_url'),
  instagramUrl: text('instagram_url'),
  twitterUrl: text('twitter_url'),
  linkedinUrl: text('linkedin_url'),
  youtubeUrl: text('youtube_url'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
