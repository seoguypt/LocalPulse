import { z } from 'zod';

const snapshotSchema = z.object({
  snapshot_id: z.string(),
});

const progressSchema = z.object({
  snapshot_id: z.string(),
  dataset_id: z.string(),
  status: z.string()
});

// Schema for Facebook post attachments
const facebookPostAttachmentSchema = z.object({
  attachment_url: z.string().url(),
  id: z.string(),
  type: z.string(),
  url: z.string().url(),
  video_length: z.string().optional(),
  video_url: z.string().url().optional(),
});

// Schema for about items
const aboutItemSchema = z.object({
  link: z.string().nullable(),
  type: z.string(),
  value: z.string(),
});

// Schema for reaction types
const reactionTypeSchema = z.object({
  reaction_count: z.number(),
  type: z.string(),
});

// Schema for num_likes_type
const numLikesTypeSchema = z.object({
  num: z.number(),
  type: z.string(),
});

// Main Facebook post schema
const facebookPostSchema = z.object({
  url: z.string().url(),
  post_id: z.string(),
  user_url: z.string().url(),
  user_username_raw: z.string(),
  content: z.string(),
  date_posted: z.string(),
  hashtags: z.array(z.string()),
  num_comments: z.number(),
  num_shares: z.number(),
  num_likes_type: numLikesTypeSchema,
  page_name: z.string(),
  page_intro: z.string(),
  page_category: z.string(),
  page_logo: z.string().url(),
  page_external_website: z.string(),
  page_likes: z.number(),
  page_followers: z.number(),
  page_is_verified: z.boolean(),
  original_post: z.string().nullable(),
  other_posts_url: z.string().nullable(),
  post_external_link: z.string().nullable(),
  post_external_title: z.string().nullable(),
  page_url: z.string().url(),
  header_image: z.string().url(),
  profile_id: z.string(),
  attachments: z.array(facebookPostAttachmentSchema),
  avatar_image_url: z.string().url(),
  profile_handle: z.string(),
  has_handshake: z.boolean().nullable(),
  is_sponsored: z.boolean(),
  sponsor_name: z.string().nullable(),
  shortcode: z.string(),
  video_view_count: z.number(),
  likes: z.number(),
  post_image: z.string().nullable(),
  post_type: z.string(),
  following: z.boolean().nullable(),
  post_external_image: z.string().nullable(),
  link_description_text: z.string().nullable(),
  count_reactions_type: z.array(reactionTypeSchema),
  is_page: z.boolean(),
  page_phone: z.string().nullable(),
  page_email: z.string(),
  page_creation_time: z.string(),
  page_reviews_score: z.string(),
  page_reviewers_amount: z.number(),
  page_price_range: z.string().nullable(),
  about: z.array(aboutItemSchema),
  active_ads_urls: z.array(z.string()),
  delegate_page_id: z.string(),
});

// Array of Facebook posts
export const facebookPostsSchema = z.array(facebookPostSchema);

export type FacebookPost = z.infer<typeof facebookPostSchema>;
export type FacebookPosts = z.infer<typeof facebookPostsSchema>;

export const getFacebookProfiles = defineCachedFunction(async (urls: string[]) => {
  const { brightdataApiToken } = useRuntimeConfig();

  try {
    const response = await $fetch("https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_lkaxegm826bjpoo9m5&include_errors=true", {
      method: "POST",
      headers: {
      "Authorization": `Bearer ${brightdataApiToken}`,
      "Content-Type": "application/json",
    },
    body: urls.map((url) => ({
      url,
      num_of_posts: 1,
      posts_to_not_include: [],
      start_date: "",
      end_date: "",
    })),
  });
  logger.log(response);

    return facebookPostsSchema.parse(response);
  } catch (error) {
    logger.error(error);
    return [];
  }
}, {
  maxAge: 60 * 60, // 1 hour
  name: `facebook-profile`,
  getKey: (urls) => urls.join(','),
});
