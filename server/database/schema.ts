import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const businesses = sqliteTable('businesses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  placeId: text('place_id'),
  websiteUrl: text('website_url'),
  facebookUsername: text('facebook_username'),
  instagramUsername: text('instagram_username'),
  twitterUsername: text('twitter_username'),
  tiktokUsername: text('tiktok_username'),
  youtubeUsername: text('youtube_username'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
