/**
 * Returns a minimal, human-readable version of a URL.
 *
 * Strips the scheme (e.g., "https://") and removes any trailing slashes,
 * but preserves the path and query string to retain routing functionality.
 * Fragments (e.g., "#section") are also removed.
 *
 * @param {string} url - The full URL to simplify.
 * @returns {string} A minimal version of the URL with host, path, and query.
 *
 * @example
 * getMinimalUrl("https://example.com/path/?ref=abc#top") // "example.com/path?ref=abc"
 * getMinimalUrl("http://www.example.com/sub/") // "www.example.com/sub"
 */
export const minifyUrl = (url: string) => {
  try {
    // Handle empty or invalid URLs
    if (!url) return '';
    
    // Try to parse the URL
    const parsedUrl = new URL(url);
    
    // Get the hostname
    let result = parsedUrl.hostname;
    
    // Add path (without trailing slash)
    if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
      const path = parsedUrl.pathname.endsWith('/') 
        ? parsedUrl.pathname.slice(0, -1) 
        : parsedUrl.pathname;
      result += path;
    }
    
    // Add query parameters if they exist
    if (parsedUrl.search) {
      // Remove the leading ? from search
      result += parsedUrl.search;
    }
    
    return result;
  } catch (error) {
    // If URL parsing fails, return the original string or handle as needed
    return url;
  }
}