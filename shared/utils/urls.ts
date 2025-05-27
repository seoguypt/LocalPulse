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
    
    // First clean the URL (removes UTM params, fragments, trailing slashes)
    const cleaned = cleanUrl(url);
    if (!cleaned) return '';
    
    // Parse the cleaned URL
    const parsedUrl = new URL(cleaned);
    
    // Get the hostname and remove www. prefix
    let result = parsedUrl.hostname.replace(/^www\./, '');
    
    // Add path (already cleaned of trailing slashes by cleanUrl)
    if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
      result += parsedUrl.pathname;
    }
    
    // Add query parameters if they exist (already filtered by cleanUrl)
    if (parsedUrl.search) {
      result += parsedUrl.search;
    }
    
    return result;
  } catch (error) {
    // If URL parsing fails, return the original string or handle as needed
    return url;
  }
}

/**
 * Cleans a URL by removing utm parameters, fragments, and trailing slashes.
 * 
 * @param {string} url - The URL to clean.
 * @returns {string} The cleaned URL
 * 
 * @example
 * cleanUrl("https://example.com/path/?utm_source=abc#top") // "https://example.com/path"
 * cleanUrl("http://www.example.com/sub/") // "https://www.example.com/sub"
 */
export const cleanUrl = (url: string) => {
  try {
    // Handle empty or invalid URLs
    if (!url) return '';
    
    // Try to parse the URL
    const parsedUrl = new URL(url);
    
    // Create a new URL object to rebuild the clean URL
    const cleanedUrl = new URL(parsedUrl.origin);
    
    // Add the pathname, removing trailing slash
    cleanedUrl.pathname = parsedUrl.pathname.endsWith('/') && parsedUrl.pathname !== '/'
      ? parsedUrl.pathname.slice(0, -1)
      : parsedUrl.pathname;
    
    // Filter out UTM parameters and rebuild search params
    const cleanedParams = new URLSearchParams();
    for (const [key, value] of parsedUrl.searchParams) {
      // Only skip UTM parameters, preserve all other parameters (including empty ones)
      if (!key.toLowerCase().startsWith('utm_')) {
        cleanedParams.append(key, value);
      }
    }
    
    // Only add search params if there are any
    if (cleanedParams.toString()) {
      cleanedUrl.search = cleanedParams.toString();
    }
    
    // Return the cleaned URL (fragments are automatically excluded)
    return cleanedUrl.toString();
  } catch (error) {
    // If URL parsing fails, return the original string
    return url;
  }
}