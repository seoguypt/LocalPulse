import { parseHTML } from 'linkedom/worker';

interface ExtractedSocialLink {
  url: string;
  confidence: number;
  source: 'footer' | 'header' | 'social-section' | 'content';
  platform: 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'linkedin' | 'youtube';
}

/**
 * Extracts social media links from a website with confidence scoring
 */
export const extractSocialMediaLinks = defineCachedFunction(async (websiteUrl: string): Promise<ExtractedSocialLink[]> => {
  try {
    const html = await getBrowserHtml(websiteUrl);
    
    const { document } = parseHTML(html) as any;
    const links: ExtractedSocialLink[] = [];

    // Find all links
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    
    for (const link of allLinks) {
      const href = (link as any).getAttribute('href');
      if (!href) continue;

      // Check if it's a social media URL
      const socialLink = analyzeSocialMediaUrl(href);
      if (!socialLink) continue;

      // Determine the source and confidence based on location in DOM
      const confidence = calculateLinkConfidence(document, link as any, socialLink.platform);
      const source = determineLinkSource(document, link as any);

      links.push({
        url: socialLink.url,
        confidence,
        source,
        platform: socialLink.platform
      });
    }

    // Deduplicate and sort by confidence
    const deduplicatedLinks = deduplicateLinks(links);
    return deduplicatedLinks.sort((a, b) => b.confidence - a.confidence);

  } catch (error) {
    console.error('Error extracting social media links:', error);
    return [];
  }
}, {
  name: 'extractSocialMediaLinks',
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
});

/**
 * Analyzes a URL to determine if it's a social media link and which platform
 */
function analyzeSocialMediaUrl(url: string): { url: string; platform: ExtractedSocialLink['platform'] } | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase();

    // Facebook - skip obvious non-business content
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
      if (urlObj.pathname.includes('groups/') || 
          urlObj.pathname.includes('events/') || 
          urlObj.pathname.includes('marketplace/')) {
        return null;
      }
      return { url: urlObj.toString(), platform: 'facebook' };
    }

    // Instagram - skip posts and other content
    if (hostname.includes('instagram.com')) {
      if (urlObj.pathname.includes('/p/') || 
          urlObj.pathname.includes('/reel/') || 
          urlObj.pathname.includes('/stories/')) {
        return null;
      }
      return { url: urlObj.toString(), platform: 'instagram' };
    }

    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return { url: urlObj.toString(), platform: 'twitter' };
    }

    // TikTok - only profile URLs
    if (hostname.includes('tiktok.com') && urlObj.pathname.startsWith('/@')) {
      return { url: urlObj.toString(), platform: 'tiktok' };
    }

    // LinkedIn
    if (hostname.includes('linkedin.com')) {
      return { url: urlObj.toString(), platform: 'linkedin' };
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return { url: urlObj.toString(), platform: 'youtube' };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Calculates confidence score based on where the link appears
 */
function calculateLinkConfidence(document: any, linkElement: any, platform: string): number {
  // High confidence: footer or header (official placement)
  if (linkElement.closest('footer') || linkElement.closest('header') || linkElement.closest('nav')) {
    return 0.9;
  }

  // Medium confidence: social media section
  const parent = linkElement.parentElement;
  const parentText = parent?.textContent?.toLowerCase() || '';
  
  if (parentText.includes('social') || parentText.includes('follow')) {
    return 0.7;
  }

  // Low confidence: everything else
  return 0.5;
}

/**
 * Determines the source section of the website where the link was found
 */
function determineLinkSource(document: any, linkElement: any): ExtractedSocialLink['source'] {
  if (linkElement.closest('footer')) {
    return 'footer';
  }

  if (linkElement.closest('header') || linkElement.closest('nav')) {
    return 'header';
  }

  // Check for social media section
  const parent = linkElement.parentElement;
  const parentText = parent?.textContent?.toLowerCase() || '';
  
  if (parentText.includes('social') || parentText.includes('follow')) {
    return 'social-section';
  }

  return 'content';
}

/**
 * Remove duplicate links keeping the highest confidence one
 */
function deduplicateLinks(links: ExtractedSocialLink[]): ExtractedSocialLink[] {
  const linkMap = new Map<string, ExtractedSocialLink>();

  for (const link of links) {
    const normalizedUrl = normalizeUrl(link.url);
    const existing = linkMap.get(normalizedUrl);
    
    if (!existing || link.confidence > existing.confidence) {
      linkMap.set(normalizedUrl, link);
    }
  }

  return Array.from(linkMap.values());
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove www and trailing slashes
    return urlObj.hostname.replace(/^www\./, '') + urlObj.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
} 