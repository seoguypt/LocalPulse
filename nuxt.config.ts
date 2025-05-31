// https://nuxt.com/docs/api/configuration/nuxt-config
import { execSync } from 'child_process'

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
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@vueuse/nuxt',
    '@nuxthub/core'
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    googleApiKey: process.env.NUXT_GOOGLE_API_KEY,
    googleProgrammableSearchEngineId: process.env.NUXT_GOOGLE_PROGRAMMABLE_SEARCH_ENGINE_ID,
    appleMapKitTeamId: process.env.NUXT_APPLE_MAPKIT_TEAM_ID,
    appleMapKitKeyId: process.env.NUXT_APPLE_MAPKIT_KEY_ID,
    appleMapKitPrivateKey: process.env.NUXT_APPLE_MAPKIT_PRIVATE_KEY,
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

  hooks: {
    'nitro:build:public-assets': async () => {
      // Skip PostHog sourcemap injection in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Skipping PostHog sourcemap injection in development mode')
        return
      }

      console.log('Running PostHog sourcemap injection...')
      try {
        execSync("posthog-cli sourcemap inject --directory 'dist/public'", {
          stdio: 'inherit',
        })
        console.log('PostHog sourcemap injection completed successfully')
      } catch (error) {
        console.error('PostHog sourcemap injection failed:', error)
      }
    },
    'build:done': async () => {
      // Skip PostHog sourcemap injection in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Skipping PostHog sourcemap injection in development mode')
        return
      }

      console.log('Running PostHog sourcemap injection...')
      try {
        execSync("", {
          stdio: 'inherit',
        })
        console.log('PostHog sourcemap injection completed successfully')
      } catch (error) {
        console.error('PostHog sourcemap injection failed:', error)
      }
    },
  },

  hub: {
    workers: true,
    cache: true,
    database: true,
    browser: true
  }
})