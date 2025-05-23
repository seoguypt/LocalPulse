export type PlatformId = 'instagram' | 'facebook' | 'tiktok' | 'website';

export const getPlatformProfileUrl = (platform: PlatformId, username: string): string => {
  if (!username) return '';
  if (username.startsWith('http')) return username;
  
  // Clean the username by removing @ if present
  const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
  
  switch (platform) {
    case 'instagram': return `https://www.instagram.com/${cleanUsername}/`;
    case 'facebook': 
      // If it's a numeric ID, use profile.php format
      if (/^\d+$/.test(cleanUsername)) {
        return `https://www.facebook.com/profile.php?id=${cleanUsername}`;
      }
      return `https://www.facebook.com/${cleanUsername}/`;
    case 'tiktok': return `https://www.tiktok.com/@${cleanUsername}/`;
    case 'website': 
      if (!/^https?:\/\//i.test(username)) {
        return `https://${username}`;
      }
      return username;
    default: return '';
  }
};