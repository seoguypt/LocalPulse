export type PlatformId = 'instagram' | 'facebook' | 'x' | 'tiktok' | 'youtube' | 'website';

export const getPlatformProfileUrl = (platform: PlatformId, identifier: string): string => {
  if (!identifier) return '';

  // Handle social profiles vs websites
  if (platform === 'website') {
    return identifier.startsWith('http') ? identifier : `https://${identifier}`;
  }

  // Remove @ and prepare the username
  const cleanUsername = identifier.replace('@', '');
  
  switch (platform) {
    case 'instagram': return `https://instagram.com/${cleanUsername}`;
    case 'facebook': return `https://facebook.com/${cleanUsername}`;
    case 'x': return `https://x.com/${cleanUsername}`;
    case 'tiktok': return `https://tiktok.com/@${cleanUsername}`;
    case 'youtube':
      // Handle various YouTube URL formats
      if (cleanUsername.startsWith('channel/') || cleanUsername.startsWith('c/') || cleanUsername.startsWith('user/')) {
        return `https://youtube.com/${cleanUsername}`;
      }
      return `https://youtube.com/@${cleanUsername}`;
    default: return '';
  }
};
