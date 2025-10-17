// Simple HTML fetcher to replace Puppeteer-based getBrowserHtml
export const getBrowserHtml = defineCachedFunction(async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`[getBrowserHtml] Error fetching ${url}:`, error);
    throw error;
  }
}, {
  name: 'getBrowserHtml',
  maxAge: 1000 * 60 * 60, // 1 hour cache
});
