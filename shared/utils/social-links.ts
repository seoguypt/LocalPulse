export interface SocialLinks {
  facebook: string[];
  instagram: string[];
}

export function cleanFacebookLink(link: string): string | null {
  try {
    // Handle Facebook redirect links
    if (link.includes('l.facebook.com/l.php')) {
      // If it's just the base redirect URL without parameters, exclude it
      if (!link.includes('?')) return null;
      
      const urlParams = new URLSearchParams(link.split('?')[1]);
      const redirectUrl = urlParams.get('u');
      
      // Exclude if no redirect URL or if redirect URL is not a valid URL
      if (!redirectUrl || !redirectUrl.startsWith('http')) return null;
      
      // Only follow redirects that point to Facebook
      if (!redirectUrl.includes('facebook.com/')) return null;
      
      link = decodeURIComponent(redirectUrl);
    }

    // Ensure the link is actually a Facebook link
    if (!link.includes('facebook.com/')) return null;

    const url = new URL(link);
    const path = url.pathname;

    // Exclude help, about, and other non-profile pages
    if (path.includes('/help/') || 
        path.includes('/about/') || 
        path.includes('/legal/') || 
        path.includes('/watch/') || 
        path.includes('/groups/') || 
        path.includes('/events/') ||
        path.includes('/shopping/') ||
        path.includes('/marketplace/') ||
        path.includes('/pages/') ||
        path.includes('/support/')) {
      return null;
    }

    // Only keep links that have exactly one segment after the domain
    // and don't end with common non-profile paths
    if (path.split('/').length !== 2 || 
        path.endsWith('/') ||
        path.includes('.')) {
      return null;
    }

    // Clean up the final URL by removing tracking parameters
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch (error) {
    return null;
  }
}

export function cleanInstagramLink(link: string): string | null {
  try {
    // Handle Instagram redirect links
    if (link.includes('l.instagram.com/')) {
      // If it's just the base redirect URL without parameters, exclude it
      if (!link.includes('?')) return null;
      
      const urlParams = new URLSearchParams(link.split('?')[1]);
      const redirectUrl = urlParams.get('u');
      
      // Exclude if no redirect URL or if redirect URL is not a valid URL
      if (!redirectUrl || !redirectUrl.startsWith('http')) return null;
      
      // Only follow redirects that point to Instagram
      if (!redirectUrl.includes('instagram.com/')) return null;
      
      link = decodeURIComponent(redirectUrl);
    }

    // Ensure the link is actually an Instagram link
    if (!link.includes('instagram.com/')) return null;

    const url = new URL(link);
    const path = url.pathname;

    // Exclude help, about, and other non-profile pages
    if (path.includes('/help/') || 
        path.includes('/about/') || 
        path.includes('/legal/') || 
        path.includes('/explore/') ||
        path.includes('/reels/') ||
        path.includes('/p/') ||
        path.includes('/stories/')) {
      return null;
    }

    // Only keep links that have exactly one segment after the domain
    // and don't end with common non-profile paths
    if (path.split('/').length !== 2 || 
        path.endsWith('/') ||
        path.includes('.')) {
      return null;
    }

    // Clean up the final URL by removing tracking parameters
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch (error) {
    return null;
  }
}

export function filterFacebookLinks(links: string[]): string[] {
  return links
    .map(cleanFacebookLink)
    .filter((link): link is string => link !== null)
    .filter((link, index, self) => 
      // Remove duplicates
      index === self.findIndex(l => l === link)
    );
}

export function filterInstagramLinks(links: string[]): string[] {
  return links
    .map(cleanInstagramLink)
    .filter((link): link is string => link !== null)
    .filter((link, index, self) => 
      // Remove duplicates
      index === self.findIndex(l => l === link)
    );
} 