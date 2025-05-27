export const getTikTokUsernameFromUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const firstPart = pathname.split('/')[1];
    
    // TikTok usernames start with @, so remove it if present
    if (firstPart && firstPart.startsWith('@')) {
      return firstPart.substring(1);
    }
    
    return firstPart;
  } catch {
    return null;
  }
} 