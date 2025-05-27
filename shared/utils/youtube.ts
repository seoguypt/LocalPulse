export const getYouTubeChannelFromUrl = (url: string): { channelId?: string; handle?: string; url: string } | null => {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length === 0) return null;

    const firstPart = pathParts[0];
    if (!firstPart) return null;
    
    // Handle different YouTube URL formats
    if (firstPart === 'channel' && pathParts.length > 1) {
      // youtube.com/channel/UC...
      return {
        channelId: pathParts[1],
        url: `https://www.youtube.com/channel/${pathParts[1]}`
      };
    } else if (firstPart === 'c' && pathParts.length > 1) {
      // youtube.com/c/channelname
      return {
        handle: pathParts[1],
        url: `https://www.youtube.com/c/${pathParts[1]}`
      };
    } else if (firstPart === 'user' && pathParts.length > 1) {
      // youtube.com/user/username
      return {
        handle: pathParts[1],
        url: `https://www.youtube.com/user/${pathParts[1]}`
      };
    } else if (firstPart.startsWith('@') && pathParts.length === 1) {
      // youtube.com/@handle
      const handle = firstPart.substring(1);
      return {
        handle,
        url: `https://www.youtube.com/@${handle}`
      };
    } else if (pathParts.length === 1 && !firstPart.includes('.')) {
      // youtube.com/customname (legacy custom URLs)
      return {
        handle: firstPart,
        url: `https://www.youtube.com/${firstPart}`
      };
    }

    return null;
  } catch {
    return null;
  }
};

export const normalizeYouTubeUrl = (url: string): string => {
  try {
    const channel = getYouTubeChannelFromUrl(url);
    if (channel?.channelId) {
      return `youtube.com/channel/${channel.channelId}`;
    } else if (channel?.handle) {
      return `youtube.com/${channel.handle}`;
    }
    return url;
  } catch {
    return url;
  }
}; 