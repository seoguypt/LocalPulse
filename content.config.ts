import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { categoryIdSchema } from './app/utils/category'

export default defineContentConfig({
  collections: {
    checks: defineCollection({
      type: 'page',
      source: 'checks/**/*.md',
      schema: z.object({
        points: z.object({
          food: z.number().default(0),
          retail: z.number().default(0),
          services: z.number().default(0),
          other: z.number().default(0)
        }),
        businessCategories: z.array(categoryIdSchema).nullable().default(null),
        channelCategory: z.string(),
      })
    })
  }
})
