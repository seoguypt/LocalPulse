// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineOrganization } from 'nuxt-schema-org/schema'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-31',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  sourcemap: {
    client: true,
    server: true
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/test-utils',
    '@vueuse/nuxt',
    '@nuxthub/core',
    '@nuxtjs/seo'
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    googleApiKey: process.env.NUXT_GOOGLE_API_KEY,
    googleProgrammableSearchEngineId: process.env.NUXT_GOOGLE_PROGRAMMABLE_SEARCH_ENGINE_ID,
    appleMapkitTeamId: process.env.NUXT_APPLE_MAPKIT_TEAM_ID,
    appleMapkitKeyId: process.env.NUXT_APPLE_MAPKIT_KEY_ID,
    appleMapkitPrivateKey: process.env.NUXT_APPLE_MAPKIT_PRIVATE_KEY,
    public: {
      googleApiKey: process.env.NUXT_PUBLIC_GOOGLE_API_KEY,
      posthogPublicKey: 'phc_NnyL6hYZBsre2WNUDrU3Zu6CDN7dpntH7stqhB0dnzu'
    }
  },

  routeRules: {
    '/chat': { redirect: 'https://calendar.notion.so/meet/andrevantonder/visimate' },
    '/ingest/static/**': { proxy: 'https://us-assets.i.posthog.com/static/**' },
    '/ingest/**': { proxy: 'https://us.i.posthog.com/**' },
  },

  hub: {
    workers: true,
    cache: true,
    database: true,
    browser: true
  },

  nitro: {
    experimental: {
      openAPI: true
    }
  },

  site: {
    url: 'https://visimate.drevan.workers.dev/',
    name: 'VisiMate.au — Get seen online',
    description: 'Get free, step-by-step fixes in under 2 minutes to improve your online visibility.',
    indexable: false,
    defaultLocale: 'en-au',
  },

  schemaOrg: {
    identity: defineOrganization({
      name: 'VisiMate.au',
      alternateName: 'VisiMate',
      description: 'A free online visibility tool to help you get seen online.',
      logo: '/logo.png',
      url: 'https://visimate.drevan.workers.dev/',
    })
  }
})