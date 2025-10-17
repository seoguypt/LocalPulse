// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-05-31',
  devtools: { enabled: true },

  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

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
    '@vueuse/nuxt'
  ],

  css: ['~/assets/css/main.css', process.env.NUXT_ADOBE_KIT_ID && '~/assets/css/adobe-fonts.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    googleApiKey: process.env.NUXT_GOOGLE_API_KEY,
    googleProgrammableSearchEngineId: process.env.NUXT_GOOGLE_PROGRAMMABLE_SEARCH_ENGINE_ID,
    appleMapkitTeamId: process.env.NUXT_APPLE_MAPKIT_TEAM_ID,
    appleMapkitKeyId: process.env.NUXT_APPLE_MAPKIT_KEY_ID,
    appleMapkitPrivateKey: process.env.NUXT_APPLE_MAPKIT_PRIVATE_KEY,
    public: {
      googleApiKey: process.env.NUXT_PUBLIC_GOOGLE_API_KEY,
      posthogPublicKey: process.env.NUXT_PUBLIC_POSTHOG_PUBLIC_KEY,
    }
  },

  routeRules: {
    '/ingest/static/**': { proxy: 'https://us-assets.i.posthog.com/static/**' },
    '/ingest/**': { proxy: 'https://us.i.posthog.com/**' },
  },



  nitro: {
    preset: 'node-server',
    experimental: {
      openAPI: true
    }
  },

  vite: {
    optimizeDeps: {
      exclude: ['exsolve']
    },
    server: {
      allowedHosts: ['localpulse.aaid.me', '.aaid.me'],
      origin: 'https://localpulse.aaid.me'
    }
  },



  // For nicer looking fonts, add an Adobe Fonts kit ID to your .env file
  fonts: process.env.NUXT_ADOBE_KIT_ID ? {
    adobe: {
      id: [process.env.NUXT_ADOBE_KIT_ID || ''],
    },

    families: [
      {
        name: 'ArponaSans',
        provider: 'adobe',
        weights: [700],
        styles: ['normal'],
      },
      {
        name: 'Darkmode Off',
        provider: 'adobe',
        weights: [400, 500, 700],
        styles: ['normal', 'italic'],
      },
      {
        name: 'Darkmode On',
        provider: 'adobe',
        weights: [400, 500, 700],
        styles: ['normal', 'italic'],
      }
    ]
  } : {
    families: [
      {
        name: 'Poppins',
        weights: [700],
        styles: ['normal'],
      },
      {
        name: 'Inter',
        weights: [400, 500, 700],
        styles: ['normal', 'italic'],
      },
    ]
  },

  image: {
    // Use default provider for Railway deployment
  }
})
