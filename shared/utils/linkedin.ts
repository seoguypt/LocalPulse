export const getLinkedInProfileFromUrl = (url: string): { url: string; profileType: 'company' | 'personal'; identifier: string } | null => {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('linkedin.com')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length === 0) return null;

    const firstPart = pathParts[0];
    if (!firstPart) return null;
    
    // Skip non-profile content
    if (firstPart === 'learning' ||      // LinkedIn Learning
        firstPart === 'jobs' ||          // Jobs section
        firstPart === 'feed' ||          // Feed/posts
        firstPart === 'groups' ||        // Groups
        firstPart === 'events' ||        // Events
        firstPart === 'messaging' ||     // Messages
        firstPart === 'search' ||        // Search results
        firstPart === 'help' ||          // Help pages
        firstPart === 'legal' ||         // Legal pages
        firstPart === 'about' ||         // About pages
        firstPart === 'business') {      // Business pages
      return null;
    }

    // Handle company pages: linkedin.com/company/[company-name]
    if (firstPart === 'company' && pathParts.length > 1) {
      const identifier = pathParts[1];
      if (!identifier) return null;
      return {
        url: `https://www.linkedin.com/company/${identifier}`,
        profileType: 'company',
        identifier
      };
    }

    // Handle personal profiles: linkedin.com/in/[username]
    if (firstPart === 'in' && pathParts.length > 1) {
      const identifier = pathParts[1];
      if (!identifier) return null;
      return {
        url: `https://www.linkedin.com/in/${identifier}`,
        profileType: 'personal',
        identifier
      };
    }

    // Handle legacy public profile URLs: linkedin.com/pub/[name]/[numbers]
    if (firstPart === 'pub' && pathParts.length >= 2) {
      const identifier = pathParts.slice(1).join('/');
      if (!identifier) return null;
      return {
        url: `https://www.linkedin.com/pub/${identifier}`,
        profileType: 'personal',
        identifier
      };
    }

    return null;
  } catch {
    return null;
  }
};

export const normalizeLinkedInUrl = (url: string): string => {
  try {
    const profile = getLinkedInProfileFromUrl(url);
    if (profile?.profileType === 'company') {
      return `linkedin.com/company/${profile.identifier}`;
    } else if (profile?.profileType === 'personal') {
      return `linkedin.com/in/${profile.identifier}`;
    }
    return url;
  } catch {
    return url;
  }
}; 