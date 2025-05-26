import { ApplePlaceInput, GooglePlaceInput } from '#components';
import { z } from 'zod';

export const channelIdSchema = z.enum(['website', 'facebook', 'instagram', 'tiktok', 'youtube', 'uber-eats', 'deliveroo', 'doordash', 'menulog', 'apple-maps', 'google-maps', 'linkedin', 'x']);
export type ChannelId = z.infer<typeof channelIdSchema>;

export const channelSchema = z.object({
  id: channelIdSchema,
  label: z.string(),
  description: z.string(),
  icon: z.string(),
  iconColor: z.string().optional(),
  input: z.object({
    is: z.any().optional(),
    attrs: z.any().optional(),
  }).optional()
});
export type Channel = z.infer<typeof channelSchema>;

export const CHANNEL_CONFIG: Record<ChannelId, Channel> = {
  'website': {
    id: 'website',
    label: 'Website',
    description: 'Central hub for your online presence with detailed information about your business.',
    icon: 'lucide-globe',
    iconColor: 'text-gray-900 dark:text-white',
    input: {
      attrs: {
        placeholder: 'https://www.example.com or example.com',
        type: 'url',
      }
    }
  },
  'facebook': {
    id: 'facebook',
    label: 'Facebook',
    description: 'Connect with customers, share updates, and build a community around your brand.',
    icon: 'logos-facebook',
  },
  'instagram': {
    id: 'instagram',
    label: 'Instagram',
    description: 'Visual platform for sharing product photos and connecting with younger audiences.',
    icon: 'simple-icons-instagram',
    iconColor: 'text-[#ED0191]',
  },
  'tiktok': {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Short-form video platform to reach younger demographics with creative content.',
    icon: 'logos-tiktok-icon',
    iconColor: 'text-black dark:text-white',
  },
  'youtube': {
    id: 'youtube',
    label: 'YouTube',
    description: 'Video platform for sharing content with a global audience.',
    icon: 'logos-youtube',
  },
  'uber-eats': {
    id: 'uber-eats',
    label: 'Uber Eats',
    description: 'Food delivery platform connecting restaurants with customers seeking delivery.',
    icon: 'simple-icons-ubereats',
    iconColor: 'text-[#03C167]',
  },
  'deliveroo': {
    id: 'deliveroo',
    label: 'Deliveroo',
    description: 'Food delivery service focused on quality dining experiences.',
    icon: 'simple-icons-deliveroo',
    iconColor: 'text-[#00CCBC]',
  },
  'doordash': {
    id: 'doordash',
    label: 'Doordash',
    description: 'Delivery service with access to a large customer base across many locations.',
    icon: 'simple-icons-doordash',
    iconColor: 'text-[#F44322]',
  },
  'menulog': {
    id: 'menulog',
    label: 'Menulog',
    description: 'Online food ordering and delivery service popular in Australia and New Zealand.',
    icon: 'i-lucide-hamburger', 
    iconColor: 'text-[#FF8001]',
  },
  'apple-maps': {
    id: 'apple-maps',
    label: 'Apple Maps',
    description: 'Manage your presence across Apple Maps to improve local visibility.',
    icon: 'simple-icons-apple',
    iconColor: 'text-black dark:text-white',
    input: {
      is: ApplePlaceInput,
    }
  },
  'google-maps': {
    id: 'google-maps',
    label: 'Google Maps',
    description: 'Manage your presence across Google Search and Maps to improve local visibility.',
    icon: 'logos-google-maps',
    iconColor: 'text-[#4285F4]',
    input: {
      is: GooglePlaceInput,
    }
  },
  'linkedin': {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Professional networking platform to connect with business professionals and build your brand.',
    icon: 'logos-linkedin-icon',
    iconColor: 'text-[#0077B5]',
  },
  'x': {
    id: 'x',
    label: 'Twitter / X',
    description: 'Social media platform for sharing short-form content with a global audience.',
    icon: 'logos-x',
    iconColor: 'text-black dark:text-white',
  }
};
