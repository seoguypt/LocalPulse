import { z } from 'zod';

export const categoryIdSchema = z.enum(['food', 'retail', 'services', 'other']);
export type CategoryId = z.infer<typeof categoryIdSchema>;

export const categorySchema = z.object({
  id: categoryIdSchema,
  label: z.string(),
  icon: z.string(),
  description: z.string(),
  recommendedSocialMedia: z.array(channelIdSchema).optional(),
});
export type Category = z.infer<typeof categorySchema>;

export const CATEGORY_CONFIG: Record<CategoryId, Category> = {
  'food': {
    id: 'food',
    label: 'Food & Drink',
    description: 'Restaurants, cafés, bars, etc',
    icon: 'i-lucide-utensils',
    recommendedSocialMedia: ['facebook', 'instagram', 'tiktok'],
  },
  'retail': {
    id: 'retail',
    label: 'Retail',
    description: 'Clothing, electronics, home goods, etc',
    icon: 'i-lucide-shopping-cart',
    recommendedSocialMedia: ['facebook', 'instagram', 'tiktok', 'youtube'],
  },
  'services': {
    id: 'services',
    label: 'Services',
    description: 'Plumbers, electricians, etc',
    icon: 'i-lucide-wrench',
    recommendedSocialMedia: ['facebook'],
  },
  'other': {
    id: 'other',
    label: 'Other',
    description: 'Anything else',
    icon: 'i-lucide-tag',
    recommendedSocialMedia: ['facebook', 'instagram'],
  }
};

/**
 * Given a list of types from Google Places data, return one of ['food', 'retail', 'services', 'other']
 * 
 * @param data 
 * @returns 
 */
export const getCategoryIdFromGooglePlaceTypes = (data: string[]): CategoryId => {
  // Food and drink related types
  const foodTypes = new Set([
    'bakery',
    'bar',
    'cafe',
    'meal_delivery',
    'meal_takeaway',
    'restaurant',
    'american_restaurant',
    'asian_restaurant',
    'barbecue_restaurant',
    'brazilian_restaurant',
    'breakfast_restaurant',
    'brunch_restaurant',
    'chinese_restaurant',
    'fast_food_restaurant',
    'french_restaurant',
    'greek_restaurant',
    'hamburger_restaurant',
    'ice_cream_shop',
    'indian_restaurant',
    'indonesian_restaurant',
    'italian_restaurant',
    'japanese_restaurant',
    'korean_restaurant',
    'lebanese_restaurant',
    'mediterranean_restaurant',
    'mexican_restaurant',
    'middle_eastern_restaurant',
    'pizza_restaurant',
    'ramen_restaurant',
    'seafood_restaurant',
    'spanish_restaurant',
    'steak_house',
    'sushi_restaurant',
    'thai_restaurant',
    'turkish_restaurant',
    'vegan_restaurant',
    'vegetarian_restaurant',
    'vietnamese_restaurant',
    'food',
    'liquor_store',
    'wine_shop'
  ]);

  // Retail/shopping related types
  const retailTypes = new Set([
    'store',
    'shopping_mall',
    'department_store',
    'supermarket',
    'grocery_store',
    'convenience_store',
    'clothing_store',
    'shoe_store',
    'jewelry_store',
    'book_store',
    'electronics_store',
    'furniture_store',
    'home_goods_store',
    'hardware_store',
    'bicycle_store',
    'sporting_goods_store',
    'toy_store',
    'pet_store',
    'florist',
    'gift_shop',
    'market',
    'auto_parts_store'
  ]);

  // Services related types
  const serviceTypes = new Set([
    'accounting',
    'atm',
    'bank',
    'beauty_salon',
    'car_dealer',
    'car_rental',
    'car_repair',
    'car_wash',
    'dentist',
    'doctor',
    'drugstore',
    'electrician',
    'funeral_home',
    'hair_care',
    'hospital',
    'insurance_agency',
    'laundry',
    'lawyer',
    'locksmith',
    'moving_company',
    'painter',
    'pharmacy',
    'physiotherapist',
    'plumber',
    'real_estate_agency',
    'roofing_contractor',
    'spa',
    'storage',
    'travel_agency',
    'veterinary_care',
    'dry_cleaning',
    'taxi_stand',
    'gas_station',
    'parking',
    'courier_service',
    'finance',
    'post_office',
    'gym',
    'primary_school',
    'secondary_school',
    'university'
  ]);

  // Check each type in priority order: food -> retail -> services -> other
  for (const type of data) {
    if (foodTypes.has(type)) {
      return 'food';
    }
  }

  for (const type of data) {
    if (retailTypes.has(type)) {
      return 'retail';
    }
  }

  for (const type of data) {
    if (serviceTypes.has(type)) {
      return 'services';
    }
  }

  return 'other';
};