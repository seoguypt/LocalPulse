import { ApplePlaceInput, GooglePlaceInput } from '#components';
import { z } from 'zod';

export const channelIdSchema = z.enum(['website', 'facebook', 'instagram', 'tiktok', 'youtube', 'uber-eats', 'deliveroo', 'doordash', 'menulog', 'apple-maps', 'google-maps', 'linkedin', 'x']);
export type ChannelId = z.infer<typeof channelIdSchema>;

export const channelSchema = z.object({
  id: channelIdSchema,
  icon: z.string(),
  iconColor: z.string().optional(),
  field: z.object({
    label: z.string(),
    description: z.string().optional(),
    input: z.object({
      is: z.any().optional(),
      attrs: z.any().optional(),
    }).optional(),
  })
});
export type Channel = z.infer<typeof channelSchema>;

export const CHANNEL_CONFIG: Record<ChannelId, Channel> = {
  'website': {
    id: 'website',
    icon: 'lucide-globe',
    iconColor: 'text-gray-900 dark:text-white',
    field: {
      label: 'Website',
      input: {
        attrs: {
          placeholder: 'https://www.example.com or example.com',
          type: 'url',
        },
      }
    }
  },
  'facebook': {
    id: 'facebook',
    icon: 'logos-facebook',
    field: {
      label: 'Facebook Page URL',
      input: {
        attrs: {
          placeholder: 'facebook.com/example or facebook.com/profile.php?id=1234567890',
          type: 'url',
        },
      }
    }
  },
  'instagram': {
    id: 'instagram',
    icon: 'simple-icons-instagram',
    iconColor: 'text-[#ED0191]',
    field: {
      label: 'Instagram Username',
    }
  },
  'tiktok': {
    id: 'tiktok',
    icon: 'logos-tiktok-icon',
    iconColor: 'text-black dark:text-white',
    field: {
      label: 'TikTok Username',
    }
  },
  'youtube': {
    id: 'youtube',
    icon: 'logos-youtube-icon',
    field: {
      label: 'YouTube Channel URL',
    }
  },
  'uber-eats': {
    id: 'uber-eats',
    icon: 'simple-icons-ubereats',
    iconColor: 'text-[#03C167]',
    field: {
      label: 'Uber Eats',

    }
  },
  'deliveroo': {
    id: 'deliveroo',
    icon: 'simple-icons-deliveroo',
    iconColor: 'text-[#00CCBC]',
    field: {
      label: 'Deliveroo',
    }
  },
  'doordash': {
    id: 'doordash',
    icon: 'simple-icons-doordash',
    iconColor: 'text-[#F44322]',
    field: {
      label: 'Doordash',
    }
  },
  'menulog': {
    id: 'menulog',
    icon: 'i-lucide-hamburger',
    iconColor: 'text-[#FF8001]',
    field: {
      label: 'Menulog',
    }
  },
  'apple-maps': {
    id: 'apple-maps',
    icon: 'simple-icons-apple',
    iconColor: 'text-black dark:text-white',
    field: {
      label: 'Apple Maps Listing',
      input: {
        is: ApplePlaceInput,
      },
    }
  },
  'google-maps': {
    id: 'google-maps',
    icon: 'logos-google-maps',
    iconColor: 'text-[#4285F4]',
    field: {
      label: 'Google Business Profile',
      input: {
        is: GooglePlaceInput,
      },
    }
  },
  'linkedin': {
    id: 'linkedin',
    icon: 'logos-linkedin-icon',
    iconColor: 'text-[#0077B5]',
    field: {
      label: 'LinkedIn',
    }
  },
  'x': {
    id: 'x',
    icon: 'simple-icons-x',
    iconColor: 'text-black dark:text-white',
    field: {
      label: 'Twitter / X Username',
    }
  }
};
