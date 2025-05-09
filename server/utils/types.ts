import type { SocialLinks } from '~~/shared/utils/social-links';

export interface ScrapedPageData {
  website: string; // The URL that was scraped
  socialLinks?: SocialLinks | null; // Relevant for general website scraper
  websiteLinks?: string[] | null; // Relevant for social media scraper (external links)
  address?: string | null;
  logo?: string | null;
  businessName?: string | null;
  description?: string | null;
  error?: string; // Error message if scraping failed
} 
