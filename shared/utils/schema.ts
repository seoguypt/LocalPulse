import { z } from 'zod';

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
})

export type Data = z.infer<typeof dataSchema>
export type ScrapedWebsiteData = z.infer<typeof scrapedWebsiteDataSchema>
