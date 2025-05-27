import { ApplePlaceInput, GooglePlaceInput } from '#components';
import { z } from 'zod';

export const channelIdSchema = z.enum(['website', 'facebook', 'instagram', 'tiktok', 'youtube', 'uber-eats', 'deliveroo', 'doordash', 'menulog', 'apple-maps', 'google-maps', 'linkedin', 'x']);
export type ChannelId = z.infer<typeof channelIdSchema>;

export const channelSchema = z.object({
  id: channelIdSchema,
  icon: z.string(),
  iconColor: z.string().optional(),
});
export type Channel = z.infer<typeof channelSchema>;

export const CHANNEL_CONFIG: Record<ChannelId, Channel> = {
  'website': {
    id: 'website',
    icon: 'lucide-globe',
    iconColor: 'text-gray-900 dark:text-white',
  },
  'facebook': {
    id: 'facebook',
    icon: 'logos-facebook',
  },
  'instagram': {
    id: 'instagram',
    icon: 'simple-icons-instagram',
    iconColor: 'text-[#ED0191]',
  },
  'tiktok': {
    id: 'tiktok',
    icon: 'logos-tiktok-icon',
    iconColor: 'text-black dark:text-white',
  },
  'youtube': {
    id: 'youtube',
    icon: 'logos-youtube-icon',
  },
  'uber-eats': {
    id: 'uber-eats',
    icon: 'simple-icons-ubereats',
    iconColor: 'text-[#03C167]',
  },
  'deliveroo': {
    id: 'deliveroo',
    icon: 'simple-icons-deliveroo',
    iconColor: 'text-[#00CCBC]',
  },
  'doordash': {
    id: 'doordash',
    icon: 'simple-icons-doordash',
    iconColor: 'text-[#F44322]',
  },
  'menulog': {
    id: 'menulog',
    icon: 'i-lucide-hamburger',
    iconColor: 'text-[#FF8001]',
  },
  'apple-maps': {
    id: 'apple-maps',
    icon: 'simple-icons-apple',
    iconColor: 'text-black dark:text-white',
  },
  'google-maps': {
    id: 'google-maps',
    icon: 'logos-google-maps',
    iconColor: 'text-[#4285F4]',
  },
  'linkedin': {
    id: 'linkedin',
    icon: 'logos-linkedin-icon',
    iconColor: 'text-[#0077B5]',
  },
  'x': {
    id: 'x',
    icon: 'simple-icons-x',
    iconColor: 'text-black dark:text-white',
  }
};
