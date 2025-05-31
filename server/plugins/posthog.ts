import { PostHog } from 'posthog-node'

// HTTP methods that typically include request bodies
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH'])

const hasRequestBody = (method: string) => METHODS_WITH_BODY.has(method)

export default defineNitroPlugin((nitro) => {
  const config = useRuntimeConfig()

  // Skip PostHog initialization in development
  if (import.meta.dev) {
    console.log('PostHog disabled in development mode (server)')
    return
  }

  const client = new PostHog(
    config.public.posthogPublicKey
  )

  // Capture server-side errors
  nitro.hooks.hook('error', (error, { event }) => {
    client.captureException(error, undefined, event ? {
      path: event.path,
      method: event.method,
      query: getQuery(event),
      headers: getHeaders(event),
      body: hasRequestBody(event.method) ? readRawBody(event) : undefined,
    } : undefined)
  })

  nitro.hooks.hook('close', async () => {
    await client.shutdown()
  })
})