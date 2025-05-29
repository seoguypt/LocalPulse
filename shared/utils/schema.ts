import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { tables} from '../../server/utils/drizzle'

export const businessInsertSchema = createInsertSchema(tables.businesses);
export const businessSchema = createSelectSchema(tables.businesses);

export type Business = z.infer<typeof businessSchema>;

export const businessLocationInsertSchema = createInsertSchema(tables.businessLocations);
export const businessLocationSchema = createSelectSchema(tables.businessLocations);
export type BusinessLocation = z.infer<typeof businessLocationSchema>;

import { googlePlacesSearchTextResponseSchema } from '../../server/api/google/places/searchText.post';
export { googlePlacesSearchTextResponseSchema }
export type GooglePlacesSearchTextResponse = z.infer<typeof googlePlacesSearchTextResponseSchema>;

import { googlePlacesPlaceSchema } from '../../server/api/google/places/searchText.post';
export { googlePlacesPlaceSchema }
export type GooglePlacesPlace = z.infer<typeof googlePlacesPlaceSchema>;
