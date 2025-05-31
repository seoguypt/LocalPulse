import { PostHog } from 'posthog-node'

// HTTP methods that typically include request bodies
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH'])

const hasRequestBody = (method: string) => METHODS_WITH_BODY.has(method)

export default defineNitroPlugin((nitro) => {
  // Skip PostHog initialization in development
  if (import.meta.dev) {
    console.log('PostHog disabled in development mode (server)')
    return
  }

  // Capture server-side errors
  nitro.hooks.hook('error', async (error, { event }) => {
    if (!event) return

    const config = useRuntimeConfig(event)
    const client = new PostHog(config.public.posthogPublicKey)

    client.captureException(error, undefined, {
      path: event.path,
      method: event.method,
      query: getQuery(event),
      headers: getHeaders(event),
      body: hasRequestBody(event.method) ? readRawBody(event) : undefined,
    })

    await client.shutdown()
  })
})