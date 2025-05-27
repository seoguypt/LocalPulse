export const getTwitterUsernameFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('twitter.com') && !urlObj.hostname.includes('x.com')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length === 0) return null;

    const firstPart = pathParts[0];
    if (!firstPart) return null;
    
    // Skip non-profile content
    if (firstPart === 'i' ||           // internal pages
        firstPart === 'intent' ||      // intent links
        firstPart === 'home' ||        // home page
        firstPart === 'explore' ||     // explore page
        firstPart === 'notifications' || // notifications
        firstPart === 'messages' ||    // messages
        firstPart === 'search' ||      // search results
        firstPart === 'settings' ||    // settings
        firstPart === 'about' ||       // about pages
        firstPart === 'tos' ||         // terms of service
        firstPart === 'privacy' ||     // privacy policy
        firstPart === 'hashtag') {     // hashtag pages
      return null;
    }

    // Return the username (first path part)
    return firstPart;
  } catch {
    return null;
  }
};

export const normalizeTwitterUrl = (url: string): string => {
  try {
    const username = getTwitterUsernameFromUrl(url);
    if (username) {
      return `x.com/${username}`;
    }
    return url;
  } catch {
    return url;
  }
}; 