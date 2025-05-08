import { z } from 'zod';

export const dataSchema = z.object({
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  facebookLink: z.string().optional(),
  diagnostics: z.array(z.enum(['no-google-places-listing'])).default([]),
})

export type Data = z.infer<typeof dataSchema>
