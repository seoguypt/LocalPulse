import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Schema for scraped website data
const scrapedWebsiteDataSchema = z.object({
  website: z.string(),
  websiteLinks: z.array(z.string()).default([]),
  socialLinks: z.object({
    facebook: z.array(z.string()),
    instagram: z.array(z.string()),
  }).default({
    facebook: [],
    instagram: [],
  }),
  address: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  businessName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  error: z.string().optional(),
});

export const dataSchema = z.object({
  businessName: z.string().optional(),
  googlePlacesSearchResults: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    address: z.string().optional(),
    website: z.string().optional(),
  })).default([]),
  googleSearchResults: z.array(z.object({
    url: z.string(),
    title: z.string(),
    description: z.string(),
  })).default([]),
  facebookSearchResults: z.array(z.object({
    url: z.string(),
    title: z.string(),
    description: z.string(),
  })).default([]),
  instagramSearchResults: z.array(z.object({
    url: z.string(),
    title: z.string(),
    description: z.string(),
  })).default([]),
  scrapedWebsiteData: z.array(scrapedWebsiteDataSchema).default([]),
  scrapedSocialMediaData: z.array(scrapedWebsiteDataSchema).default([]),
  validWebsites: z.array(z.string().url()).default([]),
  validSocialProfiles: z.array(z.string().url()).default([]),
  canonicalWebsite: z.string().url().optional(),
  canonicalFacebook: z.string().url().optional(),
  canonicalInstagram: z.string().url().optional(),
  facebookProfiles: z.array(z.object({
    url: z.string(),
    title: z.string(),
    description: z.string(),
  })).default([]),
});

import { tables} from '../../server/utils/drizzle'

export const businessInsertSchema = createInsertSchema(tables.businesses);
export const businessSchema = createSelectSchema(tables.businesses);

export type Data = z.infer<typeof dataSchema>;
export type Business = z.infer<typeof businessSchema>;

import { externalSearchResultSchema } from '../../server/api/businesses/external-search.get';
export { externalSearchResultSchema }
export type ExternalSearchResult = z.infer<typeof externalSearchResultSchema>;

import { abnSearchByNameResultSchema } from '../../server/api/abr/search-by-name.get';
export { abnSearchByNameResultSchema }
export type AbnSearchByNameResult = z.infer<typeof abnSearchByNameResultSchema>;

import { abnSearchByAbnResultSchema } from '../../server/api/abr/search-by-abn.get';
export { abnSearchByAbnResultSchema }
export type AbnSearchByAbnResult = z.infer<typeof abnSearchByAbnResultSchema>;

import { googlePlacesSearchTextResponseSchema } from '../../server/api/google/places/searchText.post';
export { googlePlacesSearchTextResponseSchema }
export type GooglePlacesSearchTextResponse = z.infer<typeof googlePlacesSearchTextResponseSchema>;

import { googlePlacesPlaceSchema } from '../../server/api/google/places/searchText.post';
export { googlePlacesPlaceSchema }
export type GooglePlacesPlace = z.infer<typeof googlePlacesPlaceSchema>;
