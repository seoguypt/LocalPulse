import { z } from 'zod'

export const ApplePlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  formattedAddressLines: z.array(z.string()),
  country: z.string(),
  countryCode: z.string(),
  coordinate: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  displayMapRegion: z.object({
    southLatitude: z.number(),
    westLongitude: z.number(),
    northLatitude: z.number(),
    eastLongitude: z.number(),
  }),
  structuredAddress: z.object({
    administrativeArea: z.string(),
    administrativeAreaCode: z.string(),
    locality: z.string(),
    postCode: z.string(),
    subLocality: z.string().optional(),
    thoroughfare: z.string(),
    subThoroughfare: z.string(),
    fullThoroughfare: z.string(),
    dependentLocalities: z.array(z.string()).optional(),
  }),
})
export type ApplePlace = z.infer<typeof ApplePlaceSchema>

export const AppleSearchResponsePlaceSchema = ApplePlaceSchema.extend({
  poiCategory: z.string().optional(),
})
export type AppleSearchResponsePlace = z.infer<typeof AppleSearchResponsePlaceSchema>