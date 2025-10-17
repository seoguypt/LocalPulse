import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  // Social media and online presence fields (business-wide)
  websiteUrl: text('website_url'),
  facebookUsername: text('facebook_url'),
  instagramUsername: text('instagram_username'),
  tiktokUsername: text('tiktok_username'),
  xUsername: text('x_username'),
  linkedinUrl: text('linkedin_url'),
  youtubeUrl: text('youtube_url'),
  // Delivery platform URLs (business-wide)
  uberEatsUrl: text('uber_eats_url'),
  doorDashUrl: text('door_dash_url'),
  deliverooUrl: text('deliveroo_url'),
  menulogUrl: text('menulog_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const businessLocations = pgTable('business_locations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  googlePlaceId: text('google_place_id'),
  appleMapsId: text('apple_maps_id'),
  name: text('name'),
  address: text('address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const businessesRelations = relations(businesses, ({ many }) => ({
  locations: many(businessLocations),
}));

export const businessLocationsRelations = relations(businessLocations, ({ one }) => ({
  business: one(businesses, {
    fields: [businessLocations.businessId],
    references: [businesses.id],
  }),
}));
