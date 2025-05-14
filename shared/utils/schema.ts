import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { tables} from '../../server/utils/drizzle'

export const businessInsertSchema = createInsertSchema(tables.businesses);
export const businessSchema = createSelectSchema(tables.businesses);

export type Business = z.infer<typeof businessSchema>;

import { abnSearchByNameResultSchema } from '../../server/api/abr/search-by-name.get';
export { abnSearchByNameResultSchema }
export type AbnSearchByNameResult = z.infer<typeof abnSearchByNameResultSchema>;

import { abnSearchByAbnResultSchema } from '../../server/api/abr/search-by-abn.get';
export { abnSearchByAbnResultSchema }
export type AbnSearchByAbnResult = z.infer<typeof abnSearchByAbnResultSchema>;

import { googlePlacesSearchTextResponseSchema } from '../../server/api/google/places/searchText.post';
export { googlePlacesSearchTextResponseSchema }
export type GooglePlacesSearchTextResponse = z.infer<typeof googlePlacesSearchTextResponseSchema>;

import { googlePlacesPlaceSchema } from '../../server/api/google/places/searchText.post';
export { googlePlacesPlaceSchema }
export type GooglePlacesPlace = z.infer<typeof googlePlacesPlaceSchema>;
